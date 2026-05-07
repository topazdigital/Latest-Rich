import { Router } from "express"
import { db } from "@workspace/db"
import {
  usersTable, ordersTable, notificationsTable, messagesTable,
  activityTable, fakeMessageTemplatesTable, siteConfigTable,
  photosTable, likesTable, reportedUsersTable, autoMessageLogTable
} from "@workspace/db/schema"
import { eq, desc, sql, and, ne, gte, count, SQL } from "drizzle-orm"
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

function safeUser(u: typeof usersTable.$inferSelect) {
  const { password, ...rest } = u
  return rest
}

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
      filter === "admin"   ? eq(usersTable.admin, 1)   :
      undefined

    let users = await db.select().from(usersTable)
      .where(filterCondition)
      .orderBy(desc(usersTable.id))
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
    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return }
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
    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
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
    const [user] = await db.insert(usersTable).values({
      name,
      email: `fake_${Date.now()}_${Math.random().toString(36).slice(2)}@rdn.local`,
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
    }).returning()
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

    const rows = await db.select({
      activity: activityTable,
      user: { id: usersTable.id, name: usersTable.name, photo: usersTable.photo }
    })
      .from(activityTable)
      .leftJoin(usersTable, eq(activityTable.userId, usersTable.id))
      .where(filterCondition)
      .orderBy(desc(activityTable.id))
      .limit(100)

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
      await db.insert(siteConfigTable).values({ key, value: String(value) })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: String(value) } })
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
    const [msg] = await db.insert(fakeMessageTemplatesTable).values({ message: message.trim(), active: 1 }).returning()
    res.json(msg)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

router.delete("/fake-messages/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
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
    const id = parseInt(req.params.id)
    const { active } = req.body
    await db.update(fakeMessageTemplatesTable).set({ active: active ? 1 : 0 }).where(eq(fakeMessageTemplatesTable.id, id))
    res.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
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
    const reports = await db.select().from(reportedUsersTable).orderBy(desc(reportedUsersTable.id)).limit(100)
    res.json(reports)
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
        }).onConflictDoNothing()
        imported++
      } catch { /* skip */ }
    }
    res.json({ imported })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    res.status(500).json({ error: msg })
  }
})

// Public config endpoint (no auth required - for frontend to check settings)
router.get("/config/public", async (req, res) => {
  try {
    const rows = await db.select().from(siteConfigTable)
    const publicKeys = ["require_email_verification", "site_name", "site_tagline"]
    const config: Record<string, string> = {}
    for (const row of rows) {
      if (publicKeys.includes(row.key)) config[row.key] = row.value || ""
    }
    res.json(config)
  } catch { res.json({}) }
})

// Test email endpoint
router.post("/test-email", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { to } = req.body
    if (!to) { res.status(400).json({ error: "Recipient email required" }); return }
    const { sendEmail } = await import("../lib/mailer")
    const siteName = (await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "site_name")).limit(1))[0]?.value || "Rich Dating Network"
    const sent = await sendEmail({
      to,
      subject: `Test Email from ${siteName}`,
      html: `
<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
<h2 style="color:#FF192C">✅ Test Email</h2>
<p>This is a test email from <strong>${siteName}</strong>.</p>
<p>If you received this, your SMTP configuration is working correctly!</p>
<p style="color:#aaa;font-size:12px;margin-top:24px">Sent from Admin Panel · ${new Date().toISOString()}</p>
</div>`,
    })
    if (sent) res.json({ success: true, message: "Test email sent successfully" })
    else res.status(500).json({ error: "Failed to send. Check your SMTP settings in the Settings panel." })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to send test email" })
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
