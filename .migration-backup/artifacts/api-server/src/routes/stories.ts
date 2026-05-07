import { Router } from "express"
import { db } from "@workspace/db"
import { storiesTable, usersTable } from "@workspace/db/schema"
import { eq, gt } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.get("/", requireAuth, async (req, res) => {
  try {
    const stories = await db.select().from(storiesTable).where(gt(storiesTable.expires, now()))
    const enriched = await Promise.all(stories.map(async (s) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, s.userId)).limit(1)
      const { password, ...safe } = user || {}
      return { ...s, user: safe }
    }))
    res.json(enriched)
  } catch { res.status(500).json([]) }
})

export default router
