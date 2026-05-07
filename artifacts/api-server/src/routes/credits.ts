import { Router } from "express"
import { db } from "@workspace/db"
import { ordersTable } from "@workspace/db/schema"
import { eq, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

const CREDIT_PACKAGES = [
  { id: 1, credits: 100, price: 4.99, popular: 0, description: "Starter Pack", discount: 0 },
  { id: 2, credits: 250, price: 9.99, popular: 1, description: "Popular", discount: 10 },
  { id: 3, credits: 500, price: 17.99, popular: 0, description: "Value Pack", discount: 20 },
  { id: 4, credits: 1000, price: 29.99, popular: 0, description: "Best Value", discount: 40 },
]

router.get("/packages", requireAuth, async (req, res) => {
  res.json(CREDIT_PACKAGES)
})

router.get("/orders", requireAuth, async (req, res) => {
  try {
    const orders = await db.select().from(ordersTable)
      .where(eq(ordersTable.userId, req.userId!))
      .orderBy(desc(ordersTable.time))
      .limit(20)
    res.json(orders)
  } catch { res.status(500).json([]) }
})

export default router
