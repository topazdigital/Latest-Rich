import { Router } from "express"
import { db } from "@workspace/db"
import { ordersTable, siteConfigTable, usersTable } from "@workspace/db/schema"
import { eq, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

const DEFAULT_CREDIT_PACKAGES = [
  { id: 1, credits: 100, price: 4.99, popular: 0, description: "Starter Pack", active: 1 },
  { id: 2, credits: 250, price: 9.99, popular: 1, description: "Popular", active: 1 },
  { id: 3, credits: 500, price: 17.99, popular: 0, description: "Value Pack", active: 1 },
  { id: 4, credits: 1000, price: 29.99, popular: 0, description: "Best Value", active: 1 },
]

async function getCreditPackagesFromConfig() {
  try {
    const configs = await db.select().from(siteConfigTable)
    const map = new Map(configs.map(c => [c.key, c.value || ""]))

    const packages = []
    for (let i = 1; i <= 8; i++) {
      const creditsVal = map.get(`credits_pkg_${i}_credits`)
      if (!creditsVal) continue
      packages.push({
        id: i,
        credits: parseInt(creditsVal),
        price: parseFloat(map.get(`credits_pkg_${i}_price`) || "9.99"),
        popular: parseInt(map.get(`credits_pkg_${i}_popular`) || "0"),
        description: String(map.get(`credits_pkg_${i}_description`) || ""),
        active: parseInt(map.get(`credits_pkg_${i}_active`) || "1"),
      })
    }
    return packages.filter(p => p.active === 1).length > 0
      ? packages.filter(p => p.active === 1)
      : DEFAULT_CREDIT_PACKAGES
  } catch {
    return DEFAULT_CREDIT_PACKAGES
  }
}

// Public — no auth needed. Anyone (including the credits page) can fetch packages.
router.get("/packages", async (req, res) => {
  const packages = await getCreditPackagesFromConfig()
  res.json(packages)
})

// Admin: update credit packages
router.put("/packages", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user || (user.admin ?? 0) < 1) { res.status(403).json({ error: "Admin only" }); return }

    const { packages } = req.body
    if (!Array.isArray(packages)) { res.status(400).json({ error: "packages array required" }); return }

    const upsert = async (key: string, value: string) => {
      const [existing] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
      if (existing) {
        await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key))
      } else {
        await db.insert(siteConfigTable).values({ key, value })
      }
    }

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i]
      const idx = i + 1
      await upsert(`credits_pkg_${idx}_credits`, String(p.credits))
      await upsert(`credits_pkg_${idx}_price`, String(p.price))
      await upsert(`credits_pkg_${idx}_popular`, String(p.popular || 0))
      await upsert(`credits_pkg_${idx}_description`, p.description || "")
      await upsert(`credits_pkg_${idx}_active`, String(p.active !== undefined ? p.active : 1))
    }

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
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
