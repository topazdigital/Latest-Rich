import { Router } from "express"
import { db } from "@workspace/db"
import {
  usersTable, ordersTable, notificationsTable, messagesTable,
  activityTable, fakeMessageTemplatesTable, siteConfigTable,
  photosTable, likesTable, reportedUsersTable, autoMessageLogTable
} from "@workspace/db/schema"
import { eq, desc, sql, and, ne, gte, count } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" })
  db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1).then(([user]) => {
    if (!user || user.admin !== 1) return res.status(403).json({ error: "Admin access required" })
    next()
  }).catch(() => res.status(500).json({ error: "Server error" }))
}

// Dashboard stats
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const today = now() - 86400
    const week = now() - 86400 * 7

    const [totalUsers] = await db.select({ count: count() }).from(usersTable)
    const [fakeUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.fake, 1))
    const [newToday] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.created, today))
    const [premiumUsers] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.premium, 1))
    const [onlineUsers] = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.lastAccess as any, String(now() - 300)))
    const totalRevenue = await db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(ordersTable).where(eq(ordersTable.status, "completed"))
    const todayRevenue = await db.select({ sum: sql<number>`COALESCE(SUM(amount), 0)` }).from(ordersTable).where(and(eq(ordersTable.status, "completed"), gte(ordersTable.time, today)))
    const [totalMessages] = await db.select({ count: count() }).from(messagesTable)
    const [totalLikes] = await db.select({ count: count() }).from(likesTable)

    // New users per day (last 7 days)
    const newUsersWeek = await db.select({ count: count() }).from(usersTable).where(gte(usersTable.created, week))

    res.json({
      totalUsers: totalUsers.count,
      fakeUsers: fakeUsers.count,
      realUsers: (totalUsers.count || 0) - (fakeUsers.count || 0),
      newToday: newToday.count,
      premiumUsers: premiumUsers.count,
      onlineUsers: onlineUsers.count,
      totalRevenue: totalRevenue[0]?.sum || 0,
      todayRevenue: todayRevenue[0]?.sum || 0,
      totalMessages: totalMessages.count,
      totalLikes: totalLikes.count,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Users list with search/filter
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(String(req.query.page || "1"))
    const limit = 50
    const offset = (page - 1) * limit
    const search = String(req.query.search || "")
    const filter = String(req.query.filter || "all")

    let q = db.select().from(usersTable)
    if (filter === "fake") q = q.where(eq(usersTable.fake, 1)) as any
    else if (filter === "real") q = q.where(eq(usersTable.fake, 0)) as any
    else if (filter === "premium") q = q.where(eq(usersTable.premium, 1)) as any
    else if (filter === "banned") q = q.where(eq(usersTable.banned, 1)) as any
    else if (filter === "admin") q = q.where(eq(usersTable.admin, 1)) as any

    const users = await (q as any).orderBy(desc(usersTable.id)).limit(limit).offset(offset)
    const [{ count: total }] = await db.select({ count: count() }).from(usersTable)

    res.json({ users: users.map((u: any) => ({ ...u, password: undefined })), total, page, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get single user
router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1)
    if (!user) return res.status(404).json({ error: "User not found" })
    const photos = await db.select().from(photosTable).where(eq(photosTable.userId, user.id))
    res.json({ ...user, password: undefined, photos })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Update user
router.put("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, city, country, bio, credits, premium, premiumExpiry, fake, admin, banned, verified, gender, looking, age } = req.body
    await db.update(usersTable).set({
      name, email, city, country, bio,
      credits: parseInt(credits) || 0,
      premium: parseInt(premium) || 0,
      premiumExpiry: parseInt(premiumExpiry) || 0,
      fake: parseInt(fake) || 0,
      admin: parseInt(admin) || 0,
      banned: parseInt(banned) || 0,
      verified: parseInt(verified) || 0,
      gender: parseInt(gender) || 1,
      looking: parseInt(looking) || 2,
      age: parseInt(age) || 0,
    }).where(eq(usersTable.id, parseInt(req.params.id)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Delete user
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.delete(usersTable).where(eq(usersTable.id, parseInt(req.params.id)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Ban/unban user
router.post("/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1)
    if (!user) return res.status(404).json({ error: "User not found" })
    await db.update(usersTable).set({ banned: user.banned === 1 ? 0 : 1 }).where(eq(usersTable.id, user.id))
    await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: `User ${user.banned === 1 ? "unbanned" : "banned"}`, message: `${user.name} (id: ${user.id})`, time: now() })
    res.json({ banned: user.banned === 1 ? 0 : 1 })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Add credits to user
router.post("/users/:id/credits", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id))).limit(1)
    if (!user) return res.status(404).json({ error: "User not found" })
    await db.update(usersTable).set({ credits: (user.credits || 0) + parseInt(amount) }).where(eq(usersTable.id, user.id))
    res.json({ credits: (user.credits || 0) + parseInt(amount) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Create fake user
router.post("/fake-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, gender, looking, city, country, age, bio, photo, photoThumb } = req.body
    const [user] = await db.insert(usersTable).values({
      name, email: email || `fake_${Date.now()}@rdn.local`,
      password: "fake_user_no_login",
      gender: parseInt(gender) || 2,
      looking: parseInt(looking) || 1,
      city: city || "New York",
      country: country || "United States",
      age: parseInt(age) || 28,
      bio: bio || "",
      photo: photo || "",
      photoThumb: photoThumb || "",
      fake: 1, verified: 1, credits: 2000,
      created: now(), lastAccess: String(now()),
    }).returning()
    await db.insert(activityTable).values({ type: "admin", userId: req.userId, title: "Fake user created", message: `${name} (id: ${user.id})`, time: now() })
    res.json({ user })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get recent activity
router.get("/activity", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filter = String(req.query.filter || "all")
    let q = db.select({
      activity: activityTable,
      user: { id: usersTable.id, name: usersTable.name, photo: usersTable.photo }
    }).from(activityTable).leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
    if (filter !== "all") q = q.where(eq(activityTable.type, filter)) as any
    const rows = await (q as any).orderBy(desc(activityTable.id)).limit(100)
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Log activity helper
router.post("/activity", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { type, title, message } = req.body
    await db.insert(activityTable).values({ type, userId: req.userId, title, message, time: now() })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Site config get/set
router.get("/config", requireAuth, requireAdmin, async (req, res) => {
  try {
    const configs = await db.select().from(siteConfigTable)
    const obj: Record<string, string> = {}
    configs.forEach(c => { obj[c.key] = c.value || "" })
    res.json(obj)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put("/config", requireAuth, requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>
    for (const [key, value] of Object.entries(updates)) {
      await db.insert(siteConfigTable).values({ key, value: String(value) })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: String(value) } })
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Fake message templates
router.get("/fake-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const msgs = await db.select().from(fakeMessageTemplatesTable).orderBy(fakeMessageTemplatesTable.id)
    res.json(msgs)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/fake-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { message } = req.body
    const [msg] = await db.insert(fakeMessageTemplatesTable).values({ message, active: 1 }).returning()
    res.json(msg)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete("/fake-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.delete(fakeMessageTemplatesTable).where(eq(fakeMessageTemplatesTable.id, parseInt(req.params.id)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Orders/revenue
router.get("/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(String(req.query.page || "1"))
    const orders = await db.select({
      order: ordersTable,
      user: { id: usersTable.id, name: usersTable.name, email: usersTable.email }
    }).from(ordersTable).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id))
      .orderBy(desc(ordersTable.id)).limit(50).offset((page - 1) * 50)
    res.json(orders)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Reported users
router.get("/reports", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reports = await db.select().from(reportedUsersTable).orderBy(desc(reportedUsersTable.id)).limit(100)
    res.json(reports)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Trigger auto-messages manually from admin
router.post("/trigger-auto-messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { triggerAutoMessages } = await import("../lib/fake-message-scheduler")
    const count = await triggerAutoMessages()
    res.json({ sent: count })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Import fake users from external data
router.post("/import-fake-users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { users } = req.body as { users: any[] }
    let imported = 0
    for (const u of users.slice(0, 100)) {
      try {
        await db.insert(usersTable).values({
          name: u.name,
          email: `fake_${u.origId || Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`,
          password: "fake_user_no_login",
          gender: u.gender || 2,
          looking: u.looking || 1,
          city: u.city || "",
          country: u.country || "",
          age: u.age || 25,
          bio: u.bio || "",
          photo: u.photo || "",
          photoThumb: u.photoThumb || "",
          fake: 1, verified: 1, credits: 2000,
          created: now(), lastAccess: String(now()),
        }).onConflictDoNothing()
        imported++
      } catch { /* skip duplicates */ }
    }
    res.json({ imported })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
