import { Router, type Request, type Response, type NextFunction } from "express"
import crypto from "crypto"
import { db } from "@workspace/db"
import { affiliateActivityTable, affiliatePartnersTable, affiliateReferralsTable, ordersTable, siteConfigTable, usersTable } from "@workspace/db/schema"
import { and, count, countDistinct, desc, eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { hashPassword } from "../lib/password"
import { logAffiliateActivity, nowSeconds } from "../lib/affiliate-service"

const router = Router()

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  db.select({ admin: usersTable.admin })
    .from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)
    .then((rows: any[]) => {
      const user = rows[0]
      if (!user || (user.admin ?? 0) < 2) {
        res.status(403).json({ error: "Admin access required" })
        return
      }
      next()
    })
    .catch(() => res.status(500).json({ error: "Unable to verify admin access" }))
}

router.use(requireAuth, requireAdmin)

function generatedPassword() {
  return `${crypto.randomBytes(12).toString("base64url")}A7!`
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 64)
}

async function getSiteUrl() {
  const [row] = await db.select({ value: siteConfigTable.value })
    .from(siteConfigTable).where(eq(siteConfigTable.key, "site_url")).limit(1)
  return row?.value?.replace(/\/+$/, "") || "https://richdatingnetwork.com"
}

router.get("/", async (_req, res) => {
  try {
    const [partners, clickCounts, referralCounts, paidConversionCounts] = await Promise.all([
      db.select({
        id: affiliatePartnersTable.id,
        username: affiliatePartnersTable.username,
        displayName: affiliatePartnersTable.displayName,
        referralCode: affiliatePartnersTable.referralCode,
        parentPartnerId: affiliatePartnersTable.parentPartnerId,
        active: affiliatePartnersTable.active,
        createdAt: affiliatePartnersTable.createdAt,
        lastLogin: affiliatePartnersTable.lastLogin,
        lastActivity: affiliatePartnersTable.lastActivity,
      }).from(affiliatePartnersTable).orderBy(desc(affiliatePartnersTable.createdAt)),
      db.select({
        partnerId: affiliateActivityTable.partnerId,
        count: count(),
      }).from(affiliateActivityTable)
        .where(eq(affiliateActivityTable.eventType, "click"))
        .groupBy(affiliateActivityTable.partnerId),
      db.select({
        partnerId: affiliateReferralsTable.partnerId,
        count: count(),
      }).from(affiliateReferralsTable).groupBy(affiliateReferralsTable.partnerId),
      db.select({
        partnerId: affiliateReferralsTable.partnerId,
        count: countDistinct(ordersTable.userId),
      }).from(affiliateReferralsTable)
        .innerJoin(ordersTable, eq(ordersTable.userId, affiliateReferralsTable.userId))
        .where(eq(ordersTable.status, "completed"))
        .groupBy(affiliateReferralsTable.partnerId),
    ])
    const clickByPartner = new Map<number, number>(clickCounts.map((row: any) => [row.partnerId, Number(row.count)]))
    const referralsByPartner = new Map<number, number>(referralCounts.map((row: any) => [row.partnerId, Number(row.count)]))
    const paidConversionsByPartner = new Map<number, number>(paidConversionCounts.map((row: any) => [row.partnerId, Number(row.count)]))
    const childrenByPartner = new Map<number, number>()
    for (const partner of partners) {
      const parentId = Number(partner.parentPartnerId || 0)
      if (parentId > 0) childrenByPartner.set(parentId, (childrenByPartner.get(parentId) || 0) + 1)
    }
    const siteUrl = await getSiteUrl()
    res.json(partners.map((partner: any) => ({
      ...partner,
      clicks: clickByPartner.get(partner.id) || 0,
      signups: referralsByPartner.get(partner.id) || 0,
      paidConversions: paidConversionsByPartner.get(partner.id) || 0,
      recruitedPartners: childrenByPartner.get(partner.id) || 0,
      referralUrl: `${siteUrl}/partner/${partner.referralCode}`,
    })))
  } catch (error) {
    console.error("[admin/partners] Could not list partners", error)
    res.status(500).json({ error: "Unable to load partner accounts" })
  }
})

router.post("/", async (req, res) => {
  try {
    const displayName = String(req.body?.displayName || "").trim().slice(0, 255)
    if (displayName.length < 2) {
      res.status(400).json({ error: "Enter a partner display name" })
      return
    }
    const suppliedUsername = normalizeUsername(String(req.body?.username || ""))
    const autoUsername = !suppliedUsername
    const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22) || "partner"
    const username = suppliedUsername || `${base}_${crypto.randomBytes(3).toString("hex")}`
    if (username.length < 3) {
      res.status(400).json({ error: "Username must contain at least 3 valid characters" })
      return
    }
    const suppliedPassword = String(req.body?.password || "")
    if (suppliedPassword && suppliedPassword.length < 10) {
      res.status(400).json({ error: "Password must be at least 10 characters" })
      return
    }
    const oneTimePassword = suppliedPassword || generatedPassword()
    const [memberUsername, existingPartner] = await Promise.all([
      db.select({ id: usersTable.id }).from(usersTable)
        .where(eq(usersTable.username, username)).limit(1),
      db.select({ id: affiliatePartnersTable.id }).from(affiliatePartnersTable)
        .where(eq(affiliatePartnersTable.username, username)).limit(1),
    ])
    if (memberUsername.length || existingPartner.length) {
      res.status(409).json({ error: "That username is already in use" })
      return
    }

    const parentId = Number(req.body?.parentPartnerId || 0)
    if (parentId > 0) {
      const [parent] = await db.select({ id: affiliatePartnersTable.id })
        .from(affiliatePartnersTable)
        .where(and(eq(affiliatePartnersTable.id, parentId), eq(affiliatePartnersTable.active, 1)))
        .limit(1)
      if (!parent) {
        res.status(400).json({ error: "Choose an active parent partner" })
        return
      }
    }

    await db.insert(affiliatePartnersTable).values({
      username,
      displayName,
      passwordHash: await hashPassword(oneTimePassword),
      passwordVersion: 1,
      referralCode: `ap_${crypto.randomBytes(12).toString("hex")}`,
      parentPartnerId: parentId,
      active: 1,
      createdBy: req.userId!,
      createdAt: nowSeconds(),
    })
    const [created] = await db.select({
      id: affiliatePartnersTable.id,
      username: affiliatePartnersTable.username,
      displayName: affiliatePartnersTable.displayName,
      referralCode: affiliatePartnersTable.referralCode,
      parentPartnerId: affiliatePartnersTable.parentPartnerId,
      active: affiliatePartnersTable.active,
      createdAt: affiliatePartnersTable.createdAt,
    }).from(affiliatePartnersTable)
      .where(eq(affiliatePartnersTable.username, username)).limit(1)
    if (!created) throw new Error("Partner account could not be read after creation")

    await logAffiliateActivity(created.id, "created", "Partner account created by admin")
    const siteUrl = await getSiteUrl()
    res.status(201).json({
      partner: { ...created, referralUrl: `${siteUrl}/partner/${created.referralCode}` },
      oneTimePassword,
      usernameWasGenerated: autoUsername,
    })
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY" || error?.code === "23505") {
      res.status(409).json({ error: "That username or referral code is already in use" })
      return
    }
    console.error("[admin/partners] Could not create partner", error)
    res.status(500).json({ error: "Unable to create partner account" })
  }
})

router.get("/:id/activity", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner ID" })
      return
    }
    const [partner] = await db.select({
      id: affiliatePartnersTable.id,
      username: affiliatePartnersTable.username,
      displayName: affiliatePartnersTable.displayName,
      referralCode: affiliatePartnersTable.referralCode,
      createdAt: affiliatePartnersTable.createdAt,
    }).from(affiliatePartnersTable)
      .where(eq(affiliatePartnersTable.id, id)).limit(1)
    if (!partner) {
      res.status(404).json({ error: "Partner account not found" })
      return
    }
    const [activity, referrals, clickCount, referralCount, paidConversionCount, downlineCount, siteUrl] = await Promise.all([
      db.select({
        id: affiliateActivityTable.id,
        eventType: affiliateActivityTable.eventType,
        detail: affiliateActivityTable.detail,
        createdAt: affiliateActivityTable.createdAt,
      }).from(affiliateActivityTable)
        .where(eq(affiliateActivityTable.partnerId, id))
        .orderBy(desc(affiliateActivityTable.createdAt)).limit(100),
      db.select({
        id: affiliateReferralsTable.id,
        createdAt: affiliateReferralsTable.createdAt,
      }).from(affiliateReferralsTable)
        .where(eq(affiliateReferralsTable.partnerId, id))
        .orderBy(desc(affiliateReferralsTable.createdAt)).limit(100),
      db.select({ count: count() }).from(affiliateActivityTable)
        .where(and(eq(affiliateActivityTable.partnerId, id), eq(affiliateActivityTable.eventType, "click"))),
      db.select({ count: count() }).from(affiliateReferralsTable)
        .where(eq(affiliateReferralsTable.partnerId, id)),
      db.select({ count: countDistinct(ordersTable.userId) })
        .from(affiliateReferralsTable)
        .innerJoin(ordersTable, eq(ordersTable.userId, affiliateReferralsTable.userId))
        .where(and(
          eq(affiliateReferralsTable.partnerId, id),
          eq(ordersTable.status, "completed"),
        )),
      db.select({ count: count() }).from(affiliatePartnersTable)
        .where(eq(affiliatePartnersTable.parentPartnerId, id)),
      getSiteUrl(),
    ])
    res.json({
      partner: {
        ...partner,
        clicks: Number(clickCount[0]?.count || 0),
        signups: Number(referralCount[0]?.count || 0),
        paidConversions: Number(paidConversionCount[0]?.count || 0),
        recruitedPartners: Number(downlineCount[0]?.count || 0),
        referralUrl: `${siteUrl}/partner/${partner.referralCode}`,
      },
      activity,
      referrals,
    })
  } catch (error) {
    console.error("[admin/partners] Could not load activity", error)
    res.status(500).json({ error: "Unable to load partner activity" })
  }
})

router.patch("/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id)
    const active = Number(req.body?.active)
    if (!Number.isInteger(id) || id <= 0 || ![0, 1].includes(active)) {
      res.status(400).json({ error: "A valid partner ID and status are required" })
      return
    }
    const [existing] = await db.select({
      id: affiliatePartnersTable.id,
      active: affiliatePartnersTable.active,
      passwordVersion: affiliatePartnersTable.passwordVersion,
    })
      .from(affiliatePartnersTable).where(eq(affiliatePartnersTable.id, id)).limit(1)
    if (!existing) {
      res.status(404).json({ error: "Partner account not found" })
      return
    }
    if (Number(existing.active) === active) {
      res.json({ success: true, active })
      return
    }
    await db.update(affiliatePartnersTable).set({
      active,
      passwordVersion: Number(existing.passwordVersion || 1) + 1,
    })
      .where(eq(affiliatePartnersTable.id, id))
    await logAffiliateActivity(id, active ? "enabled" : "paused", active ? "Partner account enabled" : "Partner account paused")
    res.json({ success: true, active })
  } catch (error) {
    console.error("[admin/partners] Could not update status", error)
    res.status(500).json({ error: "Unable to update partner status" })
  }
})

router.post("/:id/reset-password", async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid partner ID" })
      return
    }
    const [partner] = await db.select({
      id: affiliatePartnersTable.id,
      passwordVersion: affiliatePartnersTable.passwordVersion,
    })
      .from(affiliatePartnersTable).where(eq(affiliatePartnersTable.id, id)).limit(1)
    if (!partner) {
      res.status(404).json({ error: "Partner account not found" })
      return
    }
    const oneTimePassword = generatedPassword()
    await db.update(affiliatePartnersTable).set({
      passwordHash: await hashPassword(oneTimePassword),
      passwordVersion: Number(partner.passwordVersion || 1) + 1,
    }).where(eq(affiliatePartnersTable.id, id))
    await logAffiliateActivity(id, "password_reset", "Partner password reset by admin")
    res.json({ oneTimePassword })
  } catch (error) {
    console.error("[admin/partners] Could not reset password", error)
    res.status(500).json({ error: "Unable to reset partner password" })
  }
})

export default router
