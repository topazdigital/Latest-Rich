import { Router } from "express"
import { db } from "@workspace/db"
import { messagesTable, usersTable } from "@workspace/db/schema"
import { eq, and, or, desc, ne, sql } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const msgs = await db.select().from(messagesTable)
      .where(or(eq(messagesTable.u1, myId), eq(messagesTable.u2, myId)))
      .orderBy(desc(messagesTable.time))

    const convMap = new Map<number, any>()
    for (const m of msgs) {
      const otherId = m.u1 === myId ? m.u2 : m.u1
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          otherId,
          lastMsg: m.message,
          lastTime: m.time,
          unread: 0,
        })
      }
      if (m.u2 === myId && m.read === 0) {
        convMap.get(otherId).unread++
      }
    }

    const results = []
    for (const [otherId, conv] of convMap) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, otherId)).limit(1)
      if (user) {
        const { password, ...safe } = user
        results.push({ ...conv, ...safe, otherId })
      }
    }
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json([])
  }
})

router.get("/:otherId/messages", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const otherId = parseInt(req.params.otherId)
    const msgs = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.u1, myId), eq(messagesTable.u2, otherId)),
        and(eq(messagesTable.u1, otherId), eq(messagesTable.u2, myId)),
      ))
      .orderBy(messagesTable.time)
    await db.update(messagesTable).set({ read: 1 })
      .where(and(eq(messagesTable.u1, otherId), eq(messagesTable.u2, myId), eq(messagesTable.read, 0)))
    res.json(msgs)
  } catch {
    res.status(500).json([])
  }
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const { toUserId, message } = req.body
    if (!toUserId || !message?.trim()) {
      res.status(400).json({ error: "toUserId and message are required" }); return
    }
    const [msg] = await db.insert(messagesTable).values({
      u1: myId,
      u2: parseInt(toUserId),
      message: message.trim(),
      time: now(),
      read: 0,
    }).returning()
    res.json(msg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to send" })
  }
})

export default router
