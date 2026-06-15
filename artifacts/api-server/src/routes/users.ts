import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, userExtendedTable, photosTable, likesTable, profileBoostsTable } from "@workspace/db/schema"
import { eq, and, ne, desc, sql, gt, or, isNull, inArray } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { hashPassword, verifyAndUpgrade } from "../lib/password"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function safeUser(u: any) {
  const { password, ...rest } = u
  return rest
}

function containsContactInfo(text: string): boolean {
  if (!text) return false
  if (/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/.test(text)) return true
  if (/(\+?[\d][\d\s\.\-\(\)]{5,}[\d])/.test(text)) return true
  if (/(instagram|insta|ig|whatsapp|whats\s*app|wa|telegram|tg|t\.me|snapchat|snap|sc|facebook|fb|twitter|x\.com|tiktok|tt|wechat|line|kik|skype|discord|viber|signal|linktree|onlyfans)[\s:\/=@\-]*[\w.@\-]{2,}/i.test(text)) return true
  if (/@[\w.]{3,}/.test(text)) return true
  if (/https?:\/\/[^\s]{4,}/.test(text)) return true
  if (/\bwww\.[a-zA-Z0-9\-]{2,}\.[a-zA-Z]{2,}/.test(text)) return true
  return false
}

router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    await db.update(usersTable).set({ lastAccess: String(now()) }).where(eq(usersTable.id, user.id))
    res.json(safeUser(user))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/me/full", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user) { res.status(404).json({ error: "Not found" }); return }
    const [extended] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, req.userId!)).limit(1)
    const photos = await db.select().from(photosTable).where(eq(photosTable.userId, req.userId!))
    res.json({ ...safeUser(user), userExtended: extended || {}, photos })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

// Daily login bonus
router.post("/me/daily-bonus", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user) { res.status(404).json({ error: "Not found" }); return }
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
    if ((user.lastDailyBonus || 0) >= todayStart) {
      res.json({ alreadyClaimed: true, credits: user.credits })
      return
    }
    const bonus = 10
    const newCredits = (user.credits || 0) + bonus
    await db.update(usersTable).set({ credits: newCredits, lastDailyBonus: now() }).where(eq(usersTable.id, user.id))
    res.json({ alreadyClaimed: false, bonus, credits: newCredits })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.put("/me", requireAuth, async (req, res) => {
  try {
    const { name, bio, city, country, countryCode, birthday, looking, occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship } = req.body

    if (bio && containsContactInfo(bio)) {
      res.status(400).json({
        error: "Your bio cannot contain email addresses, phone numbers, social media handles, or links.",
        code: "contact_info_in_bio",
      })
      return
    }
    if (name && containsContactInfo(name)) {
      res.status(400).json({ error: "Display name cannot contain contact information.", code: "contact_info_in_name" })
      return
    }

    function calcAge(bd: string) {
      if (!bd) return 0
      const d = new Date(bd), t = new Date()
      let age = t.getFullYear() - d.getFullYear()
      const m = t.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
      return age
    }

    await db.update(usersTable).set({
      name: name || undefined,
      bio: bio !== undefined ? bio : undefined,
      city: city || undefined,
      country: country || undefined,
      countryCode: countryCode || undefined,
      birthday: birthday || undefined,
      age: birthday ? calcAge(birthday) : undefined,
      looking: looking ? parseInt(looking) : undefined,
    }).where(eq(usersTable.id, req.userId!))

    const [existing] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, req.userId!)).limit(1)
    const { interests, languages, zodiac, passions } = req.body
    const extData = { occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship, interests: interests || undefined, languages: languages || undefined, zodiac: zodiac || undefined, passions: passions || undefined }
    if (existing) {
      await db.update(userExtendedTable).set(extData).where(eq(userExtendedTable.userId, req.userId!))
    } else {
      await db.insert(userExtendedTable).values({ userId: req.userId!, ...extData })
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to update" })
  }
})

router.put("/me/password", requireAuth, async (req, res) => {
  try {
    const { current, newPass } = req.body
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const valid = await verifyAndUpgrade(current, user?.password || "", async (h) => {
      await db.update(usersTable).set({ password: h }).where(eq(usersTable.id, user.id))
    })
    if (!user || !valid) {
      res.status(400).json({ error: "Current password is incorrect" }); return
    }
    if (!newPass || newPass.length < 6) {
      res.status(400).json({ error: "New password too short" }); return
    }
    const { hashPassword } = await import("../lib/password")
    await db.update(usersTable).set({ password: await hashPassword(newPass) }).where(eq(usersTable.id, user.id))
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "")
    const city = String(req.query.city || "")
    const country = String(req.query.country || "")
    const ageMin = parseInt(String(req.query.ageMin || "18"))
    const ageMax = parseInt(String(req.query.ageMax || "99"))
    const gender = parseInt(String(req.query.gender || "0"))
    const onlineOnly = req.query.online === "1"

    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const myCity = myUser[0]?.city || ""
    const myCountry = myUser[0]?.country || ""

    // Get currently boosted user IDs
    const boostedRows = await db.select({ userId: profileBoostsTable.userId })
      .from(profileBoostsTable)
      .where(and(eq(profileBoostsTable.active, 1), gt(profileBoostsTable.endTime, now())))
    const boostedIds = new Set(boostedRows.map(b => b.userId))

    let users = await db.select().from(usersTable)
      .where(and(ne(usersTable.id, req.userId!), or(eq(usersTable.banned, 0), isNull(usersTable.banned))))
      .orderBy(desc(usersTable.lastAccess))
      .limit(500)

    users = users.filter(u => {
      if (q && !u.name.toLowerCase().includes(q.toLowerCase()) && !u.city?.toLowerCase().includes(q.toLowerCase())) return false
      if (city && !u.city?.toLowerCase().includes(city.toLowerCase())) return false
      if (country && u.country !== country) return false
      if (gender > 0 && u.gender !== gender) return false
      const userAge = u.age ?? 0
      if (userAge > 0 && (userAge < ageMin || userAge > ageMax)) return false
      if (onlineOnly && u.online !== 1) return false
      return true
    })

    // Sort: boosted first, then by proximity, then by last access
    users.sort((a, b) => {
      const aBoost = boostedIds.has(a.id) ? 0 : 1
      const bBoost = boostedIds.has(b.id) ? 0 : 1
      if (aBoost !== bBoost) return aBoost - bBoost
      const aCity = a.city === myCity ? 0 : a.country === myCountry ? 1 : 2
      const bCity = b.city === myCity ? 0 : b.country === myCountry ? 1 : 2
      return aCity - bCity
    })

    let result = users.slice(0, 200).map(u => ({
      ...safeUser(u),
      isBoosted: boostedIds.has(u.id),
    }))

    // Enrich with photos table for users missing a profile photo
    const missingPhotoIds = result.filter(u => !u.photo).map(u => u.id)
    if (missingPhotoIds.length > 0) {
      const fallbackPhotos = await db
        .select({ userId: photosTable.userId, photo: photosTable.photo, thumb: photosTable.thumb })
        .from(photosTable)
        .where(and(inArray(photosTable.userId, missingPhotoIds), eq(photosTable.approved, 1)))
        .orderBy(desc(photosTable.main), photosTable.id)
      const photoMap = new Map<number, { photo: string; thumb: string }>()
      for (const p of fallbackPhotos) {
        if (!photoMap.has(p.userId)) photoMap.set(p.userId, { photo: p.photo, thumb: p.thumb || p.photo })
      }
      result = result.map(u => ({
        ...u,
        photo: u.photo || photoMap.get(u.id)?.photo || '',
        photoThumb: u.photoThumb || photoMap.get(u.id)?.thumb || '',
      }))
    }

    res.json(result)
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/suggested", requireAuth, async (req, res) => {
  try {
    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const myCity = myUser[0]?.city || ""
    const myCountry = myUser[0]?.country || ""

    const boostedRows = await db.select({ userId: profileBoostsTable.userId })
      .from(profileBoostsTable)
      .where(and(eq(profileBoostsTable.active, 1), gt(profileBoostsTable.endTime, now())))
    const boostedIds = new Set(boostedRows.map(b => b.userId))

    const users = await db.select().from(usersTable)
      .where(and(ne(usersTable.id, req.userId!), or(eq(usersTable.banned, 0), isNull(usersTable.banned))))
      .orderBy(desc(usersTable.lastAccess))
      .limit(100)

    const sorted = users.sort((a, b) => {
      const aBoost = boostedIds.has(a.id) ? 0 : 1
      const bBoost = boostedIds.has(b.id) ? 0 : 1
      if (aBoost !== bBoost) return aBoost - bBoost
      const aScore = a.city === myCity ? 0 : a.country === myCountry ? 1 : 2
      const bScore = b.city === myCity ? 0 : b.country === myCountry ? 1 : 2
      return aScore - bScore
    })

    res.json(sorted.slice(0, 40).map(u => ({ ...safeUser(u), isBoosted: boostedIds.has(u.id) })))
  } catch {
    res.status(500).json([])
  }
})

router.get("/meet", requireAuth, async (req, res) => {
  try {
    const users = await db.select().from(usersTable)
      .where(and(
        ne(usersTable.id, req.userId!),
        or(eq(usersTable.banned, 0), isNull(usersTable.banned)),
      ))
      .orderBy(sql`RANDOM()`)
      .limit(50)
    res.json(users.map(safeUser))
  } catch {
    res.status(500).json([])
  }
})

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "Not found" }); return }
    const [extended] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, id)).limit(1)
    // Check if this user has an active boost
    const [activeBoost] = await db.select().from(profileBoostsTable)
      .where(and(eq(profileBoostsTable.userId, id), eq(profileBoostsTable.active, 1), gt(profileBoostsTable.endTime, now())))
      .limit(1)
    // If no profile photo, fall back to first approved photo in photos table
    let photo = user.photo || ''
    let photoThumb = user.photoThumb || ''
    if (!photo) {
      const [firstPhoto] = await db.select().from(photosTable)
        .where(and(eq(photosTable.userId, id), eq(photosTable.approved, 1)))
        .orderBy(desc(photosTable.main), photosTable.id)
        .limit(1)
      if (firstPhoto) { photo = firstPhoto.photo; photoThumb = firstPhoto.thumb || firstPhoto.photo }
    }
    res.json({ ...safeUser(user), photo, photoThumb, userExtended: extended || {}, isBoosted: !!activeBoost })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/:id/photos", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const photos = await db.select().from(photosTable).where(and(eq(photosTable.userId, id), eq(photosTable.approved, 1)))
    res.json(photos)
  } catch {
    res.status(500).json([])
  }
})

router.delete("/me", requireAuth, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, req.userId!))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/:id/liked-status", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id as string)
    const myId = req.userId!
    const [iLiked] = await db.select().from(likesTable).where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId))).limit(1)
    const [theyLiked] = await db.select().from(likesTable).where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId))).limit(1)
    res.json({ hasLiked: !!iLiked, isMatch: !!iLiked && !!theyLiked })
  } catch {
    res.status(500).json({ hasLiked: false, isMatch: false })
  }
})

// Save profile completion questions (passions, idealDate, selfDescription, personalityType)
router.post("/profile/questions", requireAuth, async (req, res) => {
  try {
    const { passions, idealDate, selfDescription, personalityType } = req.body
    const userId = req.userId!

    // Update user_extended
    const existingExt = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, userId)).limit(1)
    if (existingExt.length > 0) {
      await db.update(userExtendedTable).set({
        passions: passions || "",
        idealDate: idealDate || "",
        selfDescription: selfDescription || "",
        personalityType: personalityType || "",
      }).where(eq(userExtendedTable.userId, userId))
    } else {
      await db.insert(userExtendedTable).values({
        userId,
        passions: passions || "",
        idealDate: idealDate || "",
        selfDescription: selfDescription || "",
        personalityType: personalityType || "",
      })
    }

    // Update bio if selfDescription is provided and bio is empty
    if (selfDescription) {
      const [user] = await db.select({ bio: usersTable.bio }).from(usersTable).where(eq(usersTable.id, userId)).limit(1)
      if (!user?.bio) {
        await db.update(usersTable).set({ bio: selfDescription }).where(eq(usersTable.id, userId))
      }
    }

    // Mark profile as having questions completed
    await db.update(usersTable).set({ profileComplete: 1 }).where(eq(usersTable.id, userId))

    res.json({ success: true })
  } catch (err) {
    console.error("Profile questions error:", err)
    res.status(500).json({ error: "Failed to save" })
  }
})

// Look up user by username (for /@username routes)
router.get("/by-username/:username", async (req, res) => {
  try {
    const username = req.params.username.replace(/^@/, "").toLowerCase()
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
    }).from(usersTable).where(eq(usersTable.username, username)).limit(1)

    if (!user) { res.status(404).json({ error: "User not found" }); return }
    res.json({ id: user.id, name: user.name, username: user.username })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

export default router
