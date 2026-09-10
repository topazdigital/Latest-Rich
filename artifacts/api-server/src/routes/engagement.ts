import { Router } from "express"
import { db, engagementDailyTable, engagementEventsTable, engagementFeedbackTable, engagementReactionsTable, eventAttendeesTable, likesTable, messagesTable, notificationsTable, ordersTable, siteConfigTable, userExtendedTable, usersTable } from "@workspace/db"
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

const EVENT_CURRENCY_BY_COUNTRY: Record<string, { currency: string; rate: number }> = {
  KE: { currency: "KES", rate: 130 },
  TZ: { currency: "TZS", rate: 2500 },
  UG: { currency: "UGX", rate: 3700 },
  RW: { currency: "RWF", rate: 1300 },
  NG: { currency: "NGN", rate: 1600 },
  GH: { currency: "GHS", rate: 12 },
  ZA: { currency: "ZAR", rate: 19 },
  PH: { currency: "PHP", rate: 56 },
}

const EVENT_COUNTRY_NAMES: Record<string, string> = {
  kenya: "KE", tanzania: "TZ", uganda: "UG", rwanda: "RW", ethiopia: "ET",
  nigeria: "NG", ghana: "GH", "south africa": "ZA", egypt: "EG", philippines: "PH",
}

async function eventPricing(userId: number, priceUsd: number) {
  const [user] = await db.select({ country: usersTable.country, countryCode: usersTable.countryCode })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  const code = String(user?.countryCode || "").trim().toUpperCase() || EVENT_COUNTRY_NAMES[String(user?.country || "").trim().toLowerCase()] || ""
  const local = EVENT_CURRENCY_BY_COUNTRY[code]
  if (!local) return { priceUsd, localPrice: priceUsd, currency: "USD", rate: 1 }
  const configuredRate = Number(await getConfig(`${local.currency.toLowerCase()}_rate`))
  const rate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : local.rate
  return { priceUsd, localPrice: Math.round(priceUsd * rate), currency: local.currency, rate }
}

async function eventView(event: any, userId: number) {
  const attendeeRows = await db.select().from(eventAttendeesTable)
    .where(eq(eventAttendeesTable.eventId, event.id))
  const goingRows = attendeeRows.filter((row: any) => row.status === "going")
  const realUsers = []
  for (const row of goingRows) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, row.userId)).limit(1)
    if (user && user.fake !== 1) realUsers.push(publicUser(user))
  }
  const fakeUsers = await db.select().from(usersTable).where(eq(usersTable.fake, 1)).limit(8)
  const preview = [...fakeUsers.map(publicUser), ...realUsers]
    .filter(Boolean)
    .filter((user: any, index: number, all: any[]) => all.findIndex((candidate: any) => candidate.id === user.id) === index)
    .slice(0, 12)
  const ownAttendance = attendeeRows.find((row: any) => row.userId === userId)
  const capacity = Number(event.capacity || 0)
  const attendeeCount = goingRows.length
  const pricing = await eventPricing(userId, Number(event.ticketPrice || 200))
  return {
    ...event,
    ticketPrice: Number(event.ticketPrice || 200),
    ...pricing,
    attendeeCount,
    remaining: capacity > 0 ? Math.max(capacity - attendeeCount, 0) : null,
    attendeePreview: preview,
    userStatus: ownAttendance?.status || null,
    userPaid: ownAttendance?.paid === 1,
  }
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
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, like.targetId)).limit(1)
      if (!user) continue
      // Fake-user matches never expire. For real users, use the most recent activity
      // as base; fall back to now() if timestamps are zero/ancient (imported legacy data).
      const MIN_VALID_TS = 1_000_000_000 // anything before ~2001 is bad data
      const matchedAt = Math.max(Number(like.created) || 0, Number(reciprocal.created) || 0)
      const baseTs = lastMessage?.time || (matchedAt > MIN_VALID_TS ? matchedAt : now())
      const expiresAt = baseTs + 30 * 86400 // 30-day window
      // Fake-user matches never expire — give them a rolling 1-year window
      const isFake = user.fake === 1
      const finalExpiresAt = isFake ? now() + 365 * 86400 : expiresAt
      const expired = isFake ? false : expiresAt <= now()
      result.push({ ...publicUser(user), matchedAt, expiresAt: finalExpiresAt, expired })
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

router.get("/reactions/:otherId", requireAuth, async (req, res) => {
  try {
    const otherId = Number(req.params.otherId)
    const me = req.userId!
    if (!otherId) return res.status(400).json({ error: "Invalid user" })
    const rows = await db.select().from(engagementReactionsTable)
      .where(or(
        and(eq(engagementReactionsTable.fromId, me), eq(engagementReactionsTable.toId, otherId)),
        and(eq(engagementReactionsTable.fromId, otherId), eq(engagementReactionsTable.toId, me)),
      ))
      .orderBy(engagementReactionsTable.time)
    res.json(rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch reactions" })
  }
})

router.post("/reactions/mark-read", requireAuth, async (req, res) => {
  try {
    const fromId = Number(req.body?.fromId)
    const me = req.userId!
    if (!fromId) return res.status(400).json({ error: "Invalid sender" })
    await db.update(engagementReactionsTable)
      .set({ read: 1 } as any)
      .where(and(eq(engagementReactionsTable.fromId, fromId), eq(engagementReactionsTable.toId, me)))
    // Notify the original sender that their reaction was seen
    const { send: wsSend } = await import("../lib/websocket")
    wsSend(fromId, { type: "reaction_read", byUserId: me })
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to mark read" })
  }
})

router.post("/reactions", requireAuth, async (req, res) => {
  try {
    const toId = Number(req.body?.toId)
    const type = ["wink", "rose", "heart"].includes(req.body?.type) ? req.body.type : "wink"
    if (!toId || toId === req.userId) return res.status(400).json({ error: "A valid recipient is required" })
    const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const t = now()
    const result = await db.insert(engagementReactionsTable).values({ fromId: req.userId!, toId, type, time: t, read: 0 } as any)
    const id = (result as any).insertId ?? (result as any)[0]?.insertId ?? Date.now()
    await db.insert(notificationsTable).values({ userId: toId, fromId: req.userId!, type: "reaction", message: `${sender?.name || "Someone"} sent you a ${type} ${type === "rose" ? "🌹" : type === "heart" ? "❤️" : "😉"}`, link: `/chat/${req.userId}`, time: t } as any)
    const reaction = { id, fromId: req.userId!, toId, type, time: t, read: 0 }
    // Push reaction live to the recipient if they're connected
    const { send: wsSend } = await import("../lib/websocket")
    wsSend(toId, { type: "reaction_received", reaction })
    res.json({ success: true, reaction })
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

router.get("/events", requireAuth, async (req, res) => {
  try {
    const events = await db.select().from(engagementEventsTable)
      .where(eq(engagementEventsTable.active, 1))
      .orderBy(engagementEventsTable.startsAt)
      .limit(20)
    return res.json(await Promise.all(events.map((event: any) => eventView(event, req.userId!))))
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unable to load events" })
  }
})

router.get("/events/:id", requireAuth, async (req, res) => {
  try {
    const [event] = await db.select().from(engagementEventsTable)
      .where(and(eq(engagementEventsTable.id, Number(req.params.id)), eq(engagementEventsTable.active, 1))).limit(1)
    if (!event) return res.status(404).json({ error: "Event not found" })
    return res.json(await eventView(event, req.userId!))
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unable to load event" })
  }
})

router.get("/my-events", requireAuth, async (req, res) => {
  try {
    const rows = await db.select().from(eventAttendeesTable)
      .where(and(eq(eventAttendeesTable.userId, req.userId!), or(eq(eventAttendeesTable.status, "going"), eq(eventAttendeesTable.status, "waitlisted"))))
    const result = []
    for (const row of rows) {
      const [event] = await db.select().from(engagementEventsTable).where(eq(engagementEventsTable.id, row.eventId)).limit(1)
      if (event) result.push({ ...await eventView(event, req.userId!), attendanceStatus: row.status, paid: row.paid === 1 })
    }
    return res.json(result)
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unable to load your events" })
  }
})

router.post("/events/:id/attend", requireAuth, async (req, res) => {
  try {
    const [event] = await db.select().from(engagementEventsTable)
      .where(and(eq(engagementEventsTable.id, Number(req.params.id)), eq(engagementEventsTable.active, 1))).limit(1)
    if (!event) return res.status(404).json({ error: "Event not found" })
    if (Number(event.ticketPrice || 0) > 0) return res.status(402).json({ error: "Payment is required for this event", requiresPayment: true })
    const existing = await db.select().from(eventAttendeesTable)
      .where(and(eq(eventAttendeesTable.eventId, event.id), eq(eventAttendeesTable.userId, req.userId!))).limit(1)
    if (existing[0]?.status === "going") return res.json({ success: true, status: "going" })
    const going = await db.select().from(eventAttendeesTable).where(and(eq(eventAttendeesTable.eventId, event.id), eq(eventAttendeesTable.status, "going")))
    if (Number(event.capacity || 0) > 0 && going.length >= Number(event.capacity)) {
      return res.status(409).json({ error: "This event is full", status: "waitlisted" })
    }
    const values = { eventId: event.id, userId: req.userId!, status: "going", paid: 0, createdAt: now(), cancelledAt: 0 }
    if (existing[0]) await db.update(eventAttendeesTable).set(values as any).where(eq(eventAttendeesTable.id, existing[0].id))
    else await db.insert(eventAttendeesTable).values(values as any)
    return res.json({ success: true, status: "going" })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unable to attend event" })
  }
})

router.delete("/events/:id/attend", requireAuth, async (req, res) => {
  try {
    const result = await db.update(eventAttendeesTable).set({ status: "cancelled", cancelledAt: now() } as any)
      .where(and(eq(eventAttendeesTable.eventId, Number(req.params.id)), eq(eventAttendeesTable.userId, req.userId!)))
    const changed = Number(result?.rowCount ?? result?.affectedRows ?? result?.[0]?.affectedRows ?? 0)
    if (!changed) return res.status(404).json({ error: "Attendance not found" })
    return res.json({ success: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unable to cancel attendance" })
  }
})

router.get("/offers", async (_req, res) => {
  const events = await db.select().from(engagementEventsTable).where(eq(engagementEventsTable.active, 1)).orderBy(engagementEventsTable.startsAt).limit(20).catch(() => [])
  return res.json({ starter: { id: "starter", title: "Try the network", description: "3 chat credits for $1", price: 1, credits: 3 }, events })
})

router.post("/checkout", requireAuth, async (req, res) => {
  const kind = String(req.body?.kind || "")
  // Event tickets use the same provider-aware payment flow as credits and
  // premium. Keep this endpoint for the $1 starter offer only.
  if (kind === "event") {
    return res.status(400).json({ error: "Event tickets must use the configured payment method" })
  }
  let name = "3 Credit Starter Trial"
  let amount = 100
  let metadata: Record<string, string> = { userId: String(req.userId), type: "starter", packageId: "0" }
  if (kind !== "starter") {
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
      mode: "payment", success_url: `${baseUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: kind === "event" ? `${baseUrl}/events/${metadata.packageId}?cancelled=1` : `${baseUrl}/credits?cancelled=1`, metadata,
    })
    await db.insert(ordersTable).values({ userId: req.userId!, amount: amount / 100, amountUsd: amount / 100, currency: "USD", type: metadata.type, description: name, status: "pending", stripeSessionId: session.id, packageId: Number(metadata.packageId), credits: kind === "starter" ? 3 : 0, time: now() } as any)
    return res.json({ url: session.url })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Payment failed" })
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
  return res.json({ success: true })
})

router.post("/admin/events", requireAuth, requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim()
  if (!title) return res.status(400).json({ error: "Title is required" })
  await db.insert(engagementEventsTable).values({
    title,
    description: String(req.body?.description || ""),
    ticketPrice: Number(req.body?.ticketPrice || 200),
    startsAt: Number(req.body?.startsAt || 0),
    endTime: Number(req.body?.endTime || 0),
    location: String(req.body?.location || ""),
    timezone: String(req.body?.timezone || "Africa/Nairobi"),
    registrationDeadline: Number(req.body?.registrationDeadline || 0),
    capacity: Number(req.body?.capacity || 0),
    active: 1,
  } as any)
  return res.json({ success: true })
})

export default router