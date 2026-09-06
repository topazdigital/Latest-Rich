import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { getPremiumPackages, premiumPackageList } from "../lib/premium-packages"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.get("/packages", requireAuth, async (req, res) => {
  const packages = await getPremiumPackages()
  res.json(premiumPackageList(packages))
})

// Admin: update premium packages
router.put("/packages", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user || (user.admin ?? 0) < 1) { res.status(403).json({ error: "Admin only" }); return }

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
      await upsert(`premium_pkg_${idx}_priority`, String(Math.max(1, parseInt(p.priority) || idx)))
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
    await db.update(usersTable).set({ premium: 1, premiumExpiry: expiry, premiumPriority: 1 }).where(eq(usersTable.id, parseInt(userId)))
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

    await db.update(usersTable).set({ premium: 0, premiumExpiry: 0, premiumPriority: 0 }).where(eq(usersTable.id, parseInt(userId)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
