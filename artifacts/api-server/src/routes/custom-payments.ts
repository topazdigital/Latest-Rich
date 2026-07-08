import { Router } from "express"
import { db, isMysql } from "@workspace/db"
import { customPaymentsTable, customPaymentOrdersTable, usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Seed a default M-Pesa Till manual-payment fallback if it doesn't exist yet.
// This gives users a way to pay when the automated M-Pesa STK push has trouble.
const DEFAULT_MPESA_TILL_GATEWAY_NAME = "M-Pesa Till (Manual)"
async function seedDefaultGateways() {
  const values = {
    name: DEFAULT_MPESA_TILL_GATEWAY_NAME,
    logo: "📱",
    description: "Having trouble with the STK push? Go to M-Pesa > Lipa na M-Pesa > Buy Goods and Services, enter Till Number 9867233, then pay the exact amount shown. Submit the M-Pesa confirmation message or transaction code below as proof.",
    status: 1,
    reviewTime: 24,
    externalUrl: "",
    country: "",
    type: 3,
    proofLabel: "M-Pesa Transaction Code (e.g. QFT1XXXXXX)",
    createdAt: now(),
  }
  try {
    if (isMysql) {
      // MySQL/MariaDB: rely on the unique index on `name` (see migrate-from-legacy.sql)
      // and INSERT IGNORE so concurrent autoscale instances can't create duplicates.
      await db.execute(sql`
        INSERT IGNORE INTO custom_payments
          (name, logo, description, status, review_time, external_url, country, type, proof_label, created_at)
        VALUES (${values.name}, ${values.logo}, ${values.description}, ${values.status}, ${values.reviewTime},
                ${values.externalUrl}, ${values.country}, ${values.type}, ${values.proofLabel}, ${values.createdAt})
      `)
    } else {
      await db.insert(customPaymentsTable).values(values).onConflictDoNothing({ target: customPaymentsTable.name })
    }
  } catch (err) {
    // Non-fatal: worst case the fallback gateway doesn't exist yet and can be added via the admin panel.
    console.error("seedDefaultGateways failed:", err)
  }
}

seedDefaultGateways().catch(console.error)

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" })
  const [u] = await db.select({ admin: usersTable.admin }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)
  if (!u || (u.admin ?? 0) < 2) return res.status(403).json({ error: "Admin required" })
  next()
}

const CREDIT_PACKAGES: Record<number, { credits: number; price: number; name: string }> = {
  1: { credits: 100, price: 4.99, name: "100 Credits" },
  2: { credits: 250, price: 9.99, name: "250 Credits" },
  3: { credits: 500, price: 17.99, name: "500 Credits" },
  4: { credits: 1000, price: 29.99, name: "1000 Credits" },
}

const PREMIUM_PACKAGES: Record<number, { days: number; price: number; name: string }> = {
  1: { days: 30, price: 9.99, name: "1 Month Premium" },
  2: { days: 90, price: 24.99, name: "3 Months Premium" },
  3: { days: 180, price: 39.99, name: "6 Months Premium" },
  4: { days: 365, price: 59.99, name: "1 Year Premium" },
}

/* ─── Public: get gateways for user's country ─── */
router.get("/gateways", requireAuth, async (req, res) => {
  try {
    const [user] = await db.select({ countryCode: usersTable.countryCode }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const cc = (user?.countryCode || "").toUpperCase()
    const all = await db.select().from(customPaymentsTable).where(eq(customPaymentsTable.status, 1))
    const gateways = all.filter(g => {
      if (!g.country) return true
      const countries = g.country.split(",").map((c: string) => c.trim().toUpperCase())
      return countries.includes(cc) || countries.includes("ALL")
    })
    res.json(gateways)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── User: submit manual payment ─── */
router.post("/submit", requireAuth, async (req, res) => {
  try {
    const { gatewayId, type, packageId, proof, currency, amount } = req.body
    if (!gatewayId || !proof) { res.status(400).json({ error: "Gateway and proof required" }); return }

    const [gw] = await db.select().from(customPaymentsTable).where(eq(customPaymentsTable.id, parseInt(gatewayId))).limit(1)
    if (!gw || gw.status !== 1) { res.status(400).json({ error: "Invalid gateway" }); return }

    // type: 1 = Credits Only, 2 = Premium Only, 3 = Credits & Premium
    const gwType = gw.type ?? 1
    if ((type === "credits" && gwType === 2) || (type === "premium" && gwType === 1)) {
      res.status(400).json({ error: "This payment method does not support that purchase type" }); return
    }

    let pkg: { name: string; price: number } | undefined
    let credits = 0
    let premiumDays = 0

    if (type === "credits") {
      const cp = CREDIT_PACKAGES[packageId]
      if (!cp) { res.status(400).json({ error: "Invalid package" }); return }
      pkg = cp; credits = cp.credits
    } else {
      const pp = PREMIUM_PACKAGES[packageId]
      if (!pp) { res.status(400).json({ error: "Invalid package" }); return }
      pkg = pp; premiumDays = pp.days
    }

    const orderTime = now()
    await db.insert(customPaymentOrdersTable).values({
      userId: req.userId!,
      gatewayId: parseInt(gatewayId),
      type,
      packageId: parseInt(packageId),
      amount: amount || pkg.price,
      currency: currency || "USD",
      proof,
      status: "pending",
      time: orderTime,
    })
    const [order] = await db.select().from(customPaymentOrdersTable)
      .where(and(eq(customPaymentOrdersTable.userId, req.userId!), eq(customPaymentOrdersTable.time, orderTime)))
      .orderBy(desc(customPaymentOrdersTable.id))
      .limit(1)

    res.json({ success: true, orderId: order.id, reviewTime: gw.reviewTime })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── User: my custom payment orders ─── */
router.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const orders = await db.select({
      order: customPaymentOrdersTable,
      gateway: { name: customPaymentsTable.name, logo: customPaymentsTable.logo },
    }).from(customPaymentOrdersTable)
      .leftJoin(customPaymentsTable, eq(customPaymentOrdersTable.gatewayId, customPaymentsTable.id))
      .where(eq(customPaymentOrdersTable.userId, req.userId!))
      .orderBy(desc(customPaymentOrdersTable.id))
      .limit(20)
    res.json(orders)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: list all custom gateways ─── */
router.get("/admin/gateways", requireAuth, requireAdmin, async (req, res) => {
  try {
    const gateways = await db.select().from(customPaymentsTable).orderBy(desc(customPaymentsTable.id))
    res.json(gateways)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: create gateway ─── */
router.post("/admin/gateways", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, logo, description, status, reviewTime, externalUrl, country, type, proofLabel } = req.body
    if (!name) { res.status(400).json({ error: "Name required" }); return }
    const gwCreatedAt = now()
    await db.insert(customPaymentsTable).values({
      name, logo: logo || "", description: description || "",
      status: parseInt(status ?? 1), reviewTime: parseInt(reviewTime ?? 24),
      externalUrl: externalUrl || "", country: country || "",
      type: parseInt(type ?? 1),
      proofLabel: proofLabel || "Transaction ID / Screenshot",
      createdAt: gwCreatedAt,
    })
    const [gw] = await db.select().from(customPaymentsTable)
      .where(eq(customPaymentsTable.name, name))
      .orderBy(desc(customPaymentsTable.id))
      .limit(1)
    res.json(gw)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: update gateway ─── */
router.put("/admin/gateways/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { name, logo, description, status, reviewTime, externalUrl, country, type, proofLabel } = req.body
    await db.update(customPaymentsTable).set({
      name, logo, description,
      status: parseInt(status ?? 1),
      reviewTime: parseInt(reviewTime ?? 24),
      externalUrl, country,
      type: parseInt(type ?? 1),
      proofLabel,
    }).where(eq(customPaymentsTable.id, id))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: delete gateway ─── */
router.delete("/admin/gateways/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.delete(customPaymentsTable).where(eq(customPaymentsTable.id, parseInt(req.params.id as string)))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: list pending custom payment orders ─── */
router.get("/admin/orders", requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || "pending")
    const orders = await db.select({
      order: customPaymentOrdersTable,
      user: { id: usersTable.id, name: usersTable.name, email: usersTable.email },
      gateway: { name: customPaymentsTable.name, logo: customPaymentsTable.logo },
    }).from(customPaymentOrdersTable)
      .leftJoin(usersTable, eq(customPaymentOrdersTable.userId, usersTable.id))
      .leftJoin(customPaymentsTable, eq(customPaymentOrdersTable.gatewayId, customPaymentsTable.id))
      .where(status !== "all" ? eq(customPaymentOrdersTable.status, status) : undefined)
      .orderBy(desc(customPaymentOrdersTable.id))
      .limit(100)
    res.json(orders)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/* ─── Admin: approve / reject order ─── */
router.post("/admin/orders/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { note } = req.body
    const [order] = await db.select().from(customPaymentOrdersTable).where(eq(customPaymentOrdersTable.id, id)).limit(1)
    if (!order) { res.status(404).json({ error: "Order not found" }); return }
    if (order.status !== "pending") { res.status(400).json({ error: "Order already processed" }); return }

    await db.update(customPaymentOrdersTable).set({
      status: "completed", reviewedBy: req.userId!, reviewNote: note || "", reviewedAt: now(),
    }).where(eq(customPaymentOrdersTable.id, id))

    if (order.type === "credits") {
      const pkg = CREDIT_PACKAGES[order.packageId ?? 0]
      if (pkg) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
        if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + pkg.credits }).where(eq(usersTable.id, order.userId))
      }
    } else if (order.type === "premium") {
      const pkg = PREMIUM_PACKAGES[order.packageId ?? 0]
      if (pkg) await db.update(usersTable).set({ premium: 1, premiumExpiry: now() + pkg.days * 86400 }).where(eq(usersTable.id, order.userId))
    }

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post("/admin/orders/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const { note } = req.body
    await db.update(customPaymentOrdersTable).set({
      status: "rejected", reviewedBy: req.userId!, reviewNote: note || "", reviewedAt: now(),
    }).where(eq(customPaymentOrdersTable.id, id))
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
