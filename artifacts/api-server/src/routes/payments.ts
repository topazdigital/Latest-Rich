import { Router } from "express"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    res.status(400).json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables." })
    return
  }
  res.json({ error: "Stripe checkout requires STRIPE_SECRET_KEY configuration." })
})

router.get("/stripe/success", async (req, res) => {
  res.redirect("/premium?success=1")
})

router.get("/stripe/cancel", async (req, res) => {
  res.redirect("/premium?cancelled=1")
})

export default router
