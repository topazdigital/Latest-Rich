import { Router } from "express"
import { db } from "@workspace/db"
import { blockedUsersTable, reportedUsersTable, usersTable } from "@workspace/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Block user
router.post("/block/:id", requireAuth, async (req, res) => {
  try {
    const blockedId = parseInt(req.params.id as string)
    try {
      await db.insert(blockedUsersTable).values({ userId: req.userId!, blockedId, time: now() })
    } catch { /* ignore duplicate */ }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Unblock user
router.delete("/block/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(blockedUsersTable).where(and(eq(blockedUsersTable.userId, req.userId!), eq(blockedUsersTable.blockedId, parseInt(req.params.id as string))))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get blocked list
router.get("/blocked", requireAuth, async (req, res) => {
  try {
    const blocked = await db.select({
      block: blockedUsersTable,
      user: { id: usersTable.id, name: usersTable.name, photo: usersTable.photoThumb }
    }).from(blockedUsersTable)
      .leftJoin(usersTable, eq(blockedUsersTable.blockedId, usersTable.id))
      .where(eq(blockedUsersTable.userId, req.userId!))
      .orderBy(desc(blockedUsersTable.id))
    res.json(blocked)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Report user
router.post("/report/:id", requireAuth, async (req, res) => {
  try {
    const { reason } = req.body
    await db.insert(reportedUsersTable).values({ userId: req.userId!, reportedId: parseInt(req.params.id as string), reason: reason || "inappropriate", time: now() })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
