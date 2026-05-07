import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, ordersTable, siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

const PREMIUM_PACKAGES: Record<number, { days: number; price: number; name: string }> = {
  1: { days: 30, price: 9.99, name: "1 Month Premium" },
  2: { days: 90, price: 24.99, name: "3 Months Premium" },
  3: { days: 180, price: 39.99, name: "6 Months Premium" },
  4: { days: 365, price: 59.99, name: "1 Year Premium" },
}

const CREDIT_PACKAGES: Record<number, { credits: number; price: number; name: string }> = {
  1: { credits: 100, price: 4.99, name: "100 Credits" },
  2: { credits: 250, price: 9.99, name: "250 Credits" },
  3: { credits: 500, price: 17.99, name: "500 Credits" },
  4: { credits: 1000, price: 29.99, name: "1000 Credits" },
}

// Countries that use each provider
const PAYHERO_COUNTRIES = ["KE", "TZ", "UG", "RW", "ET"]
const PAYSTACK_COUNTRIES = ["NG", "GH", "ZA", "EG"]
const PAYMONGO_COUNTRIES = ["PH"]
const STRIPE_COUNTRIES = ["US", "GB", "CA", "AU", "DE", "FR", "NL", "SE", "NO", "DK", "FI", "IT", "ES", "PT", "IE", "BE", "CH", "AT", "NZ", "SG", "JP", "HK", "AE", "SA"]

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

function getProviderForCountry(countryCode: string): string {
  const cc = (countryCode || "").toUpperCase()
  if (PAYHERO_COUNTRIES.includes(cc)) return "payhero"
  if (PAYSTACK_COUNTRIES.includes(cc)) return "paystack"
  if (PAYMONGO_COUNTRIES.includes(cc)) return "paymongo"
  return "stripe"
}

/* ─── GET: Which payment method for this user ─── */
router.get("/method", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const provider = getProviderForCountry(user?.countryCode || "")
  const methods: Record<string, { name: string; icon: string; description: string; currencies: string[] }> = {
    payhero: { name: "M-Pesa", icon: "📱", description: "Pay via M-Pesa mobile money", currencies: ["KES"] },
    paystack: { name: "Card / Bank", icon: "💳", description: "Pay via card or bank transfer", currencies: ["NGN", "GHS", "ZAR"] },
    paymongo: { name: "GCash / Maya", icon: "📲", description: "Pay via GCash or Maya", currencies: ["PHP"] },
    stripe: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa, Mastercard, or Amex", currencies: ["USD", "EUR", "GBP"] },
  }
  res.json({ provider, country: user?.countryCode || "", ...methods[provider] })
})

/* ─── STRIPE ─── */
router.post("/stripe/checkout", requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || await getConfig("stripe_secret_key")
  if (!stripeKey) {
    res.status(400).json({ error: "Stripe is not configured. Ask admin to add Stripe keys in the Admin → Payments panel." })
    return
  }
  try {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeKey)
    const { packageId, type } = req.body
    let lineItem: { name: string; amount: number }
    if (type === "premium") {
      const pkg = PREMIUM_PACKAGES[packageId]
      if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
      lineItem = { name: pkg.name, amount: Math.round(pkg.price * 100) }
    } else {
      const pkg = CREDIT_PACKAGES[packageId]
      if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
      lineItem = { name: pkg.name, amount: Math.round(pkg.price * 100) }
    }
    const baseUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:8080")
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "usd", product_data: { name: lineItem.name }, unit_amount: lineItem.amount }, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${type}?cancelled=1`,
      metadata: { userId: String(req.userId), type, packageId: String(packageId) },
    })
    await db.insert(ordersTable).values({ userId: req.userId!, amount: lineItem.amount / 100, currency: "USD", type, description: lineItem.name, status: "pending", stripeSessionId: session.id, time: now() })
    res.json({ url: session.url })
  } catch (err: any) {
    console.error("Stripe checkout error:", err)
    res.status(500).json({ error: err.message || "Payment failed" })
  }
})

router.get("/stripe/success", async (req, res) => {
  const { session_id } = req.query
  const stripeKey = process.env.STRIPE_SECRET_KEY || await getConfig("stripe_secret_key")
  if (!stripeKey || !session_id) return res.redirect("/credits?error=invalid")
  try {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(String(session_id))
    if (session.payment_status !== "paid") return res.redirect("/credits?error=unpaid")
    const { userId, type, packageId } = session.metadata || {}
    if (!userId || !type || !packageId) return res.redirect("/credits?error=missing_metadata")
    await fulfillOrder(parseInt(userId), type, parseInt(packageId), "USD")
    await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.stripeSessionId, String(session_id)))
    res.redirect(`/credits?success=1`)
  } catch (err) {
    console.error("Stripe success error:", err)
    res.redirect("/credits?error=server")
  }
})

/* ─── PAYHERO (Kenya M-Pesa + East Africa) ─── */
router.post("/payhero/initiate", requireAuth, async (req, res) => {
  const apiUsername = await getConfig("payhero_api_username")
  const apiPassword = await getConfig("payhero_api_password")
  const channelId = await getConfig("payhero_channel_id")

  if (!apiUsername || !apiPassword) {
    res.status(400).json({ error: "M-Pesa payments not configured yet. Contact support." })
    return
  }

  const { phone, packageId, type } = req.body
  if (!phone) { res.status(400).json({ error: "Phone number required (format: 0712345678)" }); return }

  let amount = 0, description = ""
  if (type === "credits") {
    const pkg = CREDIT_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    // Convert USD to KES approximately (rough rate — admin should set exact local prices)
    const kesToUsdRate = Number(await getConfig("kes_rate") || "130")
    amount = Math.round(pkg.price * kesToUsdRate)
    description = pkg.name
  } else {
    const pkg = PREMIUM_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    const kesToUsdRate = Number(await getConfig("kes_rate") || "130")
    amount = Math.round(pkg.price * kesToUsdRate)
    description = pkg.name
  }

  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
  const ref = `RDN-${req.userId}-${Date.now()}`

  try {
    const response = await fetch("https://api.payhero.co.ke/v2/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify({
        amount,
        phone_number: phone,
        channel_id: channelId || 1,
        provider: "m-pesa",
        external_reference: ref,
        callback_url: `${process.env.APP_URL || "https://" + process.env.REPLIT_DEV_DOMAIN}/api/payments/payhero/callback`,
        description,
      }),
    })
    const data = await response.json() as any
    if (!response.ok) {
      res.status(400).json({ error: data.message || "M-Pesa request failed" })
      return
    }
    await db.insert(ordersTable).values({
      userId: req.userId!, amount, currency: "KES", type, description,
      status: "pending", stripeSessionId: ref, credits: type === "credits" ? CREDIT_PACKAGES[packageId]?.credits || 0 : 0, time: now(),
    })
    res.json({ success: true, reference: ref, checkoutRequestId: data.CheckoutRequestID, message: "STK push sent to your phone. Enter your M-Pesa PIN to complete." })
  } catch (err: any) {
    console.error("PayHero error:", err)
    res.status(500).json({ error: "Failed to initiate M-Pesa payment" })
  }
})

router.post("/payhero/callback", async (req, res) => {
  const { external_reference, status, amount } = req.body
  if (status === "SUCCESS" && external_reference) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, external_reference)).limit(1)
    if (order && order.status === "pending") {
      await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.stripeSessionId, external_reference))
      if (order.type === "credits") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
        const pkg = Object.values(CREDIT_PACKAGES).find(p => p.name === order.description)
        if (user && pkg) await db.update(usersTable).set({ credits: (user.credits || 0) + pkg.credits }).where(eq(usersTable.id, order.userId))
      } else if (order.type === "premium") {
        const pkg = Object.values(PREMIUM_PACKAGES).find(p => p.name === order.description)
        if (pkg) await db.update(usersTable).set({ premium: 1, premiumExpiry: now() + pkg.days * 86400 }).where(eq(usersTable.id, order.userId))
      }
    }
  }
  res.json({ success: true })
})

router.get("/payhero/status/:ref", requireAuth, async (req, res) => {
  const apiUsername = await getConfig("payhero_api_username")
  const apiPassword = await getConfig("payhero_api_password")
  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
  try {
    const response = await fetch(`https://api.payhero.co.ke/v2/transaction-status/${req.params.ref}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    const data = await response.json() as Record<string, unknown>
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, req.params.ref as string)).limit(1)
    res.json({ ...data, orderStatus: order?.status || "pending" })
  } catch (err: any) {
    res.status(500).json({ error: "Failed to check status" })
  }
})

/* ─── PAYSTACK (Nigeria, Ghana, South Africa) ─── */
router.post("/paystack/initiate", requireAuth, async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || await getConfig("paystack_secret_key")
  if (!secretKey) {
    res.status(400).json({ error: "Paystack not configured. Contact admin to set Paystack keys." })
    return
  }
  const { packageId, type, email } = req.body
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const userEmail = email || user?.email
  const cc = (user?.countryCode || "").toUpperCase()
  const currency = cc === "GH" ? "GHS" : cc === "ZA" ? "ZAR" : "NGN"
  const rateKey = `${currency.toLowerCase()}_rate`
  const rate = Number(await getConfig(rateKey) || (currency === "NGN" ? "1600" : currency === "GHS" ? "12" : "19"))

  let amount = 0, description = "", credits = 0
  if (type === "credits") {
    const pkg = CREDIT_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * rate * 100) // kobo/pesewas/cents
    description = pkg.name; credits = pkg.credits
  } else {
    const pkg = PREMIUM_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * rate * 100)
    description = pkg.name
  }

  const ref = `RDN-PS-${req.userId}-${Date.now()}`
  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({ email: userEmail, amount, reference: ref, currency, callback_url: `${process.env.APP_URL || "https://" + process.env.REPLIT_DEV_DOMAIN}/api/payments/paystack/verify?ref=${ref}&type=${type}&pkg=${packageId}`, metadata: { userId: req.userId, type, packageId } }),
    })
    const data = await response.json() as any
    if (!data.status) { res.status(400).json({ error: data.message || "Paystack error" }); return }
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, currency, type, description, status: "pending", stripeSessionId: ref, credits, time: now() })
    res.json({ url: data.data.authorization_url, reference: ref })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Paystack error" })
  }
})

router.get("/paystack/verify", async (req, res) => {
  const { ref, type, pkg } = req.query
  const secretKey = process.env.PAYSTACK_SECRET_KEY || await getConfig("paystack_secret_key")
  if (!secretKey || !ref) return res.redirect("/credits?error=invalid")
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${ref}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = await response.json() as any
    if (data.data?.status === "success") {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, String(ref))).limit(1)
      if (order && order.status === "pending") {
        await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.stripeSessionId, String(ref)))
        await fulfillOrder(order.userId, order.type || "credits", parseInt(String(pkg || 0)), order.currency || "USD")
      }
      return res.redirect("/credits?success=1")
    }
    res.redirect("/credits?error=payment_failed")
  } catch { res.redirect("/credits?error=server") }
})

/* ─── PAYMONGO (Philippines - GCash, Maya, Credit Cards) ─── */
router.post("/paymongo/initiate", requireAuth, async (req, res) => {
  const secretKey = process.env.PAYMONGO_SECRET_KEY || await getConfig("paymongo_secret_key")
  if (!secretKey) {
    res.status(400).json({ error: "PayMongo not configured. Contact admin." })
    return
  }
  const { packageId, type, paymentMethod = "gcash" } = req.body
  const phpRate = Number(await getConfig("php_rate") || "56")

  let amount = 0, description = ""
  if (type === "credits") {
    const pkg = CREDIT_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * phpRate * 100) // centavos
    description = pkg.name
  } else {
    const pkg = PREMIUM_PACKAGES[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * phpRate * 100)
    description = pkg.name
  }

  const credentials = Buffer.from(`${secretKey}:`).toString("base64")
  const ref = `RDN-PM-${req.userId}-${Date.now()}`
  const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`

  try {
    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify({
        data: {
          attributes: {
            amount,
            currency: "PHP",
            description,
            payment_method_types: [paymentMethod, "card"],
            success_url: `${baseUrl}/api/payments/paymongo/success?ref=${ref}&type=${type}&pkg=${packageId}`,
            cancel_url: `${baseUrl}/credits?cancelled=1`,
            reference_number: ref,
          },
        },
      }),
    })
    const data = await response.json() as any
    if (data.errors) { res.status(400).json({ error: data.errors[0]?.detail || "PayMongo error" }); return }
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, currency: "PHP", type, description, status: "pending", stripeSessionId: ref, time: now() })
    res.json({ url: data.data?.attributes?.checkout_url, reference: ref })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "PayMongo error" })
  }
})

router.get("/paymongo/success", async (req, res) => {
  const { ref, type, pkg } = req.query
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, String(ref))).limit(1)
  if (order && order.status === "pending") {
    await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.stripeSessionId, String(ref)))
    await fulfillOrder(order.userId, String(type || "credits"), parseInt(String(pkg || 0)), "PHP")
  }
  res.redirect("/credits?success=1")
})

/* ─── Admin: get/set payment config ─── */
router.get("/config", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  if ((user?.admin ?? 0) < 2) { res.status(403).json({ error: "Forbidden" }); return }

  const keys = ["stripe_secret_key", "stripe_publishable_key", "payhero_api_username", "payhero_api_password", "payhero_channel_id", "paystack_secret_key", "paystack_public_key", "paymongo_secret_key", "paymongo_public_key", "kes_rate", "ngn_rate", "ghs_rate", "zar_rate", "php_rate"]
  const rows = await db.select().from(siteConfigTable)
  const config: Record<string, string> = {}
  for (const k of keys) {
    const row = rows.find(r => r.key === k)
    config[k] = row?.value || ""
  }
  // Mask secrets
  for (const k of Object.keys(config)) {
    if (k.includes("secret") || k.includes("password")) {
      config[k] = config[k] ? "••••••••" + config[k].slice(-4) : ""
    }
  }
  res.json(config)
})

router.post("/config", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  if ((user?.admin ?? 0) < 2) { res.status(403).json({ error: "Forbidden" }); return }
  const updates = req.body as Record<string, string>
  for (const [key, value] of Object.entries(updates)) {
    if (!value || value.startsWith("••")) continue // skip masked values
    const existing = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    if (existing.length > 0) {
      await db.update(siteConfigTable).set({ value }).where(eq(siteConfigTable.key, key))
    } else {
      await db.insert(siteConfigTable).values({ key, value })
    }
  }
  res.json({ success: true })
})

/* ─── Shared fulfillment ─── */
async function fulfillOrder(userId: number, type: string, packageId: number, currency: string) {
  if (type === "premium") {
    const pkg = PREMIUM_PACKAGES[packageId]
    if (pkg) await db.update(usersTable).set({ premium: 1, premiumExpiry: now() + pkg.days * 86400 }).where(eq(usersTable.id, userId))
  } else if (type === "credits") {
    const pkg = CREDIT_PACKAGES[packageId]
    if (pkg) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
      if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + pkg.credits }).where(eq(usersTable.id, userId))
    }
  }
}

export default router
