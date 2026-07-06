import { Router } from "express"
import { db } from "@workspace/db"
import { pushSubscriptionsTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

// GET /api/push/vapid-key — returns the VAPID public key so the frontend can subscribe
router.get("/vapid-key", requireAuth, async (_req, res) => {
  try {
    const { getVapidPublicKey } = await import("../lib/push")
    const key = await getVapidPublicKey()
    if (!key) return res.status(503).json({ error: "Push not configured" })
    res.json({ publicKey: key })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/push/subscribe — register the browser push subscription for the logged-in user
router.post("/subscribe", requireAuth, async (req: any, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" })
  }
  try {
    const existing = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint)).limit(1)
    if (existing.length === 0) {
      await db.insert(pushSubscriptionsTable).values({
        userId: req.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      })
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/push/unsubscribe — remove push subscription
router.delete("/unsubscribe", requireAuth, async (req: any, res) => {
  const { endpoint } = req.body
  try {
    if (endpoint) {
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint))
    } else {
      await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, req.userId))
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
