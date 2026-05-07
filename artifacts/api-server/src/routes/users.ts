import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, userExtendedTable, photosTable, likesTable } from "@workspace/db/schema"
import { eq, and, ne, desc, sql, like, or } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { hashPassword, verifyPassword } from "../lib/password"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function safeUser(u: any) {
  const { password, ...rest } = u
  return rest
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

router.put("/me", requireAuth, async (req, res) => {
  try {
    const { name, bio, city, country, countryCode, birthday, looking, occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship } = req.body
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
      bio: bio || undefined,
      city: city || undefined,
      country: country || undefined,
      countryCode: countryCode || undefined,
      birthday: birthday || undefined,
      age: birthday ? calcAge(birthday) : undefined,
      looking: looking ? parseInt(looking) : undefined,
    }).where(eq(usersTable.id, req.userId!))

    const [existing] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, req.userId!)).limit(1)
    const extData = { occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship }
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
    if (!user || !(await verifyPassword(current, user.password))) {
      res.status(400).json({ error: "Current password is incorrect" }); return
    }
    if (!newPass || newPass.length < 6) {
      res.status(400).json({ error: "New password too short" }); return
    }
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

    let users = await db.select().from(usersTable)
      .where(and(ne(usersTable.id, req.userId!), eq(usersTable.banned, 0)))
      .orderBy(desc(usersTable.lastAccess))
      .limit(500)

    // Filter
    users = users.filter(u => {
      if (q && !u.name.toLowerCase().includes(q.toLowerCase()) && !u.city?.toLowerCase().includes(q.toLowerCase())) return false
      if (city && !u.city?.toLowerCase().includes(city.toLowerCase())) return false
      if (country && u.country !== country) return false
      if (gender > 0 && u.gender !== gender) return false
      if (u.age < ageMin || u.age > ageMax) return false
      if (onlineOnly && u.online !== 1) return false
      return true
    })

    // Sort: same city first, same country second, then rest
    users.sort((a, b) => {
      const aCity = a.city === myCity ? 0 : a.country === myCountry ? 1 : 2
      const bCity = b.city === myCity ? 0 : b.country === myCountry ? 1 : 2
      return aCity - bCity
    })

    res.json(users.slice(0, 200).map(safeUser))
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/suggested", requireAuth, async (req, res) => {
  try {
    const myUser = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const myCity = myUser[0]?.city || ""
    const myCountry = myUser[0]?.country || ""

    const users = await db.select().from(usersTable)
      .where(and(ne(usersTable.id, req.userId!), eq(usersTable.banned, 0)))
      .orderBy(desc(usersTable.lastAccess))
      .limit(100)

    // Sort by location proximity
    const sorted = users.sort((a, b) => {
      const aScore = a.city === myCity ? 0 : a.country === myCountry ? 1 : 2
      const bScore = b.city === myCity ? 0 : b.country === myCountry ? 1 : 2
      return aScore - bScore
    })

    res.json(sorted.slice(0, 40).map(safeUser))
  } catch {
    res.status(500).json([])
  }
})

router.get("/meet", requireAuth, async (req, res) => {
  try {
    const users = await db.select().from(usersTable)
      .where(and(ne(usersTable.id, req.userId!), eq(usersTable.banned, 0), eq(usersTable.fake, 0)))
      .orderBy(sql`RANDOM()`)
      .limit(50)
    res.json(users.map(safeUser))
  } catch {
    res.status(500).json([])
  }
})

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1)
    if (!user) { res.status(404).json({ error: "Not found" }); return }
    const [extended] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, id)).limit(1)
    res.json({ ...safeUser(user), userExtended: extended || {} })
  } catch {
    res.status(500).json({ error: "Failed" })
  }
})

router.get("/:id/photos", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
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
    const targetId = parseInt(req.params.id)
    const myId = req.userId!
    const [iLiked] = await db.select().from(likesTable).where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId))).limit(1)
    const [theyLiked] = await db.select().from(likesTable).where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId))).limit(1)
    res.json({ hasLiked: !!iLiked, isMatch: !!iLiked && !!theyLiked })
  } catch {
    res.status(500).json({ hasLiked: false, isMatch: false })
  }
})

export default router
