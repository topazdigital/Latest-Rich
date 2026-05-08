import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, referralsTable, notificationsTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and, desc, count } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

async function getConfig(key: string, fallback = ""): Promise<string> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return row?.value || fallback
  } catch { return fallback }
}

// GET /api/referrals — get my referral stats and link
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const [user] = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      name: usersTable.name,
      referralCode: usersTable.referralCode,
    }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)

    if (!user) { res.status(404).json({ error: "User not found" }); return }

    // Generate referral code if none exists
    let code = user.referralCode
    if (!code) {
      code = user.username || `user${user.id}`
      await db.update(usersTable).set({ referralCode: code }).where(eq(usersTable.id, req.userId))
    }

    const referralsList = await db.select({
      id: referralsTable.id,
      referredId: referralsTable.referredId,
      status: referralsTable.status,
      reward: referralsTable.reward,
      created: referralsTable.created,
      name: usersTable.name,
      photo: usersTable.photo,
      photoThumb: usersTable.photoThumb,
    })
      .from(referralsTable)
      .leftJoin(usersTable, eq(referralsTable.referredId, usersTable.id))
      .where(eq(referralsTable.referrerId, req.userId))
      .orderBy(desc(referralsTable.created))
      .limit(50)

    const [totalCount] = await db.select({ count: count() }).from(referralsTable)
      .where(eq(referralsTable.referrerId, req.userId))

    const siteUrl = await getConfig("site_url", "https://richdatingnetwork.com")
    const referralUrl = `${siteUrl}/ref/${code}`

    // Reward tiers from config (or defaults)
    const rewardTiersRaw = await getConfig("referral_reward_tiers", "")
    let rewardTiers = DEFAULT_REWARD_TIERS
    if (rewardTiersRaw) {
      try { rewardTiers = JSON.parse(rewardTiersRaw) } catch {}
    }

    res.json({
      code,
      referralUrl,
      totalReferrals: totalCount.count || 0,
      referrals: referralsList,
      rewardTiers,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/referrals/track — called during registration if ref code present
router.post("/track", async (req: any, res) => {
  try {
    const { referralCode, newUserId } = req.body
    if (!referralCode || !newUserId) { res.json({ tracked: false }); return }

    const [referrer] = await db.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.referralCode as any, referralCode))
      .limit(1)

    if (!referrer || referrer.id === newUserId) { res.json({ tracked: false }); return }

    // Don't double-track
    const [existing] = await db.select({ id: referralsTable.id })
      .from(referralsTable)
      .where(and(eq(referralsTable.referrerId, referrer.id), eq(referralsTable.referredId, newUserId)))
      .limit(1)

    if (existing) { res.json({ tracked: true }); return }

    await db.insert(referralsTable).values({
      referrerId: referrer.id,
      referredId: newUserId,
      status: "joined",
      reward: "",
      created: now(),
    } as any)

    // Tag the new user with referredBy
    await db.update(usersTable).set({ referredBy: referrer.id } as any)
      .where(eq(usersTable.id, newUserId))

    res.json({ tracked: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/referrals/reward — called when a referred user makes a purchase (internal)
router.post("/reward", async (req: any, res) => {
  try {
    const { userId, packageType, packageName } = req.body

    // Find who referred this user
    const [user] = await db.select({ referredBy: usersTable.referredBy })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1)

    const referrerId = (user as any)?.referredBy
    if (!referrerId) { res.json({ rewarded: false }); return }

    const rewardTiersRaw = await getConfig("referral_reward_tiers", "")
    let rewardTiers = DEFAULT_REWARD_TIERS
    if (rewardTiersRaw) {
      try { rewardTiers = JSON.parse(rewardTiersRaw) } catch {}
    }

    const tier = rewardTiers.find((t: any) => t.packageName === packageName || t.packageType === packageType)
    if (!tier) { res.json({ rewarded: false }); return }

    // Apply reward
    if (tier.rewardType === "credits") {
      await db.update(usersTable).set({ credits: (db as any).sql`credits + ${tier.rewardAmount}` })
        .where(eq(usersTable.id, referrerId))
    } else if (tier.rewardType === "premium_days") {
      const currentExpiry = Math.max(now(), (await db.select({ premiumExpiry: usersTable.premiumExpiry })
        .from(usersTable).where(eq(usersTable.id, referrerId)).limit(1))[0]?.premiumExpiry || now())
      const newExpiry = currentExpiry + (tier.rewardAmount * 86400)
      await db.update(usersTable).set({ premium: 1, premiumExpiry: newExpiry })
        .where(eq(usersTable.id, referrerId))
    }

    // Mark referral as rewarded
    await db.update(referralsTable as any).set({
      status: "rewarded",
      reward: `${tier.rewardAmount} ${tier.rewardType}`,
    }).where(and(
      eq(referralsTable.referrerId as any, referrerId),
      eq(referralsTable.referredId as any, userId)
    ))

    await db.insert(notificationsTable).values({
      userId: referrerId,
      fromId: null,
      type: "referral",
      message: `🎉 You earned a referral reward: ${tier.rewardAmount} ${tier.rewardType.replace("_", " ")}!`,
      link: "/referrals",
      read: 0,
      time: now(),
    } as any)

    res.json({ rewarded: true, reward: tier })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

const DEFAULT_REWARD_TIERS = [
  { packageName: "10 Credits", packageType: "credits", rewardType: "credits", rewardAmount: 10, label: "10 Credits when your friend purchases this CREDIT package (10 Credits)" },
  { packageName: "25 Credits", packageType: "credits", rewardType: "premium_days", rewardAmount: 50, label: "50 days of Premium when your friend purchases this CREDIT package (25 Credits)" },
  { packageName: "1 Day Premium", packageType: "premium", rewardType: "credits", rewardAmount: 50, label: "50 Credits when your friend purchases this PREMIUM package (1 day of Premium)" },
  { packageName: "50 Credits", packageType: "credits", rewardType: "premium_days", rewardAmount: 150, label: "150 days of Premium when your friend purchases this CREDIT package (50 Credits)" },
  { packageName: "3 Days Premium", packageType: "premium", rewardType: "premium_days", rewardAmount: 200, label: "200 days of Premium when your friend purchases this PREMIUM package (3 days of Premium)" },
  { packageName: "7 Days Premium", packageType: "premium", rewardType: "credits", rewardAmount: 500, label: "500 Credits when your friend purchases this PREMIUM package (7 days of Premium)" },
]

export default router
