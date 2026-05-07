import { Router } from "express"
import { db } from "@workspace/db"
import { notificationsTable, messagesTable } from "@workspace/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  try {
    const notifs = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.userId!))
      .orderBy(desc(notificationsTable.time))
      .limit(50)
    await db.update(notificationsTable).set({ read: 1 }).where(eq(notificationsTable.userId, req.userId!))
    res.json(notifs)
  } catch { res.status(500).json([]) }
})

router.get("/count", requireAuth, async (req, res) => {
  try {
    const unreadNotifs = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.read, 0)))
    const unreadMsgs = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.u2, req.userId!), eq(messagesTable.read, 0)))
    res.json({ unread: unreadNotifs.length, chatUnread: unreadMsgs.length })
  } catch { res.status(500).json({ unread: 0, chatUnread: 0 }) }
})

export default router
