import { Router } from "express"
import { db, isMysql } from "@workspace/db"
import {
  usersTable, ordersTable, notificationsTable, messagesTable,
  activityTable, fakeMessageTemplatesTable, siteConfigTable,
  photosTable, likesTable, reportedUsersTable, autoMessageLogTable,
  chatLocksTable, userExtendedTable
} from "@workspace/db/schema"
import { eq, desc, sql, and, ne, gte, count, SQL, or, isNull, inArray } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }
async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return (rows[0] as any)?.value || ""
  } catch { return "" }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" })
  db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1).then(([user]) => {
    if (!user || (user.admin ?? 0) < 2) return res.status(403).json({ error: "Admin access required" })
    next()
  }).catch(() => res.status(500).json({ error: "Server error" }))
}

function safeUser(u: typeof usersTable.$inferSelect) {
  const { password, ...rest } = u
  return rest
}

// Sync users.photo from photos table for users missing a profile photo
router.post("/sync-photos", requireAuth, requireAdmin, async (req, res) => {
  try {
    const usersNeedingPhoto = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(or(eq(usersTable.photo, ''), isNull(usersTable.photo as any)))
    const userIds = usersNeedingPhoto.map(u => u.id)
    if (userIds.length === 0) { res.json({ updated: 0 }); return }

    const photos = await db.select({ userId: photosTable.userId, photo: photosTable.photo, thumb: photosTable.thumb })
      .from(photosTable)
      .where(and(inArray(photosTable.userId, userIds), eq(photosTable.approved, 1)))
      .orderBy(desc(photosTable.main), photosTable.id)

    const photoMap = new Map<number, { photo: string; thumb: string }>()
    for (const p of photos) {
      if (!photoMap.has(p.userId)) photoMap.set(p.userId, { photo: p.photo, thumb: p.thumb || p.photo })
    }

    let updated = 0
    for (const [userId, { photo, thumb }] of photoMap) {
      await db.update(usersTable).set({ photo, photoThumb: thumb }).where(eq(usersTable.id, userId))
      updated++
    }
    res.json({ updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Dashboard stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = now() - 86400
    const [totalUsers] = await db.select({ count: count() }).from(usersTable)
    const [fakeUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.fake, 1))
    const [newToday] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.created, today))
    const [premiumUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.premium, 1))
    const [onlineUsers] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.lastAccess as any, String(now() - 300)))
    const [totalMessages] = await db.select({ count: count() }).from(messagesTable)
    const [totalLikes] = await db.select({ count: count() }).from(likesTable)
    const [bannedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.banned, 1))
    const [verifiedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.verified, 1))

    // Revenue: wrapped separately so a schema/column issue never breaks all stats
    let totalRevenue = 0
    let todayRevenue = 0
    try {
      // Use SUM with CASE — amount_usd stores the USD equivalent for new orders;
      // old USD-currency orders fall back to raw amount; non-USD old orders excluded.
      const [tr] = await db.select({
        sum: sql<string>`COALESCE(SUM(CASE WHEN ${ordersTable.amountUsd} > 0 THEN ${ordersTable.amountUsd} WHEN ${ordersTable.currency} = 'USD' THEN ${ordersTable.amount} ELSE 0 END), 0)`
      }).from(ordersTable).where(eq(ordersTable.status, "completed"))
      const [dr] = await db.select({
        sum: sql<string>`COALESCE(SUM(CASE WHEN ${ordersTable.amountUsd} > 0 THEN ${ordersTable.amountUsd} WHEN ${ordersTable.currency} = 'USD' THEN ${ordersTable.amount} ELSE 0 END), 0)`
      }).from(ordersTable).where(and(eq(ordersTable.status, "completed"), gte(ordersTable.time, today)))
      totalRevenue = parseFloat(String(tr?.sum ?? "0")) || 0
      todayRevenue = parseFloat(String(dr?.sum ?? "0")) || 0
    } catch (revErr) {
      console.warn("[stats] Revenue query failed (schema may need migration):", revErr)
    }

    res.json({
      totalUsers: totalUsers.count,
      fakeUsers: fakeUsers.count,
      realUsers: (totalUsers.count || 0) - (fakeUsers.count || 0),
      newToday: newToday.count,
      premiumUsers: premiumUsers.count,
      onlineUsers: onlineUsers.count,
      bannedUsers: bannedUsers.count,
      verifiedUsers: verifiedUsers.count,
      totalRevenue,
      todayRevenue,
      totalMessages: totalMessages.count,
      totalLikes: totalLikes.count,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Users list
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")))
    const requestedLimit = parseInt(String(req.query.limit || "50"))
    const limit = isNaN(requestedLimit) || requestedLimit < 1 ? 50 : Math.min(requestedLimit, 2000)
    const offset = (page - 1) * limit
    const filter = String(req.query.filter || "all")
    const search = String(req.query.search || "").trim()

    // Extended filter params
    const gender = req.query.gender !== undefined ? parseInt(String(req.query.gender)) : null
    const dateFrom = req.query.dateFrom ? parseInt(String(req.query.dateFrom)) : null
    const dateTo = req.query.dateTo ? parseInt(String(req.query.dateTo)) : null
    const country = String(req.query.country || "").trim()
    const city = String(req.query.city || "").trim()
    const ageMin = req.query.ageMin ? parseInt(String(req.query.ageMin)) : null
    const ageMax = req.query.ageMax ? parseInt(String(req.query.ageMax)) : null
    const orderBy = String(req.query.orderBy || "lastAccess")
    const onlineNow = req.query.onlineNow === "1"
    const verifiedOnly = req.query.verified === "1"

    const conditions: (SQL | undefined)[] = []

    // Quick filter tab
    if (filter === "fake")    conditions.push(eq(usersTable.fake, 1))
    else if (filter === "real")    conditions.push(eq(usersTable.fake, 0))
    else if (filter === "premium") conditions.push(eq(usersTable.premium, 1))
    else if (filter === "banned")  conditions.push(eq(usersTable.banned, 1))
    else if (filter === "admin")   conditions.push(gte(usersTable.admin, 1))
    else if (filter === "verified") conditions.push(eq(usersTable.verified, 1))
    else if (filter === "online")  conditions.push(gte(usersTable.lastAccess as any, String(now() - 300)))

    // Search
    if (search) {
      conditions.push(sql`(${usersTable.name} LIKE ${'%' + search + '%'} OR ${usersTable.email} LIKE ${'%' + search + '%'} OR ${usersTable.city} LIKE ${'%' + search + '%'} OR ${usersTable.username} LIKE ${'%' + search + '%'} OR CAST(${usersTable.id} AS CHAR) = ${search})`)
    }

    // Advanced filters
    if (gender !== null && !isNaN(gender)) conditions.push(eq(usersTable.gender, gender))
    if (dateFrom !== null && !isNaN(dateFrom)) conditions.push(gte(usersTable.created, dateFrom))
    if (dateTo !== null && !isNaN(dateTo)) conditions.push(sql`${usersTable.created} <= ${dateTo}`)
    if (country) conditions.push(sql`LOWER(${usersTable.country}) LIKE ${('%' + country.toLowerCase() + '%')}`)
    if (city) conditions.push(sql`LOWER(${usersTable.city}) LIKE ${('%' + city.toLowerCase() + '%')}`)
    if (ageMin !== null && !isNaN(ageMin)) conditions.push(gte(usersTable.age, ageMin))
    if (ageMax !== null && !isNaN(ageMax)) conditions.push(sql`${usersTable.age} <= ${ageMax}`)
    if (onlineNow) conditions.push(gte(usersTable.lastAccess as any, String(now() - 300)))
    if (verifiedOnly) conditions.push(eq(usersTable.verified, 1))

    const whereCondition: SQL | undefined = conditions.filter(Boolean).length > 0
      ? and(...conditions.filter(Boolean) as SQL[])
      : undefined

    const orderExpr =
      orderBy === "createdDesc" ? desc(usersTable.created) :
      orderBy === "createdAsc"  ? usersTable.created :
      orderBy === "name"        ? usersTable.name :
      orderBy === "credits"     ? desc(usersTable.credits) :
      sql`CAST(COALESCE(${usersTable.lastAccess}, '0') AS ${sql.raw(isMysql ? 'SIGNED' : 'BIGINT')}) DESC`

    const users = await db.select().from(usersTable)
      .where(whereCondition)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset)

    const [{ count: total }] = await db.select({ count: count() }).from(usersTable).where(whereCondition)
    res.json({ users: users.map(safeUser), total, page, pages: Math.ceil(total / limit) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Get single user
router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    const photos = await db.select().from(photosTable).where(eq(photosTable.userId, user.id))
    res.json({ ...safeUser(user), photos })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Update user
router.put("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [before] = await db.select({ name: usersTable.name, admin: usersTable.admin, premium: usersTable.premium }).from(usersTable).where(eq(usersTable.id, id)).limit(1)
    const { name, email, city, country, bio, credits, premium, premiumExpiry, fake, admin, banned, verified, gender, looking, age } = req.body
    const adminLevel = parseInt(admin)
    const newAdminLevel = isNaN(adminLevel) ? 0 : Math.max(0, Math.min(2, adminLevel))
    await db.update(usersTable).set({
      name, email, city, country, bio,
      credits: parseInt(credits) || 0,
      premium: parseInt(premium) || 0,
      premiumExpiry: parseInt(premiumExpiry) || 0,
      fake: parseInt(fake) || 0,
      admin: newAdminLevel,
      banned: parseInt(banned) || 0,
      verified: parseInt(verified) || 0,
      gender: parseInt(gender) || 1,
      looking: parseInt(looking) || 2,
      age: parseInt(age) || 0,
    }).where(eq(usersTable.id, id))
    if (before) {
      const roleNames = ["User", "Moderator", "Admin"]
      if (before.admin !== newAdminLevel) {
        await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: "Role changed", message: `${before.name} (id:${id}) ${roleNames[before.admin ?? 0] ?? "?"} → ${roleNames[newAdminLevel] ?? "?"}`, time: now() }).catch(() => {})
      }
      if (before.premium !== parseInt(premium)) {
        await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: parseInt(premium) ? "Premium granted" : "Premium revoked", message: `${before.name} (id:${id})`, time: now() }).catch(() => {})
      }
    }
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Delete user
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, id)).limit(1)
    await db.delete(usersTable).where(eq(usersTable.id, id))
    if (user) {
      await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: "User deleted", message: `${user.name} (${user.email}, id: ${id})`, time: now() }).catch(() => {})
    }
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Ban/unban user
router.post("/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    const newBanned = user.banned === 1 ? 0 : 1
    await db.update(usersTable).set({ banned: newBanned }).where(eq(usersTable.id, id))
    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: `User ${newBanned === 1 ? "banned" : "unbanned"}`,
      message: `${user.name} (id: ${user.id})`,
      time: now()
    })
    res.json({ banned: newBanned })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Add credits to user
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const amount = parseInt(req.body.amount)
    if (isNaN(amount)) { res.status(400).json({ error: "Invalid amount" }); return }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    const newCredits = Math.max(0, (user.credits || 0) + amount)
    await db.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, id))
    await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: `Credits ${amount >= 0 ? "added" : "removed"}`, message: `${user.name} (id:${id}) ${amount >= 0 ? "+" : ""}${amount} credits → ${newCredits} total`, time: now() }).catch(() => {})
    res.json({ credits: newCredits })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Send notification to user
router.post("/users/:id/notify", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { message } = req.body
    if (!message) { res.status(400).json({ error: "Message required" }); return }
    await db.insert(notificationsTable).values({
      userId: id,
      fromId: req.userId,
      type: "admin",
      message,
      link: "",
      read: 0,
      time: now(),
    })
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Send a direct, branded HTML email to a specific user
router.post("/users/:id/send-email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const { subject, html } = req.body
    if (!subject?.trim() || !html?.trim()) { res.status(400).json({ error: "Subject and message body are required" }); return }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    if (!user.email?.trim()) { res.status(400).json({ error: "This user has no email address on file" }); return }

    const { sendEmail, wrapBrandedHtml } = await import("../lib/mailer")
    const wrapped = wrapBrandedHtml({
      title: subject.trim(),
      emoji: "📩",
      bodyHtml: `<p style="margin:0 0 16px">Hi ${(user.name || "there").replace(/</g, "&lt;")},</p>${html}`,
      footerNote: "This message was sent to you by the Rich Dating Network team.",
    })

    const sent = await sendEmail({ to: user.email, subject: subject.trim(), html: wrapped })
    if (!sent) { res.status(502).json({ error: "SMTP is not configured or the send failed. Check Settings → Email." }); return }

    await db.insert(activityTable).values({
      type: "admin", userId: req.userId, title: "Email sent to user",
      message: `${user.name} (id:${id}) — "${subject.trim()}"`, time: now(),
    }).catch(() => {})

    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Fix interests/passions on all existing fake users with real site values
router.post("/fake-users/fix-interests", requireAuth, requireAdmin, async (req, res) => {
  try {
    const maleInterestPool = [
      "travel", "fitness", "business", "investing", "technology", "running",
      "golf", "tennis", "football", "basketball", "cars", "hiking",
      "cooking", "music", "movies", "gaming", "camping", "wine_dining",
      "crossfit", "cycling", "nature", "luxury_travel", "reading", "concerts"
    ]
    const femaleInterestPool = [
      "travel", "photography", "yoga", "dancing", "fashion", "art",
      "cooking", "wine_dining", "interior_design", "pilates", "reading",
      "astrology", "brunch", "wine_tasting", "fitness", "music",
      "coffee", "hiking", "swimming", "luxury_travel", "nature", "meditation"
    ]
    const fakeUsers = await db.select({ id: usersTable.id, gender: usersTable.gender })
      .from(usersTable).where(eq(usersTable.fake, 1))

    let updated = 0
    for (const user of fakeUsers) {
      const gender = user.gender || 2
      const pool = gender === 1 ? maleInterestPool : femaleInterestPool
      const interests = JSON.stringify([...pool].sort(() => Math.random() - 0.5).slice(0, 6))

      const [existing] = await db.select({ userId: userExtendedTable.userId })
        .from(userExtendedTable).where(eq(userExtendedTable.userId, user.id)).limit(1)

      if (existing) {
        await db.update(userExtendedTable)
          .set({ interests } as any)
          .where(eq(userExtendedTable.userId, user.id))
      } else {
        await db.insert(userExtendedTable).values({ userId: user.id, interests } as any).catch(() => {})
      }
      updated++
    }

    res.json({ updated })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Create fake user
router.post("/fake-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, username, gender, looking, city, country, countryCode, age, bio, photo, photoThumb, extraPhotos, profileVideo } = req.body as any
    if (!name) { res.status(400).json({ error: "Name is required" }); return }

    // Username is mandatory
    const resolvedUsername = username && String(username).trim()
    if (!resolvedUsername) { res.status(400).json({ error: "Username is required" }); return }

    // Check username uniqueness
    const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, resolvedUsername)).limit(1)
    if (existingUser) { res.status(409).json({ error: "Username is already taken" }); return }

    const resolvedGender = parseInt(gender) || 2 // 1=Man, 2=Woman
    const fakeEmail = `fake_${Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`
    const { hashPassword: hashPw } = await import("../lib/password")
    const testPassword = await hashPw("testuser")
    const resolvedCity = city || "New York"
    const resolvedCountry = country || "United States"
    const resolvedAge = parseInt(age) || 28

    // Auto-generate bio from name/age/gender/city if not provided
    const genderLabel = resolvedGender === 1 ? "man" : "woman"
    const resolvedBio = (bio && bio.trim())
      ? bio.trim()
      : `Hi, I'm ${name}, a ${resolvedAge} year old ${genderLabel} from ${resolvedCity}, ${resolvedCountry}. I'm looking for a genuine connection with someone special.`

    // Auto-fill interests using real site values (JSON array of IDs matching SettingsPage INTERESTS)
    const maleInterestPool = [
      "travel", "fitness", "business", "investing", "technology", "running",
      "golf", "tennis", "football", "basketball", "cars", "hiking",
      "cooking", "music", "movies", "gaming", "camping", "wine_dining",
      "crossfit", "cycling", "nature", "luxury_travel", "reading", "concerts"
    ]
    const femaleInterestPool = [
      "travel", "photography", "yoga", "dancing", "fashion", "art",
      "cooking", "wine_dining", "interior_design", "pilates", "reading",
      "astrology", "brunch", "wine_tasting", "fitness", "music",
      "coffee", "hiking", "swimming", "luxury_travel", "nature", "meditation"
    ]
    const pool = resolvedGender === 1 ? maleInterestPool : femaleInterestPool
    const autoInterests = JSON.stringify([...pool].sort(() => Math.random() - 0.5).slice(0, 6))

    await db.insert(usersTable).values({
      name,
      username: resolvedUsername,
      email: fakeEmail,
      password: testPassword,
      gender: resolvedGender,
      looking: parseInt(looking) || 1,
      city: resolvedCity,
      country: resolvedCountry,
      countryCode: countryCode || "US",
      age: resolvedAge,
      bio: resolvedBio,
      photo: photo || "",
      photoThumb: photoThumb || "",
      profileVideo: profileVideo || "",
      fake: 1, verified: 1, credits: 2000,
      created: now(), lastAccess: String(now()),
    } as any)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, fakeEmail)).limit(1)

    // Insert extended profile with auto-filled interests
    await db.insert(userExtendedTable).values({
      userId: user.id,
      interests: autoInterests,
    } as any).catch(() => {})

    // Insert main photo into photos table if provided
    if (photo) {
      await db.insert(photosTable).values({
        userId: user.id, photo, thumb: photoThumb || photo,
        approved: 1, main: 1, created: now(),
      }).catch(() => {})
    }
    // Insert extra photos into photos table
    if (Array.isArray(extraPhotos)) {
      for (const url of extraPhotos) {
        const u = String(url).trim()
        if (!u) continue
        await db.insert(photosTable).values({
          userId: user.id, photo: u, thumb: u,
          approved: 1, main: 0, created: now(),
        }).catch(() => {})
      }
    }
    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: "Fake user created", message: `${name} (id: ${user.id})`, time: now()
    })
    res.json({ user: safeUser(user) })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Activity log
router.get("/activity", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filter = String(req.query.filter || "all")
    const filterCondition: SQL | undefined = filter !== "all" ? eq(activityTable.type, filter) : undefined

    const limitParam = Math.min(500, Math.max(1, parseInt(String(req.query.limit || "100"))))
    const rows = await db.select({
      activity: activityTable,
      user: { id: usersTable.id, name: usersTable.name, photo: usersTable.photo }
    })
      .from(activityTable)
      .leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
      .where(filterCondition)
      .orderBy(desc(activityTable.id))
      .limit(limitParam)

    res.json(rows)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Log activity
router.post("/activity", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, title, message } = req.body
    await db.insert(activityTable).values({ type, userId: req.userId, title, message, time: now() })
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Site config
router.get("/config", requireAuth, requireAdmin, async (req, res) => {
  try {
    const configs = await db.select().from(siteConfigTable)
    const obj: Record<string, string> = {}
    configs.forEach(c => { obj[c.key] = c.value || "" })
    res.json(obj)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

router.put("/config", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>
    for (const [key, value] of Object.entries(updates)) {
      const v = String(value)
      if (isMysql) {
        await db.insert(siteConfigTable).values({ key, value: v })
          .onDuplicateKeyUpdate({ set: { value: v } })
      } else {
        await db.insert(siteConfigTable).values({ key, value: v })
          .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: v } })
      }
    }
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Fake message templates
router.get("/fake-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const msgs = await db.select().from(fakeMessageTemplatesTable).orderBy(fakeMessageTemplatesTable.id)
    res.json(msgs)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

router.post("/fake-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body
    if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return }
    const msgTrimmed = message.trim()
    await db.insert(fakeMessageTemplatesTable).values({ message: msgTrimmed, active: 1 })
    const [msg] = await db.select().from(fakeMessageTemplatesTable)
      .where(eq(fakeMessageTemplatesTable.message, msgTrimmed))
      .orderBy(desc(fakeMessageTemplatesTable.id))
      .limit(1)
    res.json(msg)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Generate a one-time login token to log in as a fake user (for testing chat flows)
router.post("/users/:id/impersonate", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!me || me.admin < 2) { res.status(403).json({ error: "Super admin only" }); return }
    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!targetUser) { res.status(404).json({ error: "User not found" }); return }
    const { signToken } = await import("../lib/jwt")
    const token = signToken({ userId: targetUser.id })
    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: "Admin impersonated user",
      message: `Admin (id: ${req.userId}) logged in as: ${targetUser.name} (id: ${targetUser.id})`,
      time: now()
    }).catch(() => {})
    const { password: _, ...safeUser } = targetUser
    res.json({ token, user: safeUser })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

router.post("/fake-users/:id/login-token", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!targetUser) { res.status(404).json({ error: "User not found" }); return }
    if (targetUser.fake !== 1) { res.status(403).json({ error: "Can only log in as fake users" }); return }
    const { signToken } = await import("../lib/jwt")
    const token = signToken({ userId: targetUser.id })
    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: "Admin impersonated fake user",
      message: `Admin logged in as fake user: ${targetUser.name} (id: ${targetUser.id})`,
      time: now()
    }).catch(() => {})
    const { password: _, ...safeUser } = targetUser
    res.json({ token, user: safeUser })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Reset all fake users' passwords to "testuser"
router.post("/fake-users/reset-passwords", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { hashPassword: hashPwReset } = await import("../lib/password")
    const hashed = await hashPwReset("testuser")
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.fake, 1))
    res.json({ success: true, message: "All fake user passwords reset to 'testuser'" })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

router.delete("/fake-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return }
    await db.delete(fakeMessageTemplatesTable).where(eq(fakeMessageTemplatesTable.id, id))
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Toggle template active status
router.patch("/fake-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { active } = req.body
    await db.update(fakeMessageTemplatesTable).set({ active: active ? 1 : 0 }).where(eq(fakeMessageTemplatesTable.id, id))
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Change user password (admin)
router.post("/users/:id/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const { password } = req.body
    if (!password || password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return }
    const { hashPassword } = await import("../lib/password")
    const hashed = await hashPassword(password)
    await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, id))
    await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: "Password changed", message: `User id: ${id}`, time: now() })
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Give/revoke premium (admin)
router.post("/users/:id/premium", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const { days } = req.body
    const daysNum = parseInt(days) || 30
    const expiry = daysNum > 0 ? now() + daysNum * 86400 : 0
    await db.update(usersTable).set({ premium: daysNum > 0 ? 1 : 0, premiumExpiry: expiry }).where(eq(usersTable.id, id))
    await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: daysNum > 0 ? "Premium granted" : "Premium revoked", message: `User id: ${id}, days: ${daysNum}`, time: now() })
    res.json({ success: true, premium: daysNum > 0 ? 1 : 0, premiumExpiry: expiry })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Get user chats summary (admin) — returns one entry per conversation partner
router.get("/users/:id/chats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }

    // Fetch recent messages, deduplicate by partner in JS
    const msgs = await db.select({
      u1: messagesTable.u1,
      u2: messagesTable.u2,
      lastMsg: messagesTable.message,
      lastTime: messagesTable.time,
      read: messagesTable.read,
    })
      .from(messagesTable)
      .where(sql`${messagesTable.u1} = ${id} OR ${messagesTable.u2} = ${id}`)
      .orderBy(desc(messagesTable.time))
      .limit(500)

    // Deduplicate by partner id — first occurrence is most recent
    const seen = new Set<number>()
    const convos: { otherId: number; lastMsg: string; lastTime: number; unread: number }[] = []
    for (const m of msgs) {
      const partnerId = m.u1 === id ? m.u2 : m.u1
      if (!seen.has(partnerId)) {
        seen.add(partnerId)
        // unread = message was sent TO this user and not read
        const unread = (m.u2 === id && m.read === 0) ? 1 : 0
        convos.push({ otherId: partnerId, lastMsg: m.lastMsg, lastTime: m.lastTime ?? 0, unread })
      }
    }

    // Fetch partner details
    const partnerIds = convos.map(c => c.otherId)
    if (partnerIds.length === 0) { res.json([]); return }
    const partners = await db.select({ id: usersTable.id, name: usersTable.name, photo: usersTable.photo, fake: usersTable.fake })
      .from(usersTable)
      .where(inArray(usersTable.id, partnerIds))
    const partnerMap = new Map(partners.map(p => [p.id, p]))

    const result = convos.map(c => ({
      other: partnerMap.get(c.otherId) || { id: c.otherId, name: "Unknown", photo: "", fake: 0 },
      lastMsg: c.lastMsg,
      lastTime: c.lastTime,
      unread: c.unread,
    }))

    res.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Get messages between two users (admin)
router.get("/users/:id/chats/:otherId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const otherId = parseInt(req.params.otherId as string)
    if (isNaN(id) || isNaN(otherId)) { res.status(400).json({ error: "Invalid user ID" }); return }

    const msgs = await db.select()
      .from(messagesTable)
      .where(sql`(${messagesTable.u1} = ${id} AND ${messagesTable.u2} = ${otherId}) OR (${messagesTable.u1} = ${otherId} AND ${messagesTable.u2} = ${id})`)
      .orderBy(messagesTable.time)
      .limit(200)

    res.json(msgs)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Send a message as a user (admin — reply on behalf of user)
router.post("/users/:id/chats/:otherId/send", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const otherId = parseInt(req.params.otherId as string)
    if (isNaN(id) || isNaN(otherId)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const { message } = req.body
    if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return }

    await db.insert(messagesTable).values({
      u1: id,
      u2: otherId,
      message: message.trim(),
      time: now(),
      read: 0,
    } as any)

    // Notify the recipient
    await db.insert(notificationsTable).values({
      userId: otherId,
      fromId: id,
      type: "message",
      message: "You have a new message",
      link: `/chat/${id}`,
      read: 0,
      time: now(),
    } as any).catch(() => {})

    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: "Admin sent message as user",
      message: `Sent as user #${id} → user #${otherId}`,
      time: now(),
    }).catch(() => {})

    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Get user orders (admin)
router.get("/users/:id/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.userId, id)).orderBy(desc(ordersTable.id)).limit(50)
    res.json(orders)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Public featured users (no auth — for landing page)
router.get("/featured-users", async (req, res) => {
  try {
    const users = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      age: usersTable.age,
      city: usersTable.city,
      country: usersTable.country,
      countryCode: usersTable.countryCode,
      photo: usersTable.photo,
      gender: usersTable.gender,
      verified: usersTable.verified,
    }).from(usersTable)
      .where(and(eq(usersTable.fake, 1), or(eq(usersTable.banned, 0), isNull(usersTable.banned)), ne(usersTable.photo, "")))
      .orderBy(sql`RANDOM()`)
      .limit(12)
    res.json(users)
  } catch { res.json([]) }
})

// Force-fulfill a pending order (admin only)
// Body: { creditsOverride?: number } — override credits if order.credits is 0 or wrong
router.post("/orders/:id/fulfill", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return }

    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1)
    if (!order) { res.status(404).json({ error: "Order not found" }); return }
    if (order.status === "completed") { res.status(400).json({ error: "Order already completed" }); return }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }

    if (order.type === "credits") {
      const overrideCredits = req.body.creditsOverride ? parseInt(req.body.creditsOverride) : null
      // Fallback: parse credits from description e.g. "10 Credits" → 10
      const parsedFromDesc = order.description ? parseInt((order.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
      const creditsToAdd = (overrideCredits && overrideCredits > 0) ? overrideCredits : (order.credits && order.credits > 0 ? order.credits : parsedFromDesc)
      if (creditsToAdd <= 0) { res.status(400).json({ error: "Specify a credits amount to add (order has 0 credits stored)" }); return }
      await db.update(usersTable).set({ credits: (user.credits || 0) + creditsToAdd }).where(eq(usersTable.id, order.userId))
      // Update credits on order record too if it was 0
      if (!order.credits || order.credits <= 0) {
        await db.update(ordersTable).set({ credits: creditsToAdd }).where(eq(ordersTable.id, id))
      }
      await db.insert(notificationsTable).values({
        userId: order.userId, type: "credits", message: `${creditsToAdd} credits have been added to your account.`, time: now(), read: 0,
      } as any).catch(() => {})
      await db.insert(activityTable).values({ type: "payment", userId: req.userId, title: "Order fulfilled", message: `Order #${id} for ${user.email}: +${creditsToAdd} credits`, time: now() }).catch(() => {})
      await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, id))
      res.json({ success: true, message: `Order #${id} fulfilled — ${creditsToAdd} credits added to ${user.email}` })
    } else if (order.type === "premium") {
      // Case-insensitive: match "1 Year", "3 Months", "6 Months", "1 Month", etc.
      const desc = (order.description || "").toLowerCase()
      const days =
        desc.includes("year") ? 365 :
        desc.includes("6 month") ? 180 :
        desc.includes("3 month") ? 90 :
        desc.includes("month") || desc.includes("week") ? 30 :
        30
      await db.update(usersTable).set({ premium: 1, premiumExpiry: now() + days * 86400 }).where(eq(usersTable.id, order.userId))
      await db.insert(notificationsTable).values({
        userId: order.userId, type: "premium", message: `Premium membership activated for ${days} days.`, time: now(), read: 0,
      } as any).catch(() => {})
      await db.insert(activityTable).values({ type: "payment", userId: req.userId, title: "Premium fulfilled", message: `Order #${id} for ${user.email}: ${days} days premium`, time: now() }).catch(() => {})
      await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, id))
      res.json({ success: true, message: `Order #${id} fulfilled — ${days} days premium granted to ${user.email}` })
    } else {
      res.status(400).json({ error: `Unknown order type: ${order.type}` }); return
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Backfill amount_usd on historical orders that have amount_usd = 0
router.post("/orders/backfill-usd", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Read current rates from config (fallbacks match the system defaults)
    const kesRate  = parseFloat(await getConfig("kes_rate")  || "130")
    const ngnRate  = parseFloat(await getConfig("ngn_rate")  || "1600")
    const ghsRate  = parseFloat(await getConfig("ghs_rate")  || "16")
    const zarRate  = parseFloat(await getConfig("zar_rate")  || "18")
    const phpRate  = parseFloat(await getConfig("php_rate")  || "56")
    const tzRate   = parseFloat(await getConfig("tzs_rate")  || "2700")
    const ugRate   = parseFloat(await getConfig("ugx_rate")  || "3700")
    const rwfRate  = parseFloat(await getConfig("rwf_rate")  || "1400")

    const rateMap: Record<string, number> = {
      KES: kesRate, NGN: ngnRate, GHS: ghsRate,
      ZAR: zarRate, PHP: phpRate, TZS: tzRate,
      UGX: ugRate,  RWF: rwfRate, USD: 1,
    }

    // Fetch all completed orders that still have amount_usd = 0
    const staleOrders = await db.select({
      id: ordersTable.id,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
    }).from(ordersTable).where(
      and(
        eq(ordersTable.status, "completed"),
        sql`${ordersTable.amountUsd} = 0 OR ${ordersTable.amountUsd} IS NULL`
      )
    )

    let updated = 0
    for (const order of staleOrders) {
      const currency = (order.currency || "USD").toUpperCase()
      const rate = rateMap[currency]
      if (!rate || !Number.isFinite(rate) || rate <= 0) continue
      const amountUsd = parseFloat((Number(order.amount) / rate).toFixed(2))
      if (!Number.isFinite(amountUsd) || amountUsd <= 0) continue
      await db.update(ordersTable).set({ amountUsd } as any).where(eq(ordersTable.id, order.id))
      updated++
    }

    res.json({ success: true, updated, total: staleOrders.length, rates: rateMap })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Backfill failed" })
  }
})

// Manually grant credits to a user by email (for off-system payments like direct Mpesa transfers)
router.post("/orders/grant-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, credits, note } = req.body
    if (!email || !credits) { res.status(400).json({ error: "email and credits are required" }); return }
    const creditsNum = parseInt(credits)
    if (isNaN(creditsNum) || creditsNum <= 0) { res.status(400).json({ error: "credits must be a positive number" }); return }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase())).limit(1)
    if (!user) { res.status(404).json({ error: `No user found with email: ${email}` }); return }

    const newCredits = (user.credits || 0) + creditsNum
    await db.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, user.id))

    // Create an order record for bookkeeping (amount_usd = 0 for manual grants)
    await db.insert(ordersTable).values({
      userId: user.id,
      amount: 0,
      amountUsd: 0,
      currency: "MANUAL",
      type: "credits",
      description: note || `Manual credit grant by admin`,
      status: "completed",
      stripeSessionId: `MANUAL-${req.userId}-${Date.now()}`,
      credits: creditsNum,
      time: now(),
    })

    // Notify user
    await db.insert(notificationsTable).values({
      userId: user.id, type: "credits", message: `${creditsNum} credits have been added to your account.`, time: now(), read: 0,
    } as any).catch(() => {})

    await db.insert(activityTable).values({
      type: "payment", userId: req.userId,
      title: "Manual credit grant",
      message: `${user.name} (${user.email}): +${creditsNum} credits → ${newCredits} total. Note: ${note || "none"}`,
      time: now()
    }).catch(() => {})

    res.json({ success: true, message: `✅ ${creditsNum} credits added to ${user.name} (${user.email}). New balance: ${newCredits}`, newBalance: newCredits })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Reconcile all pending orders older than 5 minutes (admin only)
router.post("/orders/reconcile-pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cutoff = now() - 5 * 60
    const pending = await db.select().from(ordersTable)
      .where(and(eq(ordersTable.status, "pending"), gte(ordersTable.time, 0)))
      .orderBy(desc(ordersTable.id))
      .limit(200)

    const stuckOrders = pending.filter(o => (o.time || 0) < cutoff)

    const results: { id: number; email: string; credits: number; fulfilled: boolean; reason?: string }[] = []

    for (const order of stuckOrders) {
      if (order.type !== "credits") continue
      // Fallback: parse credits from description e.g. "10 Credits" → 10
      const parsedFromDesc = order.description ? parseInt((order.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
      const creditsToAdd = (order.credits && order.credits > 0) ? order.credits : parsedFromDesc
      if (creditsToAdd <= 0) continue
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
        if (!user) { results.push({ id: order.id, email: "unknown", credits: 0, fulfilled: false, reason: "User not found" }); continue }

        await db.update(usersTable).set({ credits: (user.credits || 0) + creditsToAdd }).where(eq(usersTable.id, order.userId))
        // Persist the parsed credits back onto the order row
        if (!order.credits || order.credits <= 0) {
          await db.update(ordersTable).set({ status: "completed", credits: creditsToAdd }).where(eq(ordersTable.id, order.id))
        } else {
          await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.id, order.id))
        }
        await db.insert(notificationsTable).values({
          userId: order.userId, type: "credits", message: `${creditsToAdd} credits have been added to your account.`, time: now(), read: 0,
        } as any).catch(() => {})
        results.push({ id: order.id, email: user.email, credits: creditsToAdd, fulfilled: true })
      } catch (e) {
        results.push({ id: order.id, email: "error", credits: order.credits || 0, fulfilled: false, reason: String(e) })
      }
    }

    res.json({ reconciled: results.filter(r => r.fulfilled).length, total: stuckOrders.length, results })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Orders/revenue (supports ?search=email&status=pending&page=1)
router.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")))
    const search = String(req.query.search || "").trim()
    const statusFilter = String(req.query.status || "")

    let whereClause: any = undefined
    if (search && statusFilter) {
      whereClause = and(
        eq(ordersTable.status, statusFilter),
        sql`(${usersTable.email} LIKE ${'%' + search + '%'} OR ${usersTable.name} LIKE ${'%' + search + '%'})`
      )
    } else if (search) {
      whereClause = sql`(${usersTable.email} LIKE ${'%' + search + '%'} OR ${usersTable.name} LIKE ${'%' + search + '%'})`
    } else if (statusFilter) {
      whereClause = eq(ordersTable.status, statusFilter)
    }

    const orders = await db.select({
      order: ordersTable,
      user: { id: usersTable.id, name: usersTable.name, email: usersTable.email }
    }).from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(desc(ordersTable.id))
      .limit(50)
      .offset((page - 1) * 50)
    res.json(orders)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Reported users
router.get("/reports", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reports = await db.select().from(reportedUsersTable).orderBy(desc(reportedUsersTable.id)).limit(200)
    res.json(reports)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Dismiss a report
router.delete("/reports/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    await db.delete(reportedUsersTable).where(eq(reportedUsersTable.id, id))
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Trigger auto-messages manually from admin
router.post("/trigger-auto-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { triggerAutoMessages } = await import("../lib/fake-message-scheduler")
    const count = await triggerAutoMessages()
    res.json({ sent: count })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Import fake users
interface FakeUserImport {
  origId?: number
  name: string
  gender?: number
  looking?: number
  city?: string
  country?: string
  countryCode?: string
  age?: number
  bio?: string
  photo?: string
  photoThumb?: string
}

router.post("/import-fake-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { users } = req.body as { users: FakeUserImport[] }
    if (!Array.isArray(users)) { res.status(400).json({ error: "users must be an array" }); return }
    let imported = 0
    for (const u of users.slice(0, 200)) {
      try {
        const { hashPassword: hashPwImport } = await import("../lib/password")
        const fakePass = await hashPwImport("testuser")
        await db.insert(usersTable).values({
          name: u.name,
          email: `fake_${u.origId || Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`,
          password: fakePass,
          gender: u.gender || 2,
          looking: u.looking || 1,
          city: u.city || "",
          country: u.country || "",
          countryCode: u.countryCode || "",
          age: u.age || 25,
          bio: u.bio || "",
          photo: u.photo || "",
          photoThumb: u.photoThumb || "",
          fake: 1, verified: 1, credits: 2000,
          created: now(), lastAccess: String(now()),
        })
        imported++
      } catch { /* skip */ }
    }
    res.json({ imported })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// ─── Verifications ────────────────────────────────────────────────────

// GET /api/admin/verifications?status=pending|approved|rejected
router.get("/verifications", requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "pending")
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.verificationStatus as any, status))
      .orderBy(desc(usersTable.id))
      .limit(200)
    res.json(users.map(safeUser))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/verifications/:id/approve
router.post("/verifications/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    await db.update(usersTable).set({
      verificationStatus: "approved",
      verificationNote: "",
      verified: 1,
    }).where(eq(usersTable.id, id))
    await db.insert(notificationsTable).values({
      userId: id,
      fromId: null,
      type: "verified",
      message: "🎉 Your identity has been verified! You now have a blue tick on your profile.",
      link: `/profile/${id}`,
      read: 0,
      time: now(),
    })
    await db.insert(activityTable).values({
      type: "verification",
      userId: req.userId,
      title: "Verification approved",
      message: `${user.name} (id: ${user.id}) has been verified`,
      time: now(),
    })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/verifications/:id/reject
router.post("/verifications/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { note } = req.body
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    await db.update(usersTable).set({
      verificationStatus: "rejected",
      verificationNote: note || "Does not meet requirements",
      verified: 0,
    }).where(eq(usersTable.id, id))
    await db.insert(notificationsTable).values({
      userId: id,
      fromId: null,
      type: "info",
      message: `Your verification was not approved${note ? `: ${note}` : ""}. Please try again with a clearer photo.`,
      link: "/settings",
      read: 0,
      time: now(),
    })
    await db.insert(activityTable).values({
      type: "verification",
      userId: req.userId,
      title: "Verification rejected",
      message: `${user.name} (id: ${user.id}): ${note || "no reason given"}`,
      time: now(),
    })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Public config endpoint (no auth required - for frontend to check settings)
router.get("/config/public", async (req, res) => {
  try {
    const rows = await db.select().from(siteConfigTable)
    const publicKeys = ["require_email_verification", "site_name", "site_tagline", "hero_bg_url", "feed_enabled", "site_url"]
    const config: Record<string, string> = {}
    for (const row of rows) {
      if (publicKeys.includes(row.key)) config[row.key] = row.value || ""
    }
    res.json(config)
  } catch { res.json({}) }
})

// Raw EHLO probe — connects to SMTP server and captures server greeting + capabilities
// without doing any auth, so we can see what AUTH methods are actually offered.
async function rawSmtpProbe(host: string, port: number, secure: boolean): Promise<string[]> {
  const net = await import("net")
  const tls = await import("tls")
  const lines: string[] = []
  return new Promise(resolve => {
    const done = () => resolve(lines)
    const timeout = setTimeout(done, 7000)
    const onData = (data: Buffer) => {
      lines.push(...data.toString().split("\n").map(s => s.trimEnd()).filter(Boolean))
      if (lines.some(l => l.startsWith("250 ") || l.includes("250 "))) {
        clearTimeout(timeout)
        sock.destroy()
        done()
      }
    }
    const onReady = () => {
      sock.write(`EHLO diagnostics\r\n`)
    }
    let sock: any
    if (secure) {
      sock = tls.connect({ host, port, rejectUnauthorized: false }, onReady)
    } else {
      sock = net.createConnection({ host, port }, () => {})
      sock.once("data", (greeting: Buffer) => {
        lines.push(...greeting.toString().split("\n").map((s: string) => s.trimEnd()).filter(Boolean))
        onReady()
      })
    }
    sock.on("data", (d: Buffer) => { if (secure || lines.length > 0) onData(d) })
    sock.on("error", done)
    sock.on("close", done)
    sock.setTimeout(7000, done)
  })
}

// Check SMTP connectivity — three-phase: TCP → raw EHLO probe → nodemailer auth.
// Returns { phase, message?, error?, log?, probe? } for the UI to display.
router.post("/check-smtp", requireAuth, requireAdmin, async (req, res) => {
  const smtpLog: string[] = []
  try {
    const { host, port: portRaw, user, pass, secure: secureRaw } = req.body
    const port = parseInt(portRaw) || 587
    const secure = secureRaw === "1" || secureRaw === true

    if (!host || !port) {
      res.status(400).json({ phase: "tcp", error: "Host and port are required" }); return
    }

    // ── Phase 1: TCP reachability ───────────────────────────────────────────
    const net = await import("net")
    const tcpOk = await new Promise<boolean>(resolve => {
      const socket = net.createConnection({ host, port })
      const done = (ok: boolean) => { try { socket.destroy() } catch {} resolve(ok) }
      socket.setTimeout(5000)
      socket.on("connect", () => done(true))
      socket.on("timeout", () => done(false))
      socket.on("error", () => done(false))
    })

    if (!tcpOk) {
      res.json({
        phase: "tcp",
        error: `Cannot reach ${host}:${port}. The port is closed or blocked by a firewall.`,
      }); return
    }

    // ── Phase 1b: Raw EHLO probe (no auth) — see what the server advertises ─
    const probe = await rawSmtpProbe(host, port, secure)
    smtpLog.push("=== RAW SMTP PROBE (EHLO, no auth) ===")
    smtpLog.push(...probe)
    smtpLog.push("")
    console.error("[check-smtp probe]", probe.join(" | "))

    // ── Phase 2: nodemailer auth verify with full debug capture ─────────────
    const nodemailer = await import("nodemailer")
    const customLogger = {
      level() { return true },
      trace(...args: any[]) { smtpLog.push("T " + args.join(" ")) },
      debug(...args: any[]) { smtpLog.push("D " + args.join(" ")) },
      info(...args: any[])  { smtpLog.push("I " + args.join(" ")) },
      warn(...args: any[])  { smtpLog.push("W " + args.join(" ")) },
      error(...args: any[]) { smtpLog.push("E " + args.join(" ")) },
      fatal(...args: any[]) { smtpLog.push("F " + args.join(" ")) },
    }
    const transportOpts: any = {
      host, port, secure,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
      logger: customLogger,
      debug: true,
    }
    if (user && pass) {
      transportOpts.auth = { user: user.trim(), pass: pass.trim() }
    }
    if (!secure) transportOpts.requireTLS = true

    // Determine best auth method from probe output
    const probeText = probe.join(" ")
    if (probeText.includes("AUTH")) {
      if (probeText.includes("PLAIN")) transportOpts.authMethod = "PLAIN"
      else if (probeText.includes("LOGIN")) transportOpts.authMethod = "LOGIN"
    } else {
      transportOpts.authMethod = "LOGIN"
    }
    smtpLog.push(`=== NODEMAILER AUTH (method: ${transportOpts.authMethod}) ===`)

    const transporter = nodemailer.createTransport(transportOpts)
    const verifyPromise = transporter.verify()
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        `Auth verification timed out after 10s on ${host}:${port}.`
      )), 10000)
    )

    await Promise.race([verifyPromise, timeoutPromise])
    console.error("[check-smtp ok]", host, port)
    res.json({
      phase: "ok",
      message: `✓ Connected and authenticated successfully to ${host}:${port}`,
      log: smtpLog,
    })
  } catch (err: any) {
    const raw = err?.message || "SMTP check failed"
    console.error("[check-smtp error]", raw)
    smtpLog.push("ERROR: " + raw)
    console.error("[check-smtp log]", smtpLog.join(" | "))
    let msg = raw
    if (raw.includes("535") || raw.toLowerCase().includes("incorrect authentication") || raw.toLowerCase().includes("invalid login")) {
      const probeLines = smtpLog.filter(l => l.includes("AUTH"))
      const authMethods = probeLines.length ? `\nServer advertised: ${probeLines.join("; ")}` : ""
      msg = `${raw}${authMethods}\n\n💡 The server rejected your credentials. Check the SMTP debug log below for the exact server response. Common fixes:\n• Verify username is the full email address (contact@richdatingnetwork.com)\n• Reset the email account password in DirectAdmin → Email Accounts\n• Try port 465 with TLS=Yes instead of 587`
    }
    res.json({ phase: "auth", error: msg, log: smtpLog })
  }
})

// Test email endpoint — uses nodemailer directly so the real SMTP error is surfaced to the admin
router.post("/test-email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to, host: bodyHost, port: bodyPort, user: bodyUser, pass: bodyPass,
            secure: bodySecure, from: bodyFrom, from_name: bodyFromName,
            auth_method: bodyAuthMethod } = req.body
    if (!to) { res.status(400).json({ error: "Recipient email required" }); return }

    // Use values from the request body (current form) if provided, fall back to DB
    const getConf = async (key: string) => {
      const r = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
      return r[0]?.value || ""
    }
    const smtpHost = bodyHost || process.env.SMTP_HOST || await getConf("smtp_host")
    const smtpPort = parseInt(bodyPort || process.env.SMTP_PORT || await getConf("smtp_port") || "587")
    const smtpUser = bodyUser !== undefined ? bodyUser : (process.env.SMTP_USER || await getConf("smtp_user"))
    const smtpPass = bodyPass !== undefined ? bodyPass : (process.env.SMTP_PASS || await getConf("smtp_pass"))
    const smtpFromRaw = bodyFrom !== undefined ? bodyFrom : (process.env.SMTP_FROM || await getConf("smtp_from"))
    const smtpFrom = smtpFromRaw || smtpUser
    const smtpFromName = bodyFromName || process.env.SMTP_FROM_NAME || await getConf("smtp_from_name") || "Rich Dating Network"
    const smtpSecure = bodySecure !== undefined ? (bodySecure === "1" || bodySecure === true) : ((process.env.SMTP_SECURE || await getConf("smtp_secure")) === "1")
    const smtpAuthMethod = bodyAuthMethod !== undefined ? bodyAuthMethod : (process.env.SMTP_AUTH_METHOD || await getConf("smtp_auth_method") || "")
    const siteName = await getConf("site_name") || "Rich Dating Network"

    if (!smtpHost) {
      res.status(400).json({ error: "SMTP Host is required." }); return
    }

    // Create transporter — auth is optional (localhost:25 works without credentials)
    const SMTP_HARD_TIMEOUT_MS = 8000
    const nodemailer = await import("nodemailer")
    const transportOptsTE: any = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    }
    if (smtpUser && smtpPass) {
      transportOptsTE.auth = { user: smtpUser.trim(), pass: smtpPass.trim() }
    }
    if (!smtpSecure) transportOptsTE.requireTLS = true
    transportOptsTE.authMethod = 'LOGIN'
    const transporter = nodemailer.createTransport(transportOptsTE)

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(
          `SMTP connection timed out after ${SMTP_HARD_TIMEOUT_MS / 1000}s. ` +
          `Check your host (${smtpHost}), port (${smtpPort}), and TLS setting ` +
          `(port 465 requires TLS=Yes; port 587 requires TLS=No).`
        )),
        SMTP_HARD_TIMEOUT_MS
      )
    )

    await Promise.race([
      transporter.sendMail({
        from: `"${smtpFromName}" <${smtpFrom}>`,
        to,
        subject: `Test Email from ${siteName}`,
        html: `
<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
<h2 style="color:#FF192C">✅ Test Email</h2>
<p>This is a test email from <strong>${siteName}</strong>.</p>
<p>If you received this, your SMTP configuration is working correctly!</p>
<p style="color:#aaa;font-size:12px;margin-top:24px">Sent from Admin Panel · ${new Date().toISOString()}</p>
</div>`,
        text: `Test Email from ${siteName}. If you received this, SMTP is working correctly.`,
      }),
      timeoutPromise,
    ])

    res.json({ success: true, message: "Test email sent successfully to " + to })
  } catch (err: any) {
    // Surface the real nodemailer/SMTP error to the admin UI
    const msg = err?.message || "Failed to send test email"
    console.error("[test-email] SMTP error:", msg)
    res.status(500).json({ error: msg })
  }
})

// Get all online users (admin view)
router.get("/online-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const fiveMinutesAgo = String(now() - 300)
    const users = await db.select().from(usersTable)
      .where(gte(usersTable.lastAccess as any, fiveMinutesAgo))
      .orderBy(desc(usersTable.lastAccess))
      .limit(100)
    res.json(users.map(safeUser))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// GET /api/admin/fetch-real-profiles — fetches real-looking profiles from randomuser.me
router.get("/fetch-real-profiles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = Math.min(50, Math.max(1, parseInt(String(req.query.count || "20"))))
    const gender = String(req.query.gender || "")

    const params = new URLSearchParams({
      results: String(count),
      nat: "us,gb,ca,au,de,fr,nl,se,dk,no",
      inc: "name,gender,dob,location,picture,login",
    })
    if (gender === "male" || gender === "female") params.set("gender", gender)

    const resp = await fetch(`https://randomuser.me/api/?${params}`)
    if (!resp.ok) throw new Error("randomuser.me request failed")
    const data = await resp.json() as { results: any[] }

    // Age-segmented bios so the text matches the photo's apparent age
    const bios: Record<string, Record<string, string[]>> = {
      male: {
        young: [ // 22–34
          "Young entrepreneur with big dreams. I work hard and play harder — let's explore the world together.",
          "Startup founder, gym rat, avid traveler. Life is an adventure — looking for someone to share it with.",
          "Software engineer by day, weekend hiker by passion. Down to earth, ambitious, and ready for something real.",
          "Finance grad who loves good food, craft beer, and spontaneous road trips. Let's connect.",
          "Just moved to the city for my career. Looking for someone genuine to spend time with.",
        ],
        mid: [ // 35–49
          "Successful entrepreneur who loves travel and fine dining. Looking for a genuine connection.",
          "Tech exec by day, amateur chef by night. Life is too short for anything less than extraordinary.",
          "Finance professional with a love for jazz, art, and good conversation. Let's connect.",
          "CEO of my own company. Passionate about life and looking for someone who matches my energy.",
          "Doctor with a big heart. I work hard so I can play hard — beach house, ski trips, you name it.",
          "Avid traveler who has visited 40+ countries. Looking for a partner to explore the world with.",
        ],
        senior: [ // 50+
          "Retired early through smart investing. Now I enjoy sailing, golf, and the finer things in life.",
          "Seasoned professional, recently divorced, ready for the next chapter. Let's make it a good one.",
          "Grandfather of two, young at heart. Love hiking, cooking, and long dinners with good company.",
          "Successful businessman winding down. Looking for meaningful connection, not games.",
          "Semi-retired architect. Life gets better with age — looking for someone who agrees.",
        ],
      },
      female: {
        young: [ // 22–34
          "Creative soul with a passion for travel, photography, and good coffee. Looking for my partner in adventure.",
          "Marketing professional who loves art, music festivals, and spontaneous weekend trips. Let's talk.",
          "Graduate student by day, foodie by night. Seeking someone ambitious and kind.",
          "Fitness instructor and wellness advocate. I believe in balance — work hard, live well.",
          "Graphic designer with a love for culture and creativity. Looking for someone who keeps me laughing.",
        ],
        mid: [ // 35–49
          "Corporate lawyer who loves adventure on weekends. Seeking someone who matches my ambition.",
          "Entrepreneur and wellness advocate. Life is beautiful — I want to share it with the right person.",
          "Art curator with a love for travel, wine, and meaningful conversations. Seeking my equal.",
          "Real estate investor who built her empire from scratch. Looking for a real partner in crime.",
          "Finance director who loves salsa dancing and cooking. Life is short — let's make it amazing.",
          "Fashion designer with a passion for art and culture. Looking for a confident, ambitious man.",
        ],
        senior: [ // 50+
          "Empty-nester rediscovering herself. Love hiking, book clubs, and Sunday farmers markets.",
          "Elegant, independent woman who knows what she wants. Looking for real companionship.",
          "Retired teacher with a big heart. Love travel, grandchildren, and anyone who can make me laugh.",
          "Business owner who has finally made time for herself. Seeking a genuine, mature connection.",
          "Life is too short for small talk. Let's skip to the good stuff.",
        ],
      },
    }

    function pickBio(g: "male" | "female", age: number): string {
      const tier = age < 35 ? "young" : age < 50 ? "mid" : "senior"
      const list = bios[g][tier]
      return list[Math.floor(Math.random() * list.length)]
    }

    const profiles = (data.results || []).map((r: any) => {
      const g: "male" | "female" = r.gender === "male" ? "male" : "female"
      const age = Math.min(65, Math.max(22, r.dob.age))
      // Derive DOB from the age so the stored birth year stays consistent
      const thisYear = new Date().getFullYear()
      const birthYear = thisYear - age
      const dob = r.dob.date
        ? r.dob.date.split('T')[0]  // use real DOB date from API if available
        : `${birthYear}-06-15`       // fallback: mid-year
      return {
        name: `${r.name.first} ${r.name.last}`,
        gender: g === "male" ? 1 : 2,
        looking: g === "male" ? 2 : 1,
        age,
        dob,
        city: r.location.city,
        country: r.location.country,
        countryCode: r.nat || "",
        bio: pickBio(g, age),
        photo: r.picture.large,
        photoThumb: r.picture.medium,
        origId: Math.floor(Math.random() * 9000000) + 1000000,
      }
    })

    res.json({ profiles })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ── CREDIT AUDIT ─────────────────────────────────────────────────────────────
// Returns completed PayHero credit orders that may have been wrongly auto-credited.
// PayHero order refs have the pattern RDN-{userId}-{timestamp}.
router.get("/orders/credit-audit", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select({
        order: ordersTable,
        user: {
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          credits: usersTable.credits,
        },
      })
      .from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .where(
        and(
          eq(ordersTable.status, "completed"),
          eq(ordersTable.type, "credits"),
        )
      )
      .orderBy(desc(ordersTable.id))
      .limit(200)

    // Filter to PayHero orders only (ref pattern: RDN-{num}-{num}, NOT RDN-PS- or cs_ or MANUAL-)
    const payHeroOrders = rows.filter(r => {
      const ref = r.order.stripeSessionId || ""
      if (!ref) return false
      if (ref.startsWith("cs_")) return false
      if (ref.startsWith("RDN-PS-")) return false
      if (ref.startsWith("RDN-PM-")) return false
      if (ref.startsWith("MANUAL-")) return false
      if (ref.startsWith("STRAT-")) return false
      return /^RDN-\d+-\d+$/.test(ref)
    })

    res.json(payHeroOrders)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Verify a single completed order against the PayHero API.
// Returns the actual PayHero payment status for that ref.
router.post("/orders/:id/verify-payhero", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1)
    if (!order) { res.status(404).json({ error: "Order not found" }); return }
    const ref = order.stripeSessionId
    if (!ref) { res.status(400).json({ error: "Order has no reference" }); return }

    const apiUsername = await getConfig("payhero_api_username")
    const apiPassword = await getConfig("payhero_api_password")
    if (!apiUsername || !apiPassword) {
      res.status(400).json({ error: "PayHero credentials not configured — set them in Admin → Payment Providers" }); return
    }

    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
    const response = await fetch(`https://backend.payhero.co.ke/api/v2/transaction-status/${ref}`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(10_000),
    })
    const data = await response.json() as Record<string, unknown>
    const phStatus = String(data.status || "").toUpperCase()
    const resultCode = data.ResultCode ?? data.resultCode ?? null

    let verdict: "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING" | "UNKNOWN"
    if (phStatus === "SUCCESS" || resultCode === 0) verdict = "SUCCESS"
    else if (phStatus === "CANCELLED" || resultCode === 1032 || resultCode === "1032") verdict = "CANCELLED"
    else if (phStatus === "FAILED" || phStatus === "TIMEOUT") verdict = "FAILED"
    else if (phStatus === "PENDING" || phStatus === "") verdict = "PENDING"
    else verdict = "UNKNOWN"

    res.json({ verdict, phStatus, resultCode, raw: data })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: `PayHero check failed: ${msg}` })
  }
})

// Reverse a wrongly-credited order: deduct the credits from the user's balance
// and mark the order as "failed". Logs to activity for audit trail.
router.post("/orders/:id/reverse-credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1)
    if (!order) { res.status(404).json({ error: "Order not found" }); return }
    if (order.status === "failed" || order.status === "cancelled") {
      res.status(400).json({ error: "Order is already marked as failed/cancelled" }); return
    }
    if (order.type !== "credits") {
      res.status(400).json({ error: "Only credit orders can be reversed" }); return
    }

    const parsedFromDesc = order.description ? parseInt((order.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
    const creditsToRemove = (order.credits && order.credits > 0) ? order.credits : parsedFromDesc
    if (creditsToRemove <= 0) {
      res.status(400).json({ error: "Cannot determine credits to deduct — credits value is 0 on this order" }); return
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }

    const newCredits = Math.max(0, (user.credits || 0) - creditsToRemove)
    const actuallyDeducted = (user.credits || 0) - newCredits

    await db.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, order.userId))
    await db.update(ordersTable).set({ status: "failed" }).where(eq(ordersTable.id, id))

    const reason = req.body.reason || "Cancelled M-Pesa transaction — credits reversed by admin"
    await db.insert(activityTable).values({
      type: "admin", userId: req.userId,
      title: "Credits reversed",
      message: `Order #${id} (${order.stripeSessionId}): -${actuallyDeducted} credits from ${user.name} (${user.email}). New balance: ${newCredits}. Reason: ${reason}`,
      time: now(),
    }).catch(() => {})

    await db.insert(notificationsTable).values({
      userId: order.userId, type: "admin",
      message: `${actuallyDeducted} credits have been removed from your account (payment verification failed).`,
      time: now(), read: 0,
    } as any).catch(() => {})

    res.json({
      success: true,
      message: `✅ Reversed ${actuallyDeducted} credits from ${user.name}. New balance: ${newCredits}`,
      deducted: actuallyDeducted,
      newBalance: newCredits,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// GET /api/admin/exchange-rates/refresh — fetch live rates from frankfurter.app and save to site_config
router.post("/exchange-rates/refresh", requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=KES,NGN,GHS,ZAR,PHP,TZS,UGX,RWF,EGP")
    if (!response.ok) { res.status(502).json({ error: "Exchange rate API unavailable" }); return }
    const data = await response.json() as { rates: Record<string, number>; date: string }
    const rates = data.rates
    const mapping: Record<string, string> = {
      KES: "kes_rate", NGN: "ngn_rate", GHS: "ghs_rate",
      ZAR: "zar_rate", PHP: "php_rate", TZS: "tzs_rate",
      UGX: "ugx_rate", RWF: "rwf_rate", EGP: "egp_rate",
    }
    const updated: Record<string, number> = {}
    for (const [code, key] of Object.entries(mapping)) {
      if (rates[code]) {
        const rateVal = rates[code].toFixed(4) // preserve decimal precision for accurate conversions
        const existing = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key as any, key)).limit(1)
        if (existing.length) {
          await db.update(siteConfigTable).set({ value: rateVal } as any).where(eq(siteConfigTable.key as any, key))
        } else {
          await db.insert(siteConfigTable).values({ key, value: rateVal } as any)
        }
        updated[code] = rates[code]
      }
    }
    // Also save timestamp
    const tsKey = "exchange_rates_updated"
    const existingTs = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key as any, tsKey)).limit(1)
    const tsVal = data.date
    if (existingTs.length) await db.update(siteConfigTable).set({ value: tsVal } as any).where(eq(siteConfigTable.key as any, tsKey))
    else await db.insert(siteConfigTable).values({ key: tsKey, value: tsVal } as any)
    res.json({ success: true, rates: updated, date: data.date })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch exchange rates" })
  }
})

// GET /api/admin/public-config — safe public settings for the frontend (clarity, etc.)
router.get("/public-config", async (req, res) => {
  try {
    const rows = await db.select().from(siteConfigTable)
      .where(inArray(siteConfigTable.key as any, ["clarity_project_id", "google_analytics_id", "site_name"] as any))
    const cfg: Record<string, string> = {}
    for (const r of rows) cfg[(r as any).key] = (r as any).value || ""
    res.json(cfg)
  } catch {
    res.json({})
  }
})

export default router
