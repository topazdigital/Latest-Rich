import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, ordersTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { getPremiumPackage, getPremiumPackages } from "../lib/premium-packages"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Fallback credit packages used only when DB config is unavailable
const DEFAULT_CREDIT_PACKAGES: Record<number, { credits: number; price: number; name: string }> = {
  1: { credits: 100, price: 4.99, name: "100 Credits" },
  2: { credits: 250, price: 9.99, name: "250 Credits" },
  3: { credits: 500, price: 17.99, name: "500 Credits" },
  4: { credits: 1000, price: 29.99, name: "1000 Credits" },
}

// Load credit packages from admin-configured DB values (same logic as credits.ts)
async function getCreditPackages(): Promise<Record<number, { credits: number; price: number; name: string }>> {
  try {
    const configs = await db.select().from(siteConfigTable)
    const map = new Map<string, string>(
      configs.map(c => [c.key, String(c.value ?? "")] as [string, string])
    )
    const result: Record<number, { credits: number; price: number; name: string }> = {}
    for (let i = 1; i <= 8; i++) {
      const creditsVal = map.get(`credits_pkg_${i}_credits`)
      if (!creditsVal) continue
      const credits = parseInt(creditsVal, 10)
      const price = parseFloat(map.get(`credits_pkg_${i}_price`) ?? "9.99")
      const active = parseInt(map.get(`credits_pkg_${i}_active`) ?? "1", 10)
      if (active === 0) continue
      result[i] = { credits, price, name: `${credits} Credits` }
    }
    return Object.keys(result).length > 0 ? result : DEFAULT_CREDIT_PACKAGES
  } catch {
    return DEFAULT_CREDIT_PACKAGES
  }
}

// Countries that use each provider
const PAYHERO_COUNTRIES = ["KE", "TZ", "UG", "RW", "ET"]
const PAYSTACK_COUNTRIES = ["NG", "GH", "ZA", "EG"]
const PAYMONGO_COUNTRIES = ["PH"]
const STRIPE_COUNTRIES = ["US", "GB", "CA", "AU", "DE", "FR", "NL", "SE", "NO", "DK", "FI", "IT", "ES", "PT", "IE", "BE", "CH", "AT", "NZ", "SG", "JP", "HK", "AE", "SA"]

// Fallback: full country name → ISO code (for legacy users with empty countryCode)
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "kenya": "KE", "tanzania": "TZ", "uganda": "UG", "rwanda": "RW", "ethiopia": "ET",
  "nigeria": "NG", "ghana": "GH", "south africa": "ZA", "egypt": "EG",
  "philippines": "PH",
  "united states": "US", "usa": "US", "united kingdom": "GB", "uk": "GB",
  "canada": "CA", "australia": "AU", "germany": "DE", "france": "FR",
  "netherlands": "NL", "sweden": "SE", "norway": "NO", "denmark": "DK",
  "finland": "FI", "italy": "IT", "spain": "ES", "portugal": "PT",
  "ireland": "IE", "belgium": "BE", "switzerland": "CH", "austria": "AT",
  "new zealand": "NZ", "singapore": "SG", "japan": "JP", "hong kong": "HK",
  "uae": "AE", "united arab emirates": "AE", "saudi arabia": "SA",
  "zambia": "ZM", "zimbabwe": "ZW", "malawi": "MW", "mozambique": "MZ",
}

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

function resolveCountryCode(countryCode: string | null | undefined, countryName: string | null | undefined): string {
  // Use the stored ISO code first (the clean path)
  const cc = (countryCode || "").trim().toUpperCase()
  if (cc.length >= 2) return cc
  // Fall back to mapping from the full country name (legacy users)
  const name = (countryName || "").trim().toLowerCase()
  return (COUNTRY_NAME_TO_CODE[name] || "").toUpperCase()
}

function getProviderForCountry(countryCode: string): string {
  const cc = (countryCode || "").toUpperCase()
  if (PAYHERO_COUNTRIES.includes(cc)) return "payhero"
  if (PAYSTACK_COUNTRIES.includes(cc)) return "paystack"
  if (PAYMONGO_COUNTRIES.includes(cc)) return "paymongo"
  return "paystack"
}

/* ─── GET: Which payment method for this user ─── */
router.get("/method", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const resolvedCode = resolveCountryCode(user?.countryCode, user?.country)
  const provider = getProviderForCountry(resolvedCode)
  const methods: Record<string, { name: string; icon: string; description: string; currencies: string[] }> = {
    payhero: { name: "M-Pesa", icon: "📱", description: "Pay via M-Pesa mobile money", currencies: ["KES"] },
    paystack: { name: "Card / Bank", icon: "💳", description: "Pay via card or bank transfer", currencies: ["NGN", "GHS", "ZAR"] },
    paymongo: { name: "GCash / Maya", icon: "📲", description: "Pay via GCash or Maya", currencies: ["PHP"] },
    stripe: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa, Mastercard, or Amex", currencies: ["USD", "EUR", "GBP"] },
    flutterwave: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa, Mastercard, or Amex", currencies: ["USD", "EUR", "GBP", "KES", "NGN"] },
    paddle: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa, Mastercard, Amex, Apple Pay or Google Pay", currencies: ["USD", "EUR", "GBP"] },
    intasend: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa or Mastercard (IntaSend)", currencies: ["USD", "EUR", "GBP", "KES"] },
    pesapal: { name: "Credit / Debit Card", icon: "💳", description: "Pay securely with Visa or Mastercard (Pesapal)", currencies: ["USD", "EUR", "GBP", "KES"] },
  }
  const localRateDefaults: Record<string, number> = {
    KES: 130, TZS: 2500, UGX: 3700, RWF: 1300, NGN: 1600, GHS: 12, ZAR: 19, PHP: 56,
  }
  const providerCurrency: Record<string, string> = {
    payhero: "KES", paymongo: "PHP", paystack: resolvedCode === "NG" ? "NGN" : resolvedCode === "GH" ? "GHS" : resolvedCode === "ZA" ? "ZAR" : "USD",
  }
  const currency = providerCurrency[provider] || "USD"
  const configuredRate = Number(await getConfig(`${currency.toLowerCase()}_rate`))
  const rate = Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : localRateDefaults[currency] || 1
  res.json({ provider, country: resolvedCode, currency, rate, ...methods[provider] })
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
      const pkg = await getPremiumPackage(packageId)
      if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
      lineItem = { name: pkg.name, amount: Math.round(pkg.price * 100) }
    } else {
      const creditPkgs = await getCreditPackages()
      const pkg = creditPkgs[packageId]
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
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({ userId: req.userId!, amount: lineItem.amount / 100, amountUsd: lineItem.amount / 100, currency: "USD", type, description: lineItem.name, status: "pending", stripeSessionId: session.id, packageId: type === "premium" ? parseInt(String(packageId)) || 0 : 0, premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0, time: now() })
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
    if (!userId || !type) return res.redirect("/credits?error=missing_metadata")
    // Guard: only fulfill once — prevent double credits if user refreshes the success page
    const [existingOrder] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, String(session_id))).limit(1)
    if (!existingOrder || existingOrder.status === "pending") {
      if (type === "starter") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(userId))).limit(1)
        if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + 3 }).where(eq(usersTable.id, user.id))
       } else if (type !== "event") {
         if (type === "premium" && existingOrder) {
           await fulfillOrderFromRecord(existingOrder)
         } else {
           await fulfillOrder(parseInt(userId), type, parseInt(packageId || "0"), "USD")
         }
      }
      await db.update(ordersTable).set({ status: "completed" }).where(eq(ordersTable.stripeSessionId, String(session_id)))
    }
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

  const creditPkgs = await getCreditPackages()
  let amount = 0, description = "", creditsToAward = 0
  if (type === "starter") {
    const kesToUsdRate = Number(await getConfig("kes_rate") || "130")
    amount = Math.round(1 * kesToUsdRate) // $1 trial
    description = "3 Credits Trial"
    creditsToAward = 3
  } else if (type === "credits") {
    const pkg = creditPkgs[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    const kesToUsdRate = Number(await getConfig("kes_rate") || "130")
    amount = Math.round(pkg.price * kesToUsdRate)
    description = pkg.name
    creditsToAward = pkg.credits
  } else {
    const pkg = await getPremiumPackage(packageId)
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    const kesToUsdRate = Number(await getConfig("kes_rate") || "130")
    amount = Math.round(pkg.price * kesToUsdRate)
    description = pkg.name
  }

  // Determine callback URL — APP_URL env var must be set in production (.env or ecosystem.config.cjs)
  const appUrl = process.env.APP_URL
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "")
    || await getConfig("app_url")
    || "https://richdatingnetwork.com"

  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
  const ref = `RDN-${req.userId}-${Date.now()}`

  try {
    const payload = {
      amount,
      phone_number: phone,
      channel_id: parseInt(channelId) || 1,
      provider: "m-pesa",
      external_reference: ref,
      callback_url: `${appUrl}/api/payments/payhero/callback`,
      description,
    }
    const response = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify(payload),
    })
    const data = await response.json() as any
    console.log("[PayHero] status:", response.status, "body:", JSON.stringify(data))
    if (!response.ok) {
      const errMsg = data?.message || data?.error || data?.detail || data?.errors
        || (response.status === 401 ? "Invalid API credentials — check your API username and password in Admin → Payment Providers" : "M-Pesa request failed")
      res.status(400).json({ error: errMsg, payhero_status: response.status, payhero_body: data })
      return
    }
    const kesRateNum = Number(await getConfig("kes_rate") || "130")
    const kesAmountUsd = (Number.isFinite(kesRateNum) && kesRateNum > 0) ? parseFloat((amount / kesRateNum).toFixed(2)) : 0
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({
      userId: req.userId!, amount, amountUsd: kesAmountUsd,
      currency: "KES", type, description, packageId: type === "premium" ? parseInt(String(packageId)) || 0 : 0,
      premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0,
      status: "pending", stripeSessionId: ref, credits: creditsToAward, time: now(),
    })
    res.json({ success: true, reference: ref, checkoutRequestId: data.CheckoutRequestID, message: "STK push sent to your phone. Enter your M-Pesa PIN to complete." })
  } catch (err: any) {
    console.error("PayHero error:", err)
    res.status(500).json({ error: "Failed to initiate M-Pesa payment" })
  }
})

router.post("/payhero/test-credentials", requireAuth, async (req, res) => {
  const apiUsername = await getConfig("payhero_api_username")
  const apiPassword = await getConfig("payhero_api_password")
  if (!apiUsername || !apiPassword) {
    res.status(400).json({ ok: false, error: "No PayHero credentials saved yet. Enter API Username and Password above, then save." })
    return
  }
  const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
  try {
    const response = await fetch("https://backend.payhero.co.ke/api/v2/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
      body: JSON.stringify({ amount: 1, phone_number: "0700000000", channel_id: 1, provider: "m-pesa", external_reference: "TEST-CRED-CHECK", callback_url: "https://example.com", description: "credential test" }),
    })
    const data = await response.json() as any
    console.log("[PayHero test-credentials] status:", response.status, "body:", JSON.stringify(data))
    if (response.status === 401) {
      res.status(400).json({ ok: false, error: "401 Unauthorized — wrong API username or password", detail: data?.message || data?.error || JSON.stringify(data) })
      return
    }
    if (response.status === 403) {
      res.status(400).json({ ok: false, error: "403 Forbidden — credentials are valid but account may be restricted", detail: data?.message || JSON.stringify(data) })
      return
    }
    if (response.status === 422 || response.status === 400) {
      res.json({ ok: true, detail: `Credentials accepted (HTTP ${response.status} = validation error on test data, not auth)` })
      return
    }
    if (!response.ok) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from PayHero`, detail: data?.message || data?.error || JSON.stringify(data) })
      return
    }
    res.json({ ok: true, detail: `Credentials accepted (HTTP ${response.status})` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching PayHero — check server internet access", detail: err?.message })
  }
})

/* ─── STRIPE test credentials ─── */
router.post("/stripe/test-credentials", requireAuth, async (req, res) => {
  const secretKey = process.env.STRIPE_SECRET_KEY || await getConfig("stripe_secret_key")
  if (!secretKey) {
    res.status(400).json({ ok: false, error: "No Stripe secret key saved yet. Enter it above and save first." })
    return
  }
  try {
    const response = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = await response.json() as any
    if (response.status === 401) {
      res.status(400).json({ ok: false, error: "401 Unauthorized — invalid Stripe secret key", detail: data?.error?.message })
      return
    }
    if (!response.ok) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from Stripe`, detail: data?.error?.message || JSON.stringify(data) })
      return
    }
    const available = data.available?.map((b: any) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(", ") || "–"
    res.json({ ok: true, detail: `Stripe account active. Available balance: ${available}` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching Stripe", detail: err?.message })
  }
})

/* ─── PAYSTACK test credentials ─── */
router.post("/paystack/test-credentials", requireAuth, async (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY || await getConfig("paystack_secret_key")
  if (!secretKey) {
    res.status(400).json({ ok: false, error: "No Paystack secret key saved yet. Enter it above and save first." })
    return
  }
  try {
    const response = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = await response.json() as any
    if (response.status === 401) {
      res.status(400).json({ ok: false, error: "401 Unauthorized — invalid Paystack secret key", detail: data?.message })
      return
    }
    if (!response.ok) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from Paystack`, detail: data?.message || JSON.stringify(data) })
      return
    }
    const balances = (data.data || []).map((b: any) => `${(b.balance / 100).toFixed(2)} ${b.currency}`).join(", ") || "–"
    res.json({ ok: true, detail: `Paystack account active. Balance: ${balances}` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching Paystack", detail: err?.message })
  }
})

/* ─── PAYMONGO test credentials ─── */
router.post("/paymongo/test-credentials", requireAuth, async (req, res) => {
  const secretKey = process.env.PAYMONGO_SECRET_KEY || await getConfig("paymongo_secret_key")
  if (!secretKey) {
    res.status(400).json({ ok: false, error: "No PayMongo secret key saved yet. Enter it above and save first." })
    return
  }
  try {
    const credentials = Buffer.from(`${secretKey}:`).toString("base64")
    const response = await fetch("https://api.paymongo.com/v1/payment_methods?type=gcash", {
      headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    })
    const data = await response.json() as any
    if (response.status === 401) {
      res.status(400).json({ ok: false, error: "401 Unauthorized — invalid PayMongo secret key", detail: data?.errors?.[0]?.detail })
      return
    }
    if (!response.ok && response.status !== 404) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from PayMongo`, detail: data?.errors?.[0]?.detail || JSON.stringify(data) })
      return
    }
    res.json({ ok: true, detail: "PayMongo credentials accepted — account is active" })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching PayMongo", detail: err?.message })
  }
})

router.post("/payhero/callback", async (req, res) => {
  const { external_reference, status } = req.body
  if (status === "SUCCESS" && external_reference) {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, external_reference)).limit(1)
    if (order && order.status === "pending") {
      // Atomically mark as completed first — this prevents double-credit if status poll
      // also fires at the same time. Only ONE request will update a "pending" row.
      await db.update(ordersTable)
        .set({ status: "completed" })
        .where(and(eq(ordersTable.stripeSessionId, external_reference), eq(ordersTable.status, "pending")))
      // Re-fetch to confirm WE were the one that changed it (not a concurrent request)
      const [confirmed] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, external_reference)).limit(1)
      if (confirmed?.status !== "completed") {
        res.json({ success: true }); return
      }
      if (order.type === "starter") {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
        if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + 3 }).where(eq(usersTable.id, order.userId))
      } else if (order.type === "credits") {
        const parsedFromDesc = order.description ? parseInt((order.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
        const creditsToAdd = (order.credits && order.credits > 0) ? order.credits : parsedFromDesc
        if (creditsToAdd > 0) {
          const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
          if (user) {
            await db.update(usersTable).set({ credits: (user.credits || 0) + creditsToAdd }).where(eq(usersTable.id, order.userId))
            await db.update(ordersTable).set({ credits: creditsToAdd }).where(eq(ordersTable.stripeSessionId, external_reference))
          }
        }
      } else if (order.type === "premium") {
        const pkg = Object.values(await getPremiumPackages()).find(p => p.name === order.description || `${p.name} Premium` === order.description)
        if (order.premiumDays || pkg) await activatePremium(order.userId, { days: order.premiumDays || pkg!.days, priority: order.premiumPriority || pkg!.priority })
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
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, req.params.ref as string)).limit(1)

    // If our DB already shows completed (callback already fired), return immediately
    if (order?.status === "completed") {
      res.json({ orderStatus: "completed", finalStatus: "completed" })
      return
    }

    const response = await fetch(`https://backend.payhero.co.ke/api/v2/transaction-status/${req.params.ref}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    const data = await response.json() as Record<string, unknown>

    const phStatus = String(data.status || "").toUpperCase()
    const resultCode = data.ResultCode ?? data.resultCode ?? null

    // Belt-and-suspenders: PayHero says SUCCESS but callback hasn't fired yet — fulfill now.
    // Re-fetch order AFTER the PayHero API call — the callback may have fired during the
    // 200-500ms we spent waiting for PayHero to respond (this was the Shivona double-credit bug).
    if ((phStatus === "SUCCESS" || resultCode === 0) && order) {
      const [freshOrder] = await db.select().from(ordersTable)
        .where(eq(ordersTable.stripeSessionId, req.params.ref as string)).limit(1)
      if (!freshOrder || freshOrder.status !== "pending") {
        // Already completed by the callback — just report success, do NOT credit again
        res.json({ ...data, orderStatus: "completed", finalStatus: "completed" })
        return
      }
      // Atomically mark as completed (guard against concurrent callback)
      await db.update(ordersTable)
        .set({ status: "completed" })
        .where(and(eq(ordersTable.stripeSessionId, req.params.ref as string), eq(ordersTable.status, "pending")))
      if (freshOrder.type === "starter") {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, freshOrder.userId)).limit(1)
        if (u) await db.update(usersTable).set({ credits: (u.credits || 0) + 3 }).where(eq(usersTable.id, freshOrder.userId))
      } else if (freshOrder.type === "credits") {
        const parsedFromDesc = freshOrder.description ? parseInt((freshOrder.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
        const creditsToAdd = (freshOrder.credits && freshOrder.credits > 0) ? freshOrder.credits : parsedFromDesc
        if (creditsToAdd > 0) {
          const [u] = await db.select().from(usersTable).where(eq(usersTable.id, freshOrder.userId)).limit(1)
          if (u) {
            await db.update(usersTable).set({ credits: (u.credits || 0) + creditsToAdd }).where(eq(usersTable.id, freshOrder.userId))
            await db.update(ordersTable).set({ credits: creditsToAdd }).where(eq(ordersTable.stripeSessionId, req.params.ref as string))
          }
        }
      } else if (freshOrder.type === "premium") {
         const pkg = Object.values(await getPremiumPackages()).find(p => p.name === freshOrder.description || `${p.name} Premium` === freshOrder.description)
         if (freshOrder.premiumDays || pkg) await activatePremium(freshOrder.userId, { days: freshOrder.premiumDays || pkg!.days, priority: freshOrder.premiumPriority || pkg!.priority })
      }
      res.json({ ...data, orderStatus: "completed", finalStatus: "completed" })
      return
    }

    // Determine final outcome for non-success states
    let finalStatus = "pending"
    if (phStatus === "FAILED" || phStatus === "CANCELLED" || phStatus === "TIMEOUT") {
      // ResultCode 1032 = user cancelled/ignored the STK push
      finalStatus = (resultCode === 1032 || resultCode === "1032") ? "cancelled" : "failed"
      // CRITICAL: Mark the order as failed/cancelled in DB immediately so the payment
      // reconciler never auto-credits it later. Without this, cancelled STK push orders
      // stay "pending" and the reconciler grants free credits after 15 minutes.
      if (order && order.status === "pending") {
        await db.update(ordersTable)
          .set({ status: finalStatus })
          .where(and(eq(ordersTable.stripeSessionId, req.params.ref as string), eq(ordersTable.status, "pending")))
      }
    }

    res.json({ ...data, orderStatus: order?.status || "pending", finalStatus })
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
  // Paystack supported currencies: NGN (Nigeria), GHS (Ghana), ZAR (South Africa), USD (everyone else)
  const currency = cc === "NG" ? "NGN" : cc === "GH" ? "GHS" : cc === "ZA" ? "ZAR" : "USD"
  let rate: number
  if (currency === "USD") {
    rate = 1 // USD amounts are already in dollars; multiply by 100 for cents
  } else {
    const rateKey = `${currency.toLowerCase()}_rate`
    rate = Number(await getConfig(rateKey) || (currency === "NGN" ? "1600" : currency === "GHS" ? "12" : "19"))
  }

  const creditPkgsPaystack = await getCreditPackages()
  let amount = 0, description = "", credits = 0
  if (type === "starter") {
    amount = Math.round(1 * rate * 100) // $1 trial
    description = "3 Credits Trial"
    credits = 3
  } else if (type === "credits") {
    const pkg = creditPkgsPaystack[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * rate * 100) // kobo/pesewas/cents (USD: cents)
    description = pkg.name; credits = pkg.credits
  } else {
    const pkg = await getPremiumPackage(packageId)
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * rate * 100)
    description = pkg.name
  }

  const ref = `RDN-PS-${req.userId}-${Date.now()}`
  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({ email: userEmail, amount, reference: ref, currency, callback_url: `${process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? "https://" + process.env.REPLIT_DEV_DOMAIN : "https://richdatingnetwork.com")}/api/payments/paystack/verify?ref=${ref}&type=${type}&pkg=${packageId}`, metadata: { userId: req.userId, type, packageId } }),
    })
    const data = await response.json() as any
    if (!data.status) { res.status(400).json({ error: data.message || "Paystack error" }); return }
    const amountUsdPaystack = currency === "USD"
      ? parseFloat((amount / 100).toFixed(2))
      : (Number.isFinite(rate) && rate > 0) ? parseFloat((amount / 100 / rate).toFixed(2)) : 0
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, amountUsd: amountUsdPaystack, currency, type, description, status: "pending", stripeSessionId: ref, credits, packageId: type === "premium" ? parseInt(String(packageId)) || 0 : 0, premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0, time: now() })
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
         if (order.type === "premium") {
           await fulfillOrderFromRecord(order)
         } else {
           await fulfillOrder(order.userId, order.type || "credits", parseInt(String(pkg || 0)), order.currency || "USD")
         }
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

  const creditPkgsPaymongo = await getCreditPackages()
  let amount = 0, description = ""
  if (type === "starter") {
    amount = Math.round(1 * phpRate * 100) // $1 trial → centavos
    description = "3 Credits Trial"
  } else if (type === "credits") {
    const pkg = creditPkgsPaymongo[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * phpRate * 100) // centavos
    description = pkg.name
  } else {
    const pkg = await getPremiumPackage(packageId)
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
    const phpAmountUsd = (Number.isFinite(phpRate) && phpRate > 0) ? parseFloat((amount / 100 / phpRate).toFixed(2)) : 0
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, amountUsd: phpAmountUsd, currency: "PHP", type, description, status: "pending", stripeSessionId: ref, packageId: type === "premium" ? parseInt(String(packageId)) || 0 : 0, premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0, time: now() })
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

/* ─── INTASEND (International Visa/Mastercard — default for all other countries) ─── */
router.post("/intasend/checkout", requireAuth, async (req, res) => {
  const secretKey = process.env.INTASEND_SECRET_KEY || await getConfig("intasend_secret_key")
  const publishableKey = process.env.INTASEND_PUBLISHABLE_KEY || await getConfig("intasend_publishable_key")
  if (!secretKey || !publishableKey) {
    res.status(400).json({ error: "Card payments not configured yet. Contact support." })
    return
  }
  const { packageId, type } = req.body
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const creditPkgs = await getCreditPackages()
  let amount = 0, description = "", credits = 0
  if (type === "starter") {
    amount = 1; description = "3 Credits Trial"; credits = 3
  } else if (type === "credits") {
    const pkg = creditPkgs[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = pkg.price; description = pkg.name; credits = pkg.credits
  } else if (type === "premium") {
    const pkg = await getPremiumPackage(packageId)
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = pkg.price; description = pkg.name
  }
  const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://richdatingnetwork.com")
  const ref = `RDN-IS-${req.userId}-${Date.now()}`
  const isLive = secretKey.startsWith("ISSecretKey_live") || (!secretKey.includes("test") && !secretKey.includes("sandbox"))
  const baseUrl = isLive ? "https://payment.intasend.com" : "https://sandbox.intasend.com"
  try {
    const nameParts = (user?.name || "User").trim().split(" ")
    const response = await fetch(`${baseUrl}/api/v1/checkout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secretKey}` },
      body: JSON.stringify({
        public_key: publishableKey,
        first_name: nameParts[0] || "User",
        last_name: nameParts.slice(1).join(" ") || ".",
        email: user?.email || "",
        amount,
        currency: "USD",
        api_ref: ref,
        // Success redirect goes to frontend — webhook handles actual fulfillment
        redirect_url: `${appUrl}/${type === "premium" ? "premium" : "credits"}?pending=1`,
        comment: description,
      }),
    })
    const data = await response.json() as any
    if (!response.ok || data.error) {
      const msg = data.error || data.detail || `IntaSend error (${response.status})`
      res.status(400).json({ error: msg }); return
    }
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({
      userId: req.userId!, amount, amountUsd: amount, currency: "USD", type, description,
      status: "pending", stripeSessionId: ref, credits, packageId: parseInt(packageId) || 0,
      premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0, time: now(),
    })
    res.json({ url: data.url })
  } catch (err: any) {
    console.error("IntaSend checkout error:", err)
    res.status(500).json({ error: "Payment failed. Please try again." })
  }
})

// IntaSend redirects user here after payment — fulfillment is handled ONLY by webhook.
// This route just sends them back to the app with a "processing" notice.
router.get("/intasend/success", (_req, res) => {
  res.redirect("/credits?pending=1")
})

router.post("/intasend/webhook", async (req, res) => {
  try {
    const { invoice } = req.body || {}
    const state = String(invoice?.state || "").toUpperCase()
    const ref = String(invoice?.api_ref || "")
    // Only act on COMPLETE state with a valid ref
    if (state === "COMPLETE" && ref.startsWith("RDN-IS-")) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
      if (order && order.status === "pending") {
        // Atomic: only the request that actually changes status from pending → completed fulfills
        await db.update(ordersTable).set({ status: "completed" })
          .where(and(eq(ordersTable.stripeSessionId, ref), eq(ordersTable.status, "pending")))
        const [confirmed] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
        if (confirmed?.status === "completed") {
          await fulfillOrderFromRecord(order)
        }
      }
    }
  } catch (err) { console.error("IntaSend webhook error:", err) }
  res.json({ ok: true })
})

router.post("/intasend/test-credentials", requireAuth, async (req, res) => {
  const secretKey = process.env.INTASEND_SECRET_KEY || await getConfig("intasend_secret_key")
  if (!secretKey) {
    res.status(400).json({ ok: false, error: "No IntaSend secret key saved yet. Enter it above and save first." })
    return
  }
  const isLive = secretKey.startsWith("ISSecretKey_live") || (!secretKey.includes("test") && !secretKey.includes("sandbox"))
  const baseUrl = isLive ? "https://payment.intasend.com" : "https://sandbox.intasend.com"
  try {
    const response = await fetch(`${baseUrl}/api/v1/wallets/`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
    const data = await response.json() as any
    if (response.status === 401 || response.status === 403) {
      res.status(400).json({ ok: false, error: "Invalid API key — check your IntaSend secret key", detail: data?.detail || data?.error })
      return
    }
    if (!response.ok) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from IntaSend`, detail: data?.detail || JSON.stringify(data).slice(0, 120) })
      return
    }
    const mode = isLive ? "Live" : "Sandbox"
    res.json({ ok: true, detail: `IntaSend ${mode} API key is valid ✓` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching IntaSend", detail: err?.message })
  }
})

/* ─── PESAPAL (International Visa/Mastercard — default for all other countries) ─── */

// Cache Pesapal auth token in-process (expires after ~5 minutes in sandbox, longer in live)
let pesapalToken: { token: string; expiresAt: number } | null = null

async function getPesapalToken(consumerKey: string, consumerSecret: string, isLive: boolean): Promise<string> {
  const now = Date.now()
  if (pesapalToken && pesapalToken.expiresAt > now + 60_000) return pesapalToken.token
  const base = isLive ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3"
  const res = await fetch(`${base}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  })
  const data = await res.json() as any
  if (!res.ok || !data.token) throw new Error(data.message || `Pesapal auth failed (${res.status})`)
  pesapalToken = { token: data.token, expiresAt: now + 4 * 60 * 1000 }
  return data.token
}

async function getPesapalIpnId(token: string, appUrl: string, isLive: boolean): Promise<string> {
  // Return cached IPN id if we have one stored
  const stored = await getConfig("pesapal_ipn_id")
  if (stored) return stored
  const base = isLive ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3"
  const res = await fetch(`${base}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: `${appUrl}/api/payments/pesapal/webhook`, ipn_notification_type: "POST" }),
  })
  const data = await res.json() as any
  if (!res.ok || !data.ipn_id) throw new Error(data.message || "Pesapal IPN registration failed")
  // Persist so we don't re-register every request
  const existing = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "pesapal_ipn_id")).limit(1)
  if (existing.length) await db.update(siteConfigTable).set({ value: data.ipn_id }).where(eq(siteConfigTable.key, "pesapal_ipn_id"))
  else await db.insert(siteConfigTable).values({ key: "pesapal_ipn_id", value: data.ipn_id })
  return data.ipn_id
}

router.post("/pesapal/checkout", requireAuth, async (req, res) => {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY || await getConfig("pesapal_consumer_key")
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || await getConfig("pesapal_consumer_secret")
  if (!consumerKey || !consumerSecret) {
    res.status(400).json({ error: "Card payments not configured yet. Contact support." })
    return
  }
  const { packageId, type } = req.body
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const creditPkgs = await getCreditPackages()
  let amount = 0, description = "", credits = 0
  if (type === "starter") {
    amount = 1; description = "3 Credits Trial"; credits = 3
  } else if (type === "credits") {
    const pkg = creditPkgs[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = pkg.price; description = pkg.name; credits = pkg.credits
  } else if (type === "premium") {
    const pkg = await getPremiumPackage(packageId)
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = pkg.price; description = pkg.name
  }
  const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://richdatingnetwork.com")
  const isLive = !consumerKey.includes("test") && !consumerKey.includes("sandbox") && consumerKey.length > 10
  const base = isLive ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3"
  const ref = `RDN-PP-${req.userId}-${Date.now()}`
  try {
    const token = await getPesapalToken(consumerKey, consumerSecret, isLive)
    const ipnId = await getPesapalIpnId(token, appUrl, isLive)
    const nameParts = (user?.name || "User").trim().split(" ")
    const response = await fetch(`${base}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: ref,
        currency: "USD",
        amount,
        description,
        callback_url: `${appUrl}/api/payments/pesapal/success?ref=${ref}&type=${type}&pkg=${packageId}`,
        notification_id: ipnId,
        billing_address: {
          email_address: user?.email || "",
          first_name: nameParts[0] || "User",
          last_name: nameParts.slice(1).join(" ") || ".",
        },
      }),
    })
    const data = await response.json() as any
    if (!response.ok || data.error) {
      res.status(400).json({ error: data.message || data.error || `Pesapal error (${response.status})` }); return
    }
    const selectedPremium = type === "premium" ? await getPremiumPackage(parseInt(String(packageId)) || 0) : undefined
    await db.insert(ordersTable).values({
      userId: req.userId!, amount, amountUsd: amount, currency: "USD", type, description,
      status: "pending", stripeSessionId: ref, credits, packageId: type === "premium" ? parseInt(String(packageId)) || 0 : 0,
      premiumDays: selectedPremium?.days || 0, premiumPriority: selectedPremium?.priority || 0, time: now(),
    })
    res.json({ url: data.redirect_url })
  } catch (err: any) {
    console.error("Pesapal checkout error:", err)
    res.status(500).json({ error: err.message || "Payment failed. Please try again." })
  }
})

router.get("/pesapal/success", async (req, res) => {
  const { ref, type, pkg, OrderTrackingId } = req.query
  if (!ref) return res.redirect("/credits?error=invalid")
  try {
    // If Pesapal reports the transaction as completed, fulfill immediately
    const consumerKey = process.env.PESAPAL_CONSUMER_KEY || await getConfig("pesapal_consumer_key")
    const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || await getConfig("pesapal_consumer_secret")
    if (consumerKey && consumerSecret && OrderTrackingId) {
      const isLive = !consumerKey.includes("test") && !consumerKey.includes("sandbox") && consumerKey.length > 10
      const base = isLive ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3"
      try {
        const token = await getPesapalToken(consumerKey, consumerSecret, isLive)
        const statusRes = await fetch(`${base}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        })
        const statusData = await statusRes.json() as any
        const paid = statusData.payment_status_description === "Completed"
        if (paid) {
          const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, String(ref))).limit(1)
          if (order && order.status === "pending") {
            await db.update(ordersTable).set({ status: "completed", stripeSessionId: String(ref) })
              .where(and(eq(ordersTable.stripeSessionId, String(ref)), eq(ordersTable.status, "pending")))
            await fulfillOrder(order.userId, String(type || "credits"), parseInt(String(pkg || "0")), "USD")
          }
        }
      } catch (e) { console.error("Pesapal status check error:", e) }
    }
    res.redirect(`/${type === "premium" ? "premium" : "credits"}?success=1`)
  } catch (err) {
    console.error("Pesapal success error:", err)
    res.redirect("/credits?error=server")
  }
})

router.post("/pesapal/webhook", async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.body || {}
    if (OrderNotificationType === "IPNCHANGE" && OrderMerchantReference) {
      const ref = String(OrderMerchantReference)
      const consumerKey = process.env.PESAPAL_CONSUMER_KEY || await getConfig("pesapal_consumer_key")
      const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || await getConfig("pesapal_consumer_secret")
      if (consumerKey && consumerSecret && OrderTrackingId) {
        const isLive = !consumerKey.includes("test") && !consumerKey.includes("sandbox") && consumerKey.length > 10
        const base = isLive ? "https://pay.pesapal.com/v3" : "https://cybqa.pesapal.com/pesapalv3"
        const token = await getPesapalToken(consumerKey, consumerSecret, isLive)
        const statusRes = await fetch(`${base}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`, {
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        })
        const statusData = await statusRes.json() as any
        const paid = statusData.payment_status_description === "Completed"
        if (paid) {
          const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
          if (order && order.status === "pending") {
            await db.update(ordersTable).set({ status: "completed" })
              .where(and(eq(ordersTable.stripeSessionId, ref), eq(ordersTable.status, "pending")))
            const [confirmed] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
            if (confirmed?.status === "completed") {
              await fulfillOrder(order.userId, order.type || "credits", 0, "USD")
              if (order.type === "credits" && order.credits && order.credits > 0) {
                const [u] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
                if (u) await db.update(usersTable).set({ credits: (u.credits || 0) + order.credits }).where(eq(usersTable.id, order.userId))
              }
            }
          }
        }
      }
    }
  } catch (err) { console.error("Pesapal webhook error:", err) }
  res.json({ orderNotificationType: req.body?.OrderNotificationType, orderTrackingId: req.body?.OrderTrackingId, orderMerchantReference: req.body?.OrderMerchantReference, status: "200" })
})

router.post("/pesapal/test-credentials", requireAuth, async (req, res) => {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY || await getConfig("pesapal_consumer_key")
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET || await getConfig("pesapal_consumer_secret")
  if (!consumerKey || !consumerSecret) {
    res.status(400).json({ ok: false, error: "No Pesapal credentials saved yet. Enter Consumer Key and Secret above, then save." })
    return
  }
  const isLive = !consumerKey.includes("test") && !consumerKey.includes("sandbox") && consumerKey.length > 10
  try {
    pesapalToken = null // force fresh token
    const token = await getPesapalToken(consumerKey, consumerSecret, isLive)
    const mode = isLive ? "Live" : "Sandbox"
    res.json({ ok: true, detail: `Pesapal ${mode} credentials valid ✓` })
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message || "Pesapal authentication failed" })
  }
})

/* ─── PADDLE (kept for reference — domain was rejected for adult/dating content) ─── */
router.post("/paddle/checkout", requireAuth, async (req, res) => {
  const apiKey = process.env.PADDLE_API_KEY || await getConfig("paddle_api_key")
  if (!apiKey) {
    res.status(400).json({ error: "Card payments not configured yet. Contact support." })
    return
  }
  const { packageId, type } = req.body
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  const creditPkgs = await getCreditPackages()
  let amount = 0, description = "", credits = 0
  if (type === "credits") {
    const pkg = creditPkgs[packageId]
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * 100)
    description = pkg.name
    credits = pkg.credits
  } else if (type === "premium") {
    const pkg = await getPremiumPackage(packageId)
    if (!pkg) { res.status(400).json({ error: "Invalid package" }); return }
    amount = Math.round(pkg.price * 100)
    description = pkg.name
  }
  const appUrl = process.env.APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://richdatingnetwork.com")
  const ref = `RDN-PDL-${req.userId}-${Date.now()}`
  const isPaddleSandbox = apiKey.startsWith("pdl_test") || apiKey.includes("_test_")
  const paddleBase = isPaddleSandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com"
  try {
    const response = await fetch(`${paddleBase}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        items: [{
          quantity: 1,
          price: {
            description,
            product: { name: "Rich Dating Network", tax_category: "standard" },
            unit_price: { amount: String(amount), currency_code: "USD" },
            tax_mode: "inclusive",
          }
        }],
        checkout: { url: `${appUrl}/${type === "premium" ? "premium" : "credits"}?success=1` },
        custom_data: { ref, userId: String(req.userId), type, packageId: String(packageId) },
      })
    })
    const data = await response.json() as any
    if (!response.ok || data.error) {
      const msg = data.error?.detail || data.error?.type || `Paddle error (${response.status})`
      res.status(400).json({ error: msg }); return
    }
    await db.insert(ordersTable).values({
      userId: req.userId!, amount: amount / 100, amountUsd: amount / 100, currency: "USD", type, description,
      status: "pending", stripeSessionId: ref, credits, time: now(),
    })
    res.json({ url: data.data?.checkout?.url })
  } catch (err: any) {
    console.error("Paddle checkout error:", err)
    res.status(500).json({ error: "Payment failed. Please try again." })
  }
})

router.post("/paddle/webhook", async (req, res) => {
  const { event_type, data } = req.body
  if (event_type === "transaction.completed" && data?.custom_data) {
    const { ref, userId, type, packageId } = data.custom_data || {}
    if (ref && userId) {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
      if (order && order.status === "pending") {
        await db.update(ordersTable).set({ status: "completed" })
          .where(and(eq(ordersTable.stripeSessionId, ref), eq(ordersTable.status, "pending")))
        const [confirmed] = await db.select().from(ordersTable).where(eq(ordersTable.stripeSessionId, ref)).limit(1)
        if (confirmed?.status === "completed") {
          await fulfillOrder(parseInt(userId), String(type || "credits"), parseInt(packageId || "0"), "USD")
        }
      }
    }
  }
  res.json({ ok: true })
})

router.post("/paddle/test-credentials", requireAuth, async (req, res) => {
  const apiKey = process.env.PADDLE_API_KEY || await getConfig("paddle_api_key")
  if (!apiKey) {
    res.status(400).json({ ok: false, error: "No Paddle API key saved yet. Enter it above and save first." })
    return
  }
  const isPaddleSandbox = apiKey.startsWith("pdl_test") || apiKey.includes("_test_")
  const paddleBase = isPaddleSandbox ? "https://sandbox-api.paddle.com" : "https://api.paddle.com"
  try {
    const response = await fetch(`${paddleBase}/products?per_page=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await response.json() as any
    if (response.status === 401) {
      res.status(400).json({ ok: false, error: "Invalid API key — check you copied the full key", detail: data?.error?.detail })
      return
    }
    if (!response.ok) {
      res.status(400).json({ ok: false, error: `HTTP ${response.status} from Paddle`, detail: data?.error?.detail || JSON.stringify(data) })
      return
    }
    const mode = isPaddleSandbox ? "Sandbox" : "Live"
    res.json({ ok: true, detail: `Paddle ${mode} API key is valid ✓` })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: "Network error reaching Paddle", detail: err?.message })
  }
})

/* ─── Admin: get/set payment config ─── */
router.get("/config", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  if ((user?.admin ?? 0) < 2) { res.status(403).json({ error: "Forbidden" }); return }

  const keys = ["paystack_secret_key", "paystack_public_key", "payhero_api_username", "payhero_api_password", "payhero_channel_id", "paymongo_secret_key", "paymongo_public_key", "kes_rate", "ngn_rate", "ghs_rate", "zar_rate", "php_rate"]
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
  if (type === "starter") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
    if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + 3 }).where(eq(usersTable.id, userId))
  } else if (type === "premium") {
    const pkg = await getPremiumPackage(packageId)
    if (pkg) await activatePremium(userId, pkg)
  } else if (type === "credits") {
    const pkgs = await getCreditPackages()
    const pkg = pkgs[packageId]
    if (pkg) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
      if (user) await db.update(usersTable).set({ credits: (user.credits || 0) + pkg.credits }).where(eq(usersTable.id, userId))
    }
  }
}

async function activatePremium(userId: number, pkg: { days: number; priority: number }) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  if (!user) return
  const currentTime = now()
  const currentExpiry = user.premium && (user.premiumExpiry || 0) > currentTime
    ? (user.premiumExpiry || 0)
    : currentTime
  await db.update(usersTable).set({
    premium: 1,
    premiumExpiry: currentExpiry + pkg.days * 86400,
    premiumPriority: Math.max(user.premiumPriority || 0, pkg.priority),
  }).where(eq(usersTable.id, userId))
}

// Fulfills an order using data already stored on the order row itself (safe for webhook paths
// where packageId is known but cannot be re-derived from request params).
async function fulfillOrderFromRecord(order: { userId: number; type: string | null; packageId: number | null; credits: number | null; description: string | null; premiumDays: number | null; premiumPriority: number | null }) {
  const type = order.type || "credits"
  if (type === "starter") {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
    if (u) await db.update(usersTable).set({ credits: (u.credits || 0) + 3 }).where(eq(usersTable.id, order.userId))
  } else if (type === "credits") {
    const creditsToAdd = (order.credits && order.credits > 0) ? order.credits : 0
    if (creditsToAdd > 0) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
      if (u) await db.update(usersTable).set({ credits: (u.credits || 0) + creditsToAdd }).where(eq(usersTable.id, order.userId))
    }
  } else if (type === "premium") {
    // Try packageId first, fall back to description match
    const pkgById = order.packageId ? (await getPremiumPackages())[order.packageId] : null
    const pkg = pkgById || Object.values(await getPremiumPackages()).find(p => p.name === order.description || `${p.name} Premium` === order.description)
    if (order.premiumDays || pkg) {
      await activatePremium(order.userId, { days: order.premiumDays || pkg!.days, priority: order.premiumPriority || pkg!.priority })
    }
  }
}

export default router
