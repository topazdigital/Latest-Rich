import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Default packages fallback
const DEFAULT_PACKAGES = [
  { id: 1, name: "1 Month", days: 30, price: 9.99, popular: 0, description: "Flexible monthly plan", active: 1 },
  { id: 2, name: "3 Months", days: 90, price: 24.99, popular: 1, description: "Save 17%", active: 1 },
  { id: 3, name: "6 Months", days: 180, price: 39.99, popular: 0, description: "Save 33%", active: 1 },
  { id: 4, name: "1 Year", days: 365, price: 59.99, popular: 0, description: "Best value — Save 50%", active: 1 },
]

async function getPackagesFromConfig(): Promise<typeof DEFAULT_PACKAGES> {
  try {
    const configs = await db.select().from(siteConfigTable)
    const map = new Map(configs.map(c => [c.key, c.value || ""]))

    const packages = []
    for (let i = 1; i <= 6; i++) {
      const name = map.get(`premium_pkg_${i}_name`)
      if (!name) continue
      packages.push({
        id: i,
        name: String(name),
        days: parseInt(map.get(`premium_pkg_${i}_days`) || "30"),
        price: parseFloat(map.get(`premium_pkg_${i}_price`) || "9.99"),
        popular: parseInt(map.get(`premium_pkg_${i}_popular`) || "0"),
        description: String(map.get(`premium_pkg_${i}_description`) || ""),
        active: parseInt(map.get(`premium_pkg_${i}_active`) || "1"),
      })
    }
    return packages.filter(p => p.active === 1).length > 0
      ? packages.filter(p => p.active === 1)
      : DEFAULT_PACKAGES
  } catch {
    return DEFAULT_PACKAGES
  }
}

router.get("/packages", requireAuth, async (req, res) => {
  const packages = await getPackagesFromConfig()
  res.json(packages)
})

// Admin: update premium packages
router.put("/packages", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user || user.admin !== 1) { res.status(403).json({ error: "Admin only" }); return }

    const { packages } = req.body
    if (!Array.isArray(packages)) { res.status(400).json({ error: "packages array required" }); return }

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i]
      const idx = i + 1
      const upsert = async (key: string, value: string) => {
        const [existing] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
        if (existing) {
          await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key))
        } else {
          await db.insert(siteConfigTable).values({ key, value })
        }
      }
      await upsert(`premium_pkg_${idx}_name`, p.name)
      await upsert(`premium_pkg_${idx}_days`, String(p.days))
      await upsert(`premium_pkg_${idx}_price`, String(p.price))
      await upsert(`premium_pkg_${idx}_popular`, String(p.popular || 0))
      await upsert(`premium_pkg_${idx}_description`, p.description || "")
      await upsert(`premium_pkg_${idx}_active`, String(p.active !== undefined ? p.active : 1))
    }

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: manually grant premium to user
router.post("/grant", requireAuth, async (req, res) => {
  try {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!admin || admin.admin !== 1) { res.status(403).json({ error: "Admin only" }); return }

    const { userId, days } = req.body
    if (!userId || !days) { res.status(400).json({ error: "userId and days required" }); return }

    const expiry = now() + (parseInt(days) * 86400)
    await db.update(usersTable).set({ premium: 1, premiumExpiry: expiry }).where(eq(usersTable.id, parseInt(userId)))
    res.json({ success: true, expiresAt: new Date(expiry * 1000).toISOString() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Admin: revoke premium
router.post("/revoke", requireAuth, async (req, res) => {
  try {
    const [admin] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!admin || admin.admin !== 1) { res.status(403).json({ error: "Admin only" }); return }

    const { userId } = req.body
    if (!userId) { res.status(400).json({ error: "userId required" }); return }

    await db.update(usersTable).set({ premium: 0, premiumExpiry: 0 }).where(eq(usersTable.id, parseInt(userId)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
