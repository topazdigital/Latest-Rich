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
    const totalRevenue = await db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(ordersTable).where(eq(ordersTable.status, "completed"))
    const todayRevenue = await db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(ordersTable).where(and(eq(ordersTable.status, "completed"), gte(ordersTable.time, today)))
    const [totalMessages] = await db.select({ count: count() }).from(messagesTable)
    const [totalLikes] = await db.select({ count: count() }).from(likesTable)
    const [bannedUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.banned, 1))

    res.json({
      totalUsers: totalUsers.count,
      fakeUsers: fakeUsers.count,
      realUsers: (totalUsers.count || 0) - (fakeUsers.count || 0),
      newToday: newToday.count,
      premiumUsers: premiumUsers.count,
      onlineUsers: onlineUsers.count,
      bannedUsers: bannedUsers.count,
      totalRevenue: totalRevenue[0]?.sum || 0,
      todayRevenue: todayRevenue[0]?.sum || 0,
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
    const limit = 50
    const offset = (page - 1) * limit
    const filter = String(req.query.filter || "all")
    const search = String(req.query.search || "")

    const filterCondition: SQL | undefined =
      filter === "fake"    ? eq(usersTable.fake, 1)    :
      filter === "real"    ? eq(usersTable.fake, 0)    :
      filter === "premium" ? eq(usersTable.premium, 1) :
      filter === "banned"  ? eq(usersTable.banned, 1)  :
      filter === "admin"   ? gte(usersTable.admin, 1)   :
      undefined

    let users = await db.select().from(usersTable)
      .where(filterCondition)
      .orderBy(sql`CAST(COALESCE(${usersTable.lastAccess}, '0') AS ${sql.raw(isMysql ? 'SIGNED' : 'BIGINT')}) DESC`)
      .limit(limit)
      .offset(offset)

    if (search) {
      users = users.filter(u => 
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.city?.toLowerCase().includes(search.toLowerCase())
      )
    }

    const [{ count: total }] = await db.select({ count: count() }).from(usersTable).where(filterCondition)
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
    const { name, email, city, country, bio, credits, premium, premiumExpiry, fake, admin, banned, verified, gender, looking, age } = req.body
    const adminLevel = parseInt(admin)
    await db.update(usersTable).set({
      name, email, city, country, bio,
      credits: parseInt(credits) || 0,
      premium: parseInt(premium) || 0,
      premiumExpiry: parseInt(premiumExpiry) || 0,
      fake: parseInt(fake) || 0,
      admin: isNaN(adminLevel) ? 0 : Math.max(0, Math.min(2, adminLevel)),
      banned: parseInt(banned) || 0,
      verified: parseInt(verified) || 0,
      gender: parseInt(gender) || 1,
      looking: parseInt(looking) || 2,
      age: parseInt(age) || 0,
    }).where(eq(usersTable.id, id))
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
    await db.delete(usersTable).where(eq(usersTable.id, id))
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

// Create fake user
router.post("/fake-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, gender, looking, city, country, countryCode, age, bio, photo, photoThumb } = req.body
    if (!name) { res.status(400).json({ error: "Name is required" }); return }
    const fakeEmail = `fake_${Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`
    await db.insert(usersTable).values({
      name,
      email: fakeEmail,
      password: "fake_user_no_login",
      gender: parseInt(gender) || 2,
      looking: parseInt(looking) || 1,
      city: city || "New York",
      country: country || "United States",
      countryCode: countryCode || "US",
      age: parseInt(age) || 28,
      bio: bio || "",
      photo: photo || "",
      photoThumb: photoThumb || "",
      fake: 1, verified: 1, credits: 2000,
      created: now(), lastAccess: String(now()),
    })
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, fakeEmail)).limit(1)
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

// Get user chats summary (admin)
router.get("/users/:id/chats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
    const conversations = await db.select({
      other: { id: usersTable.id, name: usersTable.name, photo: usersTable.photo },
      lastMsg: messagesTable.message,
      lastTime: messagesTable.time,
    })
      .from(messagesTable)
      .innerJoin(usersTable, sql`(${messagesTable.u1} = ${id} AND ${usersTable.id} = ${messagesTable.u2}) OR (${messagesTable.u2} = ${id} AND ${usersTable.id} = ${messagesTable.u1})`)
      .where(sql`${messagesTable.u1} = ${id} OR ${messagesTable.u2} = ${id}`)
      .orderBy(desc(messagesTable.time))
      .limit(20)
    res.json(conversations)
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

// Orders/revenue
router.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1")))
    const orders = await db.select({
      order: ordersTable,
      user: { id: usersTable.id, name: usersTable.name, email: usersTable.email }
    }).from(ordersTable)
      .leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
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
        await db.insert(usersTable).values({
          name: u.name,
          email: `fake_${u.origId || Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`,
          password: "fake_user_no_login",
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

// Test email endpoint — uses nodemailer directly so the real SMTP error is surfaced to the admin
router.post("/test-email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to } = req.body
    if (!to) { res.status(400).json({ error: "Recipient email required" }); return }

    // Read SMTP config from DB
    const getConf = async (key: string) => {
      const r = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
      return r[0]?.value || ""
    }
    const smtpHost = process.env.SMTP_HOST || await getConf("smtp_host")
    const smtpPort = parseInt(process.env.SMTP_PORT || await getConf("smtp_port") || "587")
    const smtpUser = process.env.SMTP_USER || await getConf("smtp_user")
    const smtpPass = process.env.SMTP_PASS || await getConf("smtp_pass")
    const smtpFrom = process.env.SMTP_FROM || await getConf("smtp_from") || smtpUser
    const smtpFromName = process.env.SMTP_FROM_NAME || await getConf("smtp_from_name") || "Rich Dating Network"
    const smtpSecure = (process.env.SMTP_SECURE || await getConf("smtp_secure")) === "1"
    const siteName = await getConf("site_name") || "Rich Dating Network"

    if (!smtpHost || !smtpUser || !smtpPass) {
      res.status(400).json({
        error: `SMTP not fully configured. Missing: ${[!smtpHost && "Host", !smtpUser && "Username", !smtpPass && "Password"].filter(Boolean).join(", ")}.`
      }); return
    }

    // Create transporter directly — any SMTP error propagates to the catch block below.
    // Per-option timeouts cover TCP connect + greeting, but NOT the TLS handshake phase —
    // a misconfigured port/secure combo (e.g. port 465 with secure:false) can still hang
    // indefinitely inside the TLS negotiation. Promise.race with a hard deadline guarantees
    // the request always resolves within SMTP_HARD_TIMEOUT_MS regardless of what hangs.
    const SMTP_HARD_TIMEOUT_MS = 8000
    const nodemailer = await import("nodemailer")
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    })

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

export default router
