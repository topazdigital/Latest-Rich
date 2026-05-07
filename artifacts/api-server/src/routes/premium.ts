import { Router } from "express"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()

const PREMIUM_PACKAGES = [
  { id: 1, name: "1 Month", days: 30, price: 9.99, popular: 0, description: "Flexible monthly plan" },
  { id: 2, name: "3 Months", days: 90, price: 24.99, popular: 1, description: "Save 17%" },
  { id: 3, name: "6 Months", days: 180, price: 39.99, popular: 0, description: "Save 33%" },
  { id: 4, name: "1 Year", days: 365, price: 59.99, popular: 0, description: "Best value — Save 50%" },
]

router.get("/packages", requireAuth, async (req, res) => {
  res.json(PREMIUM_PACKAGES)
})

export default router
