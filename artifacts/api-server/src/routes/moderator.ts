import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, messagesTable, chatLocksTable, activityTable, pushSubscriptionsTable } from "@workspace/db/schema"
import { eq, sql, and, or, desc, inArray } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }
const LOCK_DURATION = 10 * 60 // 10 minutes

function requireModerator(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" })
  db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1).then(([user]) => {
    if (!user || (user.admin ?? 0) < 1) return res.status(403).json({ error: "Moderator access required" })
    req.moderatorUser = user
    next()
  }).catch(() => res.status(500).json({ error: "Server error" }))
}

function convKey(a: number, b: number): string {
  return `${Math.min(a, b)}_${Math.max(a, b)}`
}

async function cleanExpiredLocks() {
  try {
    await db.delete(chatLocksTable).where(sql`${chatLocksTable.expiresAt} < ${now()}`)
  } catch {}
}

router.get("/me", requireAuth, requireModerator, async (req: any, res) => {
  const { password: _, ...safe } = req.moderatorUser
  res.json(safe)
})

// GET /api/moderator/conversations
router.get("/conversations", requireAuth, requireModerator, async (req, res) => {
  try {
    await cleanExpiredLocks()
    const page = Math.max(1, parseInt(String(req.query.page || "1")))
    const limit = 50
    const offset = (page - 1) * limit

    const rows = (await db.execute(sql`
      WITH pairs AS (
        SELECT
          LEAST(u1, u2) AS uid1,
          GREATEST(u1, u2) AS uid2,
          MAX(id) AS last_msg_id,
          MAX(time) AS last_time,
          COUNT(*) AS msg_count
        FROM messages
        GROUP BY LEAST(u1, u2), GREATEST(u1, u2)
      )
      SELECT
        pairs.uid1, pairs.uid2, pairs.last_time, pairs.msg_count,
        u1t.id AS u1_id, u1t.name AS u1_name, u1t.photo AS u1_photo, u1t.fake AS u1_fake,
        u2t.id AS u2_id, u2t.name AS u2_name, u2t.photo AS u2_photo, u2t.fake AS u2_fake,
        lm.message AS last_message
      FROM pairs
      JOIN users u1t ON u1t.id = pairs.uid1
      JOIN users u2t ON u2t.id = pairs.uid2
      JOIN messages lm ON lm.id = pairs.last_msg_id
      WHERE (u1t.fake = 1 AND u2t.fake = 0) OR (u1t.fake = 0 AND u2t.fake = 1)
      ORDER BY pairs.last_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as unknown) as any[]

    const countResult = ((await db.execute(sql`
      WITH pairs AS (
        SELECT LEAST(u1, u2) AS uid1, GREATEST(u1, u2) AS uid2
        FROM messages
        GROUP BY LEAST(u1, u2), GREATEST(u1, u2)
      )
      SELECT COUNT(*) AS count
      FROM pairs
      JOIN users u1t ON u1t.id = pairs.uid1
      JOIN users u2t ON u2t.id = pairs.uid2
      WHERE (u1t.fake = 1 AND u2t.fake = 0) OR (u1t.fake = 0 AND u2t.fake = 1)
    `)) as unknown) as any[]

    const total = Number((countResult[0] as any)?.count || 0)

    const locks = await db.select().from(chatLocksTable)
    const lockMap = new Map(locks.map(l => [l.conversationKey, l]))

    const lockedByMods = new Map<number, { name: string }>()
    if (locks.length > 0) {
      const modIds = [...new Set(locks.map(l => l.moderatorId))]
      const mods = await db.select({ id: usersTable.id, name: usersTable.name })
        .from(usersTable)
        .where(inArray(usersTable.id, modIds.filter((id): id is number => id !== null && id !== undefined)))
      mods.forEach(m => lockedByMods.set(m.id, { name: m.name }))
    }

    const conversations = (rows as any[]).map(r => {
      const u1Fake = Number(r.u1_fake) === 1
      const fakeUser = u1Fake
        ? { id: Number(r.u1_id), name: r.u1_name, photo: r.u1_photo }
        : { id: Number(r.u2_id), name: r.u2_name, photo: r.u2_photo }
      const realUser = u1Fake
        ? { id: Number(r.u2_id), name: r.u2_name, photo: r.u2_photo }
        : { id: Number(r.u1_id), name: r.u1_name, photo: r.u1_photo }
      const key = convKey(Number(r.uid1), Number(r.uid2))
      const lock = lockMap.get(key)
      return {
        key,
        fakeUser,
        realUser,
        lastMessage: r.last_message || '',
        lastTime: Number(r.last_time) || 0,
        msgCount: Number(r.msg_count) || 0,
        lock: lock ? {
          moderatorId: (lock as any).moderatorId,
          moderatorName: lockedByMods.get((lock as any).moderatorId)?.name || 'Unknown',
          lockedAt: (lock as any).lockedAt || 0,
          expiresAt: (lock as any).expiresAt || 0,
        } : null,
      }
    })

    res.json({ conversations, total, page, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    console.error("Moderator conversations error:", err)
    res.status(500).json({ error: err.message || "Server error" })
  }
})

// POST /api/moderator/conversations/:key/lock
router.post("/conversations/:key/lock", requireAuth, requireModerator, async (req: any, res) => {
  try {
    await cleanExpiredLocks()
    const key = req.params.key
    const existing = await db.select().from(chatLocksTable).where(eq(chatLocksTable.conversationKey, key)).limit(1)
    if (existing.length > 0 && existing[0].moderatorId !== req.userId) {
      res.status(409).json({ error: "Conversation is locked by another moderator" }); return
    }
    const expiresAt = now() + LOCK_DURATION
    await db.insert(chatLocksTable).values({
      conversationKey: key,
      moderatorId: req.userId,
      lockedAt: now(),
      expiresAt,
    }).onDuplicateKeyUpdate({
      set: { moderatorId: req.userId, lockedAt: now(), expiresAt },
    })
    res.json({ success: true, expiresAt })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/moderator/conversations/:key/unlock
router.post("/conversations/:key/unlock", requireAuth, requireModerator, async (req: any, res) => {
  try {
    const key = req.params.key
    const [lock] = await db.select().from(chatLocksTable).where(eq(chatLocksTable.conversationKey, key)).limit(1)
    if (!lock) { res.json({ success: true }); return }
    if (lock.moderatorId !== req.userId && (req.moderatorUser.admin ?? 0) < 2) {
      res.status(403).json({ error: "Cannot unlock another moderator's conversation" }); return
    }
    await db.delete(chatLocksTable).where(eq(chatLocksTable.conversationKey, key))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/moderator/conversations/:key/keepalive
router.post("/conversations/:key/keepalive", requireAuth, requireModerator, async (req: any, res) => {
  try {
    const key = req.params.key
    const [lock] = await db.select().from(chatLocksTable).where(eq(chatLocksTable.conversationKey, key)).limit(1)
    if (!lock || lock.moderatorId !== req.userId) { res.status(403).json({ error: "Not your lock" }); return }
    await db.update(chatLocksTable).set({ expiresAt: now() + LOCK_DURATION }).where(eq(chatLocksTable.conversationKey, key))
    res.json({ success: true, expiresAt: now() + LOCK_DURATION })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/moderator/conversations/:key/messages
router.get("/conversations/:key/messages", requireAuth, requireModerator, async (req, res) => {
  try {
    const parts = (req.params.key as string).split("_")
    if (parts.length !== 2) { res.status(400).json({ error: "Invalid conversation key" }); return }
    const [a, b] = parts.map(Number)
    if (isNaN(a) || isNaN(b)) { res.status(400).json({ error: "Invalid user IDs" }); return }

    const msgs = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.u1, a), eq(messagesTable.u2, b)),
        and(eq(messagesTable.u1, b), eq(messagesTable.u2, a)),
      ))
      .orderBy(messagesTable.time, messagesTable.id)
      .limit(300)

    const users = await db.select({ id: usersTable.id, name: usersTable.name, photo: usersTable.photo, fake: usersTable.fake })
      .from(usersTable)
      .where(sql`${usersTable.id} IN (${a}, ${b})`)

    const userMap: Record<string, any> = {}
    users.forEach(u => { userMap[String(u.id)] = u })

    res.json({ messages: msgs, users: userMap })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/moderator/conversations/:key/reply
router.post("/conversations/:key/reply", requireAuth, requireModerator, async (req: any, res) => {
  try {
    await cleanExpiredLocks()
    const key = req.params.key
    const { message } = req.body
    if (!message?.trim()) { res.status(400).json({ error: "Message is required" }); return }

    const [lock] = await db.select().from(chatLocksTable).where(eq(chatLocksTable.conversationKey, key)).limit(1)
    if (!lock) { res.status(403).json({ error: "Lock this conversation first" }); return }
    if (lock.moderatorId !== req.userId) { res.status(403).json({ error: "Conversation is locked by another moderator" }); return }

    const parts = key.split("_").map(Number)
    if (parts.length !== 2) { res.status(400).json({ error: "Invalid key" }); return }
    const [a, b] = parts

    const users = await db.select().from(usersTable).where(sql`${usersTable.id} IN (${a}, ${b})`)
    const fakeUser = users.find(u => u.fake === 1)
    const realUser = users.find(u => u.fake !== 1)
    if (!fakeUser || !realUser) { res.status(400).json({ error: "Could not identify fake/real users" }); return }

    const msgTime = now()
    await db.insert(messagesTable).values({
      u1: fakeUser.id,
      u2: realUser.id,
      message: message.trim(),
      time: msgTime,
      read: 0,
    })
    const [msg] = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.u1, fakeUser.id), eq(messagesTable.u2, realUser.id), eq(messagesTable.time, msgTime)))
      .orderBy(desc(messagesTable.id))
      .limit(1)

    await db.update(chatLocksTable).set({ expiresAt: now() + LOCK_DURATION }).where(eq(chatLocksTable.conversationKey, key))

    await db.insert(activityTable).values({
      type: "message", userId: req.userId,
      title: `Moderator reply as ${fakeUser.name}`,
      message: `To ${realUser.name}: ${message.trim().slice(0, 100)}`,
      time: now(),
    }).catch(() => {})

    res.json({ message: msg, fakeUser: { id: fakeUser.id, name: fakeUser.name, photo: fakeUser.photo } })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/moderator/push/vapid-key
router.get("/push/vapid-key", requireAuth, requireModerator, async (req, res) => {
  try {
    const { getVapidPublicKey } = await import("../lib/push")
    const key = await getVapidPublicKey()
    if (!key) { res.status(503).json({ error: "Push not configured" }); return }
    res.json({ publicKey: key })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/moderator/push/subscribe
router.post("/push/subscribe", requireAuth, requireModerator, async (req: any, res) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "Invalid subscription object" }); return
    }
    await db.insert(pushSubscriptionsTable).values({
      userId: req.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      createdAt: now(),
    }).onDuplicateKeyUpdate({
      set: { userId: req.userId, p256dh: keys.p256dh, auth: keys.auth, createdAt: now() },
    })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/moderator/push/unsubscribe
router.delete("/push/unsubscribe", requireAuth, requireModerator, async (req: any, res) => {
  try {
    const { endpoint } = req.body
    if (endpoint) {
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint))
    } else {
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, req.userId))
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/moderator/fake-users
router.get("/fake-users", requireAuth, requireModerator, async (req, res) => {
  try {
    const fakeUsers = await db.select({
      id: usersTable.id, name: usersTable.name, photo: usersTable.photo,
      gender: usersTable.gender, age: usersTable.age, city: usersTable.city,
    }).from(usersTable).where(eq(usersTable.fake, 1)).orderBy(usersTable.name).limit(200)
    res.json(fakeUsers)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/moderator/stats
router.get("/stats", requireAuth, requireModerator, async (req, res) => {
  try {
    await cleanExpiredLocks()

    const lockCountResult = ((await db.execute(sql`SELECT COUNT(*) AS count FROM chat_locks`)) as unknown) as any[]
    const activeLocks = Number((lockCountResult[0] as any)?.count || 0)

    const convCountResult = ((await db.execute(sql`
      WITH pairs AS (
        SELECT LEAST(u1, u2) AS uid1, GREATEST(u1, u2) AS uid2
        FROM messages
        GROUP BY LEAST(u1, u2), GREATEST(u1, u2)
      )
      SELECT COUNT(*) AS count
      FROM pairs
      JOIN users u1t ON u1t.id = pairs.uid1
      JOIN users u2t ON u2t.id = pairs.uid2
      WHERE (u1t.fake = 1 AND u2t.fake = 0) OR (u1t.fake = 0 AND u2t.fake = 1)
    `)) as unknown) as any[]
    const totalConversations = Number((convCountResult[0] as any)?.count || 0)

    res.json({ activeLocks, totalConversations })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
