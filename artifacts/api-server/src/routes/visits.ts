import { Router } from "express"
import { db } from "@workspace/db"
import { userVisitsTable, usersTable, notificationsTable } from "@workspace/db/schema"
import { eq, desc, and, gte } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { send } from "../lib/websocket"
import { sendVisitEmail } from "../lib/mailer"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Record a visit
router.post("/:id", requireAuth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id as string)
    if (targetId === req.userId) { res.json({ success: true }); return }

    // Only record one visit per hour per visitor
    const oneHourAgo = now() - 3600
    const [recentVisit] = await db.select().from(userVisitsTable)
      .where(and(
        eq(userVisitsTable.visitorId, req.userId!),
        eq(userVisitsTable.targetId, targetId),
        gte(userVisitsTable.time, oneHourAgo)
      )).limit(1)

    if (!recentVisit) {
      await db.insert(userVisitsTable).values({ visitorId: req.userId!, targetId, time: now() })

      const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId)).limit(1)
      const [visitor] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)

      if (target && visitor && target.fake !== 1) {
        // Create notification
        await db.insert(notificationsTable).values({
          userId: targetId, fromId: req.userId, type: "visit",
          message: `${visitor.name} visited your profile`,
          link: `/profile/${req.userId}`, read: 0, time: now()
        }).catch(() => {})

        // Real-time WS notification to target
        send(targetId, {
          type: "profile_viewed",
          visitor: {
            id: visitor.id,
            name: visitor.name,
            photo: visitor.photoThumb || visitor.photo,
            age: visitor.age,
            city: visitor.city,
          },
          time: now(),
        })

        // Email notification (fire-and-forget)
        if (target.email) {
          const siteUrl = process.env.SITE_URL || "https://richdatingnetwork.com"
          sendVisitEmail(target.email, target.name, visitor.name, `/profile/${visitor.id}`, siteUrl).catch(() => {})
        }
      }
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
      visitor: {
        id: usersTable.id, name: usersTable.name, photo: usersTable.photoThumb,
        city: usersTable.city, country: usersTable.country, age: usersTable.age,
        verified: usersTable.verified, online: usersTable.online, premium: usersTable.premium,
      }
    }).from(userVisitsTable)
      .leftJoin(usersTable, eq(userVisitsTable.visitorId, usersTable.id))
      .where(eq(userVisitsTable.targetId, req.userId!))
      .orderBy(desc(userVisitsTable.id)).limit(100)
    res.json(visits)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
