import { db } from "@workspace/db"
import { affiliateActivityTable, affiliatePartnersTable, affiliateReferralsTable } from "@workspace/db/schema"
import { and, eq } from "drizzle-orm"

export function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

export function getAffiliateReferralCode(cookieHeader = ""): string {
  const entry = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith("rdn_partner_referral="))
  if (!entry) return ""
  try {
    return decodeURIComponent(entry.slice("rdn_partner_referral=".length)).slice(0, 64)
  } catch {
    return ""
  }
}

export async function logAffiliateActivity(partnerId: number, eventType: string, detail = "") {
  const createdAt = nowSeconds()
  await db.insert(affiliateActivityTable).values({
    partnerId,
    eventType,
    detail: detail.slice(0, 240),
    createdAt,
  })
  await db.update(affiliatePartnersTable)
    .set({ lastActivity: createdAt })
    .where(eq(affiliatePartnersTable.id, partnerId))
}

export async function recordAffiliateSignup(userId: number, referralCode: string) {
  if (!userId || !referralCode) return false
  const [partner] = await db.select({
    id: affiliatePartnersTable.id,
    active: affiliatePartnersTable.active,
  }).from(affiliatePartnersTable)
    .where(and(
      eq(affiliatePartnersTable.referralCode, referralCode),
      eq(affiliatePartnersTable.active, 1),
    ))
    .limit(1)
  if (!partner) return false

  const [existing] = await db.select({ id: affiliateReferralsTable.id })
    .from(affiliateReferralsTable)
    .where(eq(affiliateReferralsTable.userId, userId))
    .limit(1)
  if (existing) return false

  await db.insert(affiliateReferralsTable).values({
    partnerId: partner.id,
    userId,
    createdAt: nowSeconds(),
  })
  await logAffiliateActivity(partner.id, "signup", "A member registered")
  return true
}
