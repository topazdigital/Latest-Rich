import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { getPremiumPackages, premiumPackageList, MAX_PREMIUM_PACKAGES } from "../lib/premium-packages"

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

     const usedIds = new Set<number>()
     const normalizedPackages = packages.slice(0, MAX_PREMIUM_PACKAGES).map((raw: any, index: number) => {
       const requestedId = Number(raw?.id)
       const id = Number.isInteger(requestedId) && requestedId >= 1 && requestedId <= MAX_PREMIUM_PACKAGES && !usedIds.has(requestedId)
         ? requestedId
         : (() => {
             let next = index + 1
             while (usedIds.has(next) && next <= MAX_PREMIUM_PACKAGES) next++
             return next
           })()
       usedIds.add(id)
       return { ...raw, id }
     })

     for (const p of normalizedPackages) {
       const idx = p.id
       const name = String(p.name || "").trim()
       const days = Math.max(1, parseInt(String(p.days), 10) || 1)
       const price = Math.max(0, parseFloat(String(p.price)) || 0)
       const priority = Math.max(1, parseInt(String(p.priority), 10) || idx)
      const upsert = async (key: string, value: string) => {
        const [existing] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
        if (existing) {
          await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key))
        } else {
          await db.insert(siteConfigTable).values({ key, value })
        }
      }
       await upsert(`premium_pkg_${idx}_name`, name)
       await upsert(`premium_pkg_${idx}_days`, String(days))
       await upsert(`premium_pkg_${idx}_price`, String(price))
      await upsert(`premium_pkg_${idx}_popular`, String(p.popular || 0))
      await upsert(`premium_pkg_${idx}_description`, p.description || "")
       await upsert(`premium_pkg_${idx}_active`, String(name ? (p.active !== undefined ? p.active : 1) : 0))
       await upsert(`premium_pkg_${idx}_priority`, String(priority))
     }

     // Clear removed plans so an old slot cannot reappear after an admin
     // deletes it in the settings screen.
     for (let idx = 1; idx <= MAX_PREMIUM_PACKAGES; idx++) {
       if (usedIds.has(idx)) continue
       const [existing] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, `premium_pkg_${idx}_name`)).limit(1)
       if (!existing) continue
       const upsert = async (key: string, value: string) => {
         await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key))
       }
       await upsert(`premium_pkg_${idx}_name`, "")
       await upsert(`premium_pkg_${idx}_active`, "0")
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
