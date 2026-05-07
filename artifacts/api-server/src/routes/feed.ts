import { Router } from "express"
import { db } from "@workspace/db"
import { feedTable, feedLikesTable, usersTable } from "@workspace/db/schema"
import { eq, desc, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.get("/", requireAuth, async (req, res) => {
  try {
    const posts = await db.select().from(feedTable).orderBy(desc(feedTable.time)).limit(50)
    const enriched = await Promise.all(posts.map(async (p) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1)
      const { password, ...safeUser } = user || {}
      return { ...p, user: safeUser, _count: { likes: p.likesCount, comments: p.commentsCount } }
    }))
    res.json(enriched)
  } catch { res.status(500).json([]) }
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const { content, photo } = req.body
    if (!content?.trim()) { res.status(400).json({ error: "Content required" }); return }
    const [post] = await db.insert(feedTable).values({
      userId: req.userId!,
      content: content.trim(),
      photo: photo || "",
      time: now(),
    }).returning()
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const { password, ...safeUser } = user || {}
    res.json({ post: { ...post, user: safeUser, _count: { likes: 0, comments: 0 } } })
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.post("/:id/like", requireAuth, async (req, res) => {
  try {
    const feedId = parseInt(req.params.id)
    const userId = req.userId!
    const [existing] = await db.select().from(feedLikesTable).where(and(eq(feedLikesTable.feedId, feedId), eq(feedLikesTable.userId, userId))).limit(1)
    if (existing) {
      await db.delete(feedLikesTable).where(and(eq(feedLikesTable.feedId, feedId), eq(feedLikesTable.userId, userId)))
      await db.update(feedTable).set({ likesCount: Math.max(0, (await db.select().from(feedTable).where(eq(feedTable.id, feedId)).limit(1))[0]?.likesCount - 1 || 0) }).where(eq(feedTable.id, feedId))
      res.json({ liked: false })
    } else {
      await db.insert(feedLikesTable).values({ feedId, userId })
      await db.update(feedTable).set({ likesCount: ((await db.select().from(feedTable).where(eq(feedTable.id, feedId)).limit(1))[0]?.likesCount || 0) + 1 }).where(eq(feedTable.id, feedId))
      res.json({ liked: true })
    }
  } catch { res.status(500).json({ error: "Failed" }) }
})

export default router
