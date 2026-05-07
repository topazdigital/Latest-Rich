import { Router } from "express"
import { db } from "@workspace/db"
import { likesTable, notificationsTable, usersTable } from "@workspace/db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.post("/", requireAuth, async (req, res) => {
  try {
    const { targetId, superlike } = req.body
    const myId = req.userId!
    if (targetId === myId) { res.status(400).json({ error: "Cannot like yourself" }); return }

    const [existing] = await db.select().from(likesTable)
      .where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId)))
      .limit(1)

    if (existing) {
      await db.delete(likesTable).where(and(eq(likesTable.userId, myId), eq(likesTable.targetId, targetId)))
      res.json({ liked: false })
      return
    }

    await db.insert(likesTable).values({ userId: myId, targetId, superlike: superlike ? 1 : 0, created: now() })

    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, myId)).limit(1)
    const [theyLikedMe] = await db.select().from(likesTable).where(and(eq(likesTable.userId, targetId), eq(likesTable.targetId, myId))).limit(1)
    const isMatch = !!theyLikedMe

    await db.insert(notificationsTable).values({
      userId: targetId,
      fromId: myId,
      type: isMatch ? "match" : (superlike ? "superlike" : "like"),
      message: isMatch
        ? `${me?.name} and you liked each other! It's a match! 💝`
        : superlike
          ? `${me?.name} super liked you! ⭐`
          : `${me?.name} liked you 💝`,
      link: `/profile/${myId}`,
      time: now(),
    })

    if (isMatch) {
      await db.insert(notificationsTable).values({
        userId: myId,
        fromId: targetId,
        type: "match",
        message: `You matched with ${me?.name}! 💝`,
        link: `/profile/${targetId}`,
        time: now(),
      })
    }

    res.json({ liked: true, isMatch })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed" })
  }
})

export default router
