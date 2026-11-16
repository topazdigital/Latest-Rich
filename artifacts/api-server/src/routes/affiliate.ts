import { Router, type Request, type Response, type NextFunction } from "express"
import { db } from "@workspace/db"
import { affiliateActivityTable, affiliatePartnersTable, affiliateReferralsTable, ordersTable, siteConfigTable } from "@workspace/db/schema"
import { and, count, countDistinct, desc, eq } from "drizzle-orm"
import { signToken, verifyToken } from "../lib/jwt"
import { verifyPassword } from "../lib/password"
import { logAffiliateActivity, nowSeconds } from "../lib/affiliate-service"

const router = Router()

declare global {
  namespace Express {
    interface Request {
      partnerId?: number
    }
  }
}

async function requirePartnerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Partner sign-in required" })
    return
  }
  const payload = verifyToken(header.slice(7))
  const partnerId = Number(payload?.partnerId)
  if (payload?.accountType !== "affiliate_partner" || !Number.isInteger(partnerId) || partnerId <= 0) {
    res.status(401).json({ error: "Invalid partner session" })
    return
  }
  try {
    const [partner] = await db.select({
      id: affiliatePartnersTable.id,
      active: affiliatePartnersTable.active,
      passwordVersion: affiliatePartnersTable.passwordVersion,
    }).from(affiliatePartnersTable)
      .where(eq(affiliatePartnersTable.id, partnerId))
      .limit(1)
    if (!partner) {
      res.status(401).json({ error: "Partner account not found" })
      return
    }
    if (partner.active !== 1) {
      res.status(403).json({ error: "This partner account is paused" })
      return
    }
    if (Number(payload.credentialVersion) !== Number(partner.passwordVersion || 1)) {
      res.status(401).json({ error: "Partner credentials changed. Sign in again." })
      return
    }
    req.partnerId = partnerId
    await db.update(affiliatePartnersTable)
      .set({ lastActivity: nowSeconds() })
      .where(eq(affiliatePartnersTable.id, partnerId))
    next()
  } catch (error) {
    console.error("[affiliate] Partner session validation failed", error)
    res.status(503).json({ error: "Unable to verify partner account" })
  }
}

async function getSiteUrl() {
  const [row] = await db.select({ value: siteConfigTable.value })
    .from(siteConfigTable).where(eq(siteConfigTable.key, "site_url")).limit(1)
  return row?.value?.replace(/\/+$/, "") || "https://richdatingnetwork.com"
}

router.post("/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase()
    const password = String(req.body?.password || "")
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" })
      return
    }
    const [partner] = await db.select().from(affiliatePartnersTable)
      .where(eq(affiliatePartnersTable.username, username))
      .limit(1)
    if (!partner || !(await verifyPassword(password, partner.passwordHash))) {
      res.status(401).json({ error: "Invalid username or password" })
      return
    }
    if (partner.active !== 1) {
      res.status(403).json({ error: "This partner account is paused" })
      return
    }
    const loginTime = nowSeconds()
    await db.update(affiliatePartnersTable).set({
      lastLogin: loginTime,
      lastActivity: loginTime,
    }).where(eq(affiliatePartnersTable.id, partner.id))
    await logAffiliateActivity(partner.id, "login", "Partner signed in")
    const token = signToken({
      accountType: "affiliate_partner",
      partnerId: partner.id,
      credentialVersion: Number(partner.passwordVersion || 1),
    })
    res.json({
      token,
      partner: {
        id: partner.id,
        username: partner.username,
        displayName: partner.displayName,
        referralCode: partner.referralCode,
      },
    })
  } catch (error) {
    console.error("[affiliate] Partner login failed", error)
    res.status(500).json({ error: "Partner login failed" })
  }
})

router.post("/click/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").trim().slice(0, 64)
    const [partner] = await db.select({
      id: affiliatePartnersTable.id,
    }).from(affiliatePartnersTable)
      .where(and(
        eq(affiliatePartnersTable.referralCode, code),
        eq(affiliatePartnersTable.active, 1),
      ))
      .limit(1)
    if (!partner) {
      res.status(404).json({ tracked: false, error: "Referral link not found" })
      return
    }
    await logAffiliateActivity(partner.id, "click", "Referral link opened")
    const secure = req.secure || req.headers["x-forwarded-proto"] === "https"
    res.cookie("rdn_partner_referral", partner.id ? code : "", {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    })
    res.json({ tracked: true })
  } catch (error) {
    console.error("[affiliate] Referral click tracking failed", error)
    res.status(500).json({ tracked: false, error: "Unable to record referral visit" })
  }
})

router.get("/dashboard", requirePartnerAuth, async (req, res) => {
  try {
    const partnerId = req.partnerId!
    const [partner] = await db.select({
      id: affiliatePartnersTable.id,
      username: affiliatePartnersTable.username,
      displayName: affiliatePartnersTable.displayName,
      referralCode: affiliatePartnersTable.referralCode,
      parentPartnerId: affiliatePartnersTable.parentPartnerId,
      createdAt: affiliatePartnersTable.createdAt,
      lastLogin: affiliatePartnersTable.lastLogin,
    }).from(affiliatePartnersTable)
      .where(eq(affiliatePartnersTable.id, partnerId))
      .limit(1)
    if (!partner) {
      res.status(404).json({ error: "Partner account not found" })
      return
    }

    const [[clicks], [referralCount], [paidConversions], referrals, activity, downline] = await Promise.all([
      db.select({ count: count() }).from(affiliateActivityTable)
        .where(and(eq(affiliateActivityTable.partnerId, partnerId), eq(affiliateActivityTable.eventType, "click"))),
      db.select({ count: count() }).from(affiliateReferralsTable)
        .where(eq(affiliateReferralsTable.partnerId, partnerId)),
      db.select({ count: countDistinct(ordersTable.userId) })
        .from(affiliateReferralsTable)
        .innerJoin(ordersTable, eq(ordersTable.userId, affiliateReferralsTable.userId))
        .where(and(
          eq(affiliateReferralsTable.partnerId, partnerId),
          eq(ordersTable.status, "completed"),
        )),
      db.select({ id: affiliateReferralsTable.id, createdAt: affiliateReferralsTable.createdAt })
        .from(affiliateReferralsTable).where(eq(affiliateReferralsTable.partnerId, partnerId))
        .orderBy(desc(affiliateReferralsTable.createdAt)).limit(12),
      db.select({
        eventType: affiliateActivityTable.eventType,
        detail: affiliateActivityTable.detail,
        createdAt: affiliateActivityTable.createdAt,
      }).from(affiliateActivityTable).where(eq(affiliateActivityTable.partnerId, partnerId))
        .orderBy(desc(affiliateActivityTable.createdAt)).limit(15),
      db.select({
        id: affiliatePartnersTable.id,
        displayName: affiliatePartnersTable.displayName,
        username: affiliatePartnersTable.username,
        referralCode: affiliatePartnersTable.referralCode,
        active: affiliatePartnersTable.active,
        createdAt: affiliatePartnersTable.createdAt,
      }).from(affiliatePartnersTable).where(eq(affiliatePartnersTable.parentPartnerId, partnerId))
        .orderBy(desc(affiliatePartnersTable.createdAt)).limit(100),
    ])

    const siteUrl = await getSiteUrl()
    res.json({
      partner,
      referralUrl: `${siteUrl}/partner/${partner.referralCode}`,
      stats: {
        clicks: Number(clicks?.count || 0),
        signups: Number(referralCount?.count || 0),
        paidConversions: Number(paidConversions?.count || 0),
        conversionRate: Number(clicks?.count || 0) > 0
          ? Number(((Number(referralCount?.count || 0) / Number(clicks?.count || 0)) * 100).toFixed(1))
          : 0,
      },
      referrals,
      activity,
      downline,
    })
  } catch (error) {
    console.error("[affiliate] Partner dashboard failed", error)
    res.status(500).json({ error: "Unable to load partner dashboard" })
  }
})

export default router
