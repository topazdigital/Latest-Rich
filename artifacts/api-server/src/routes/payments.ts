import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, ordersTable } from "@workspace/db/schema"
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

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    res.status(400).json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment secrets to enable payments.",
    })
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

    const baseUrl = process.env.APP_URL ||
      (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:8080")

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: lineItem.name },
          unit_amount: lineItem.amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${type}?cancelled=1`,
      metadata: { userId: String(req.userId), type, packageId: String(packageId) },
    })

    await db.insert(ordersTable).values({
      userId: req.userId!,
      amount: lineItem.amount / 100,
      currency: "USD",
      type,
      description: lineItem.name,
      status: "pending",
      stripeSessionId: session.id,
      time: now(),
    })

    res.json({ url: session.url })
  } catch (err: any) {
    console.error("Stripe checkout error:", err)
    res.status(500).json({ error: err.message || "Payment failed" })
  }
})

router.get("/stripe/success", async (req, res) => {
  const { session_id } = req.query
  const stripeKey = process.env.STRIPE_SECRET_KEY

  if (!stripeKey || !session_id) {
    return res.redirect("/premium?error=invalid")
  }

  try {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeKey)
    const session = await stripe.checkout.sessions.retrieve(String(session_id))

    if (session.payment_status !== "paid") {
      return res.redirect("/premium?error=unpaid")
    }

    // Derive all values from verified Stripe session metadata — never from query params
    const { userId, type, packageId } = session.metadata || {}
    if (!userId || !type || !packageId) {
      return res.redirect("/premium?error=missing_metadata")
    }

    const uid = parseInt(userId)
    const pkgId = parseInt(packageId)

    if (type === "premium") {
      const pkg = PREMIUM_PACKAGES[pkgId]
      if (pkg) {
        const expiry = now() + pkg.days * 86400
        await db.update(usersTable).set({ premium: 1, premiumExpiry: expiry }).where(eq(usersTable.id, uid))
      }
    } else if (type === "credits") {
      const pkg = CREDIT_PACKAGES[pkgId]
      if (pkg) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, uid)).limit(1)
        if (user) {
          await db.update(usersTable).set({ credits: (user.credits || 0) + pkg.credits }).where(eq(usersTable.id, uid))
        }
      }
    }

    await db.update(ordersTable).set({ status: "completed" })
      .where(eq(ordersTable.stripeSessionId, String(session_id)))

    res.redirect(`/${type}?success=1`)
  } catch (err) {
    console.error("Stripe success handler error:", err)
    res.redirect("/premium?error=server")
  }
})

router.get("/stripe/cancel", async (req, res) => {
  const type = req.query.type || "premium"
  res.redirect(`/${type}?cancelled=1`)
})

export default router
