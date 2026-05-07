import { Router } from "express"
import { db } from "@workspace/db"
import { userVisitsTable, usersTable, notificationsTable } from "@workspace/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Record a visit
router.post("/:id", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    if (targetId === req.userId) return res.json({ success: true })

    await db.insert(userVisitsTable).values({ visitorId: req.userId!, targetId, time: now() })

    // Notify target (only if not visited in last hour)
    const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1)
    const [visitor] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (target && visitor && target.fake !== 1) {
      await db.insert(notificationsTable).values({
        userId: targetId, fromId: req.userId, type: "visit",
        message: `${visitor.name} visited your profile`,
        link: `/profile/${req.userId}`, read: 0, time: now()
      }).catch(() => {})
    }
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get visitors list
router.get("/", requireAuth, async (req, res) => {
  try {
    const visits = await db.select({
      visit: userVisitsTable,
      visitor: { id: usersTable.id, name: usersTable.name, photo: usersTable.photoThumb, city: usersTable.city, country: usersTable.country, age: usersTable.age, verified: usersTable.verified, online: usersTable.online }
    }).from(userVisitsTable)
      .leftJoin(usersTable, eq(userVisitsTable.visitorId, usersTable.id))
      .where(eq(userVisitsTable.targetId, req.userId!))
      .orderBy(desc(userVisitsTable.id)).limit(50)
    res.json(visits)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
