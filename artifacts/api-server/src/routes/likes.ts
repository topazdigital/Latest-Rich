import { Router } from "express"
import { db } from "@workspace/db"
import { likesTable, notificationsTable, usersTable } from "@workspace/db/schema"
import { eq, and, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function safeUser(u: any) {
  if (!u) return null
  const { password, ...rest } = u
  return rest
}

// GET /api/likes — who liked me, I liked, and mutual matches
router.get("/", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!

    const likedMeRows = await db.select({
      like: likesTable,
      user: usersTable,
    }).from(likesTable)
      .leftJoin(usersTable, eq(likesTable.userId, usersTable.id))
      .where(eq(likesTable.targetId, myId))
      .orderBy(desc(likesTable.created))
      .limit(100)

    const iLikedRows = await db.select({
      like: likesTable,
      user: usersTable,
    }).from(likesTable)
      .leftJoin(usersTable, eq(likesTable.targetId, usersTable.id))
      .where(eq(likesTable.userId, myId))
      .orderBy(desc(likesTable.created))
      .limit(100)

    const likedMeIds = new Set(likedMeRows.map(r => r.like.userId))
    const iLikedIds = new Set(iLikedRows.map(r => r.like.targetId))
    const matchIds = [...likedMeIds].filter(id => iLikedIds.has(id))

    const matches = likedMeRows.filter(r => matchIds.includes(r.like.userId))

    res.json({
      likedMe: likedMeRows.map(r => ({ ...r.like, user: safeUser(r.user) })),
      iLiked: iLikedRows.map(r => ({ ...r.like, user: safeUser(r.user) })),
      matches: matches.map(r => ({ ...r.like, user: safeUser(r.user) })),
    })
  } catch (err: any) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

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
