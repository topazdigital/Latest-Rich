import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, profileBoostsTable, siteConfigTable, notificationsTable } from "@workspace/db/schema"
import { eq, and, gt, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

async function getBoostConfig(): Promise<{ credits: number; duration: number }> {
  const rows = await db.select().from(siteConfigTable).where(
    eq(siteConfigTable.key, "boost_credits")
  ).limit(1)
  const dRows = await db.select().from(siteConfigTable).where(
    eq(siteConfigTable.key, "boost_duration_minutes")
  ).limit(1)
  return {
    credits: parseInt(rows[0]?.value || "50"),
    duration: parseInt(dRows[0]?.value || "30"),
  }
}

// Get boost status for current user
router.get("/status", requireAuth, async (req, res) => {
  try {
    const [activeBoost] = await db.select().from(profileBoostsTable)
      .where(and(
        eq(profileBoostsTable.userId, req.userId!),
        eq(profileBoostsTable.active, 1),
        gt(profileBoostsTable.endTime, now())
      ))
      .limit(1)
    const config = await getBoostConfig()
    const [user] = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    res.json({
      active: !!activeBoost,
      boost: activeBoost || null,
      config,
      credits: user?.credits || 0,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Activate boost for current user
router.post("/activate", requireAuth, async (req, res) => {
  try {
    const config = await getBoostConfig()
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }

    // Check existing active boost
    const [existingBoost] = await db.select().from(profileBoostsTable)
      .where(and(
        eq(profileBoostsTable.userId, req.userId!),
        eq(profileBoostsTable.active, 1),
        gt(profileBoostsTable.endTime, now())
      ))
      .limit(1)
    if (existingBoost) {
      res.status(400).json({ error: "You already have an active boost", boost: existingBoost })
      return
    }

    if ((user.credits || 0) < config.credits) {
      res.status(400).json({ error: `Not enough credits. You need ${config.credits} credits to boost your profile.` })
      return
    }

    const startTime = now()
    const endTime = startTime + config.duration * 60

    const newCredits = (user.credits || 0) - config.credits
    await db.update(usersTable).set({ credits: newCredits }).where(eq(usersTable.id, req.userId!))

    await db.insert(profileBoostsTable).values({
      userId: req.userId!,
      startTime,
      endTime,
      creditsSpent: config.credits,
      active: 1,
    })
    const [boost] = await db.select().from(profileBoostsTable)
      .where(and(eq(profileBoostsTable.userId, req.userId!), eq(profileBoostsTable.startTime, startTime)))
      .orderBy(desc(profileBoostsTable.id))
      .limit(1)

    await db.insert(notificationsTable).values({
      userId: req.userId!,
      fromId: null,
      type: "boost",
      message: `Your profile is now boosted for ${config.duration} minutes! You'll appear at the top of discovery.`,
      link: "/profile",
      read: 0,
      time: now(),
    }).catch(() => {})

    res.json({ success: true, boost, creditsLeft: newCredits, duration: config.duration })
  } catch (err: any) {
    console.error("Boost error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get all currently boosted user IDs (for discovery feed sorting)
router.get("/active", requireAuth, async (req, res) => {
  try {
    const boosted = await db.select({ userId: profileBoostsTable.userId })
      .from(profileBoostsTable)
      .where(and(
        eq(profileBoostsTable.active, 1),
        gt(profileBoostsTable.endTime, now())
      ))
    res.json(boosted.map(b => b.userId))
  } catch {
    res.json([])
  }
})

// Admin: get all boost history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const boosts = await db.select({
      boost: profileBoostsTable,
      user: { id: usersTable.id, name: usersTable.name, email: usersTable.email, photo: usersTable.photo }
    })
      .from(profileBoostsTable)
      .leftJoin(usersTable, eq(profileBoostsTable.userId, usersTable.id))
      .orderBy(desc(profileBoostsTable.id))
      .limit(100)
    res.json(boosts)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
