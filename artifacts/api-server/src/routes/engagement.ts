import { Router } from "express"
import { db, engagementDailyTable, engagementEventsTable, engagementFeedbackTable, engagementReactionsTable, likesTable, messagesTable, notificationsTable, ordersTable, siteConfigTable, userExtendedTable, usersTable } from "@workspace/db"
import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
const now = () => Math.floor(Date.now() / 1000)
const dayKey = () => new Date().toISOString().slice(0, 10)
const PROMPTS = [
  "What's one thing you could talk about for hours?",
  "How did you find your first match?",
  "What's one thing we could do better?",
]

async function getConfig(key: string) {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return row?.value || ""
  } catch {
    return ""
  }
}

async function requireAdmin(req: any, res: any, next: any) {
  const [user] = await db.select({ admin: usersTable.admin }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
  if (!user || (user.admin ?? 0) < 2) return res.status(403).json({ error: "Admin access required" })
  next()
}

function publicUser(user: any) {
  if (!user) return null
  const { password, ...safe } = user
  return safe
}

router.get("/daily", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!
    const today = dayKey()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    let [daily] = await db.select().from(engagementDailyTable)
      .where(and(eq(engagementDailyTable.userId, userId), eq(engagementDailyTable.dayKey, today))).limit(1)
    if (!daily) {
      const [previous] = await db.select().from(engagementDailyTable)
        .where(and(eq(engagementDailyTable.userId, userId), eq(engagementDailyTable.dayKey, yesterday))).limit(1)
      const streak = previous ? Math.min((previous.streakDays || 1) + 1, 3) : 1
      const candidates = await db.select().from(usersTable).where(and(lt(usersTable.id, 2147483647), eq(usersTable.banned, 0))).limit(100)
      const available = candidates.filter((candidate: any) => candidate.id !== userId)
      const match = available.length ? available[Math.floor((Date.now() / 86400000) % available.length)] : null
      const createdAt = now()
      try {
        await db.insert(engagementDailyTable).values({
          userId, dayKey: today, matchUserId: match?.id || 0,
          likedRevealUntil: createdAt + 86400, streakDays: streak,
          rewardCredits: streak <= 3 ? 1 : 0, createdAt,
        } as any)
      } catch {
        // A concurrent request may have created today's row.
      }
      ;[daily] = await db.select().from(engagementDailyTable)
        .where(and(eq(engagementDailyTable.userId, userId), eq(engagementDailyTable.dayKey, today))).limit(1)
      if (daily?.rewardCredits) {
        const reward = daily.rewardCredits
        const claimResult: any = await db.update(engagementDailyTable)
          .set({ rewardCredits: 0 } as any)
          .where(and(eq(engagementDailyTable.id, daily.id), sql`${engagementDailyTable.rewardCredits} > 0`))
        const claimed = Number(claimResult?.rowCount ?? claimResult?.affectedRows ?? claimResult?.[0]?.affectedRows ?? 0) > 0
        if (claimed) {
          await db.update(usersTable).set({ credits: sql`${usersTable.credits} + ${reward}` }).where(eq(usersTable.id, userId))
          daily = { ...daily, rewardCredits: reward }
        } else {
          daily = { ...daily, rewardCredits: 0 }
        }
      }
    }
    const match = daily?.matchUserId ? (await db.select().from(usersTable).where(eq(usersTable.id, daily.matchUserId)).limit(1))[0] : null
    const likes = await db.select().from(likesTable)
      .where(and(eq(likesTable.targetId, userId), gte(likesTable.created, daily?.likedRevealUntil ? daily.likedRevealUntil - 86400 : now() - 86400)))
      .orderBy(desc(likesTable.created)).limit(20)
    const likedUsers = []
    for (const like of likes) {
      const [likedUser] = await db.select().from(usersTable).where(eq(usersTable.id, like.userId)).limit(1)
      if (likedUser) likedUsers.push({ ...publicUser(likedUser), likedAt: like.created })
    }
    res.json({ dayKey: today, streakDays: daily?.streakDays || 1, rewardCredits: daily?.rewardCredits || 0, match: publicUser(match), likedUsers, likedRevealUntil: daily?.likedRevealUntil || now() + 86400 })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Unable to load daily highlights" })
  }
})

router.get("/matches", requireAuth, async (req, res) => {
  try {
    const userId = req.userId!
    const mine = await db.select().from(likesTable).where(eq(likesTable.userId, userId)).limit(200)
    const result = []
    for (const like of mine) {
      const [reciprocal] = await db.select().from(likesTable)
        .where(and(eq(likesTable.userId, like.targetId), eq(likesTable.targetId, userId))).limit(1)
      if (!reciprocal) continue
      const [lastMessage] = await db.select({ time: messagesTable.time }).from(messagesTable)
        .where(and(or(and(eq(messagesTable.u1, userId), eq(messagesTable.u2, like.targetId)), and(eq(messagesTable.u1, like.targetId), eq(messagesTable.u2, userId)))))
        .orderBy(desc(messagesTable.time)).limit(1)
      const expiresAt = (lastMessage?.time || Math.max(like.created || 0, reciprocal.created || 0)) + 7 * 86400
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, like.targetId)).limit(1)
      if (user) result.push({ ...publicUser(user), matchedAt: Math.max(like.created || 0, reciprocal.created || 0), expiresAt, expired: expiresAt <= now() })
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Unable to load matches" })
  }
})

router.get("/icebreakers/:otherId", requireAuth, async (req, res) => {
  try {
    const otherId = Number(req.params.otherId)
    const [me] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, req.userId!)).limit(1)
    const [other] = await db.select().from(userExtendedTable).where(eq(userExtendedTable.userId, otherId)).limit(1)
    const shared = String(me?.interests || "").split(/[,\s]+/).filter(Boolean)
      .find((interest: string) => String(other?.interests || "").toLowerCase().includes(interest.toLowerCase()))
    const topic = shared ? `I noticed we both like ${shared}. What got you into it?` : "What's been the highlight of your week?"
    res.json({ prompts: [topic, "What's your ideal first date?", "If you could travel anywhere next, where would you go?"] })
  } catch {
    res.json({ prompts: ["What's been the highlight of your week?", "What's your ideal first date?", "If you could travel anywhere next, where would you go?"] })
  }
})

router.post("/reactions", requireAuth, async (req, res) => {
  try {
    const toId = Number(req.body?.toId)
    const type = ["wink", "rose", "heart"].includes(req.body?.type) ? req.body.type : "wink"
    if (!toId || toId === req.userId) return res.status(400).json({ error: "A valid recipient is required" })
    const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    await db.insert(engagementReactionsTable).values({ fromId: req.userId!, toId, type, time: now() } as any)
    await db.insert(notificationsTable).values({ userId: toId, fromId: req.userId!, type: "reaction", message: `${sender?.name || "Someone"} sent you a ${type} ${type === "rose" ? "🌹" : type === "heart" ? "❤️" : "😉"}`, link: `/profile/${req.userId}`, time: now() } as any)
    res.json({ success: true, type })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Reaction failed" })
  }
})

router.post("/feedback", requireAuth, async (req, res) => {
  try {
    const rating = Number(req.body?.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be between 1 and 5" })
    await db.insert(engagementFeedbackTable).values({
      userId: req.userId!, rating, comment: String(req.body?.comment || "").slice(0, 2000),
      prompt: String(req.body?.prompt || PROMPTS[0]).slice(0, 255), trigger: String(req.body?.trigger || "positive_moment").slice(0, 50), createdAt: now(),
    } as any)
    res.json({ success: true, trustpilot: rating === 5 })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Feedback could not be saved" })
  }
})

router.get("/offers", async (_req, res) => {
  const events = await db.select().from(engagementEventsTable).where(eq(engagementEventsTable.active, 1)).orderBy(engagementEventsTable.startsAt).limit(20).catch(() => [])
  res.json({ starter: { id: "starter", title: "Try the network", description: "3 chat credits for $1", price: 1, credits: 3 }, events })
})

router.post("/checkout", requireAuth, async (req, res) => {
  const kind = String(req.body?.kind || "")
  let name = "3 Credit Starter Trial"
  let amount = 100
  let metadata: Record<string, string> = { userId: String(req.userId), type: "starter", packageId: "0" }
  if (kind === "event") {
    const eventId = Number(req.body?.eventId)
    const [event] = await db.select().from(engagementEventsTable).where(and(eq(engagementEventsTable.id, eventId), eq(engagementEventsTable.active, 1))).limit(1)
    if (!event) return res.status(404).json({ error: "Event not found" })
    name = event.title
    amount = Math.round(Number(event.ticketPrice || 1) * 100)
    metadata = { userId: String(req.userId), type: "event", packageId: String(event.id) }
  } else if (kind !== "starter") {
    return res.status(400).json({ error: "Unknown offer" })
  }
  const stripeKey = process.env.STRIPE_SECRET_KEY || await getConfig("stripe_secret_key")
  if (!stripeKey) return res.status(400).json({ error: "Card payments are not configured yet. Ask an admin to enable Stripe." })
  try {
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(stripeKey)
    const baseUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "richdatingnetwork.com"}`
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "usd", product_data: { name }, unit_amount: amount }, quantity: 1 }],
      mode: "payment", success_url: `${baseUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${baseUrl}/credits?cancelled=1`, metadata,
    })
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, amountUsd: amount / 100, currency: "USD", type: metadata.type, description: name, status: "pending", stripeSessionId: session.id, packageId: Number(metadata.packageId), credits: kind === "starter" ? 3 : 0, time: now() } as any)
    res.json({ url: session.url })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Payment failed" })
  }
})

router.get("/admin/feedback", requireAuth, requireAdmin, async (_req, res) => {
  const rows = await db.select({ feedback: engagementFeedbackTable, user: { id: usersTable.id, name: usersTable.name, email: usersTable.email } })
    .from(engagementFeedbackTable).leftJoin(usersTable, eq(engagementFeedbackTable.userId, usersTable.id)).orderBy(desc(engagementFeedbackTable.createdAt)).limit(200).catch(() => [])
  res.json(rows)
})

router.patch("/admin/feedback/:id", requireAuth, requireAdmin, async (req, res) => {
  const status = ["new", "reviewed", "resolved"].includes(req.body?.status) ? req.body.status : "reviewed"
  await db.update(engagementFeedbackTable).set({ status, adminNote: String(req.body?.adminNote || "").slice(0, 1000), resolvedAt: status === "resolved" ? now() : 0 } as any).where(eq(engagementFeedbackTable.id, Number(req.params.id)))
  res.json({ success: true })
})

router.post("/admin/events", requireAuth, requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim()
  if (!title) return res.status(400).json({ error: "Title is required" })
  await db.insert(engagementEventsTable).values({ title, description: String(req.body?.description || ""), ticketPrice: Number(req.body?.ticketPrice || 1), startsAt: Number(req.body?.startsAt || 0), capacity: Number(req.body?.capacity || 0), active: 1 } as any)
  res.json({ success: true })
})

export default router