import { db } from "@workspace/db"
import { customPaymentOrdersTable, ordersTable, usersTable } from "@workspace/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { getPremiumPackage, getPremiumPackages, parsePremiumDays } from "./premium-packages"
import { isActivePremium } from "./contact-filter"

type PremiumUser = {
  id?: number
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
  fake?: number | null
}

/**
 * The premium priority is stored on users for fast authorization checks.
 * Older paid orders predate that column, so recover the purchased tier from
 * completed orders when the stored value is missing or too low.
 */
export async function getEffectivePremiumPriority(user: PremiumUser): Promise<number> {
  const currentPriority = Math.max(0, user.premiumPriority || 0)
  if (!user.id || !isActivePremium(user) || currentPriority >= 2) return currentPriority

  let recoveredPriority = currentPriority

  try {
    const completedOrders = await db.select({
      packageId: ordersTable.packageId,
      premiumPriority: ordersTable.premiumPriority,
    }).from(ordersTable)
      .where(and(
        eq(ordersTable.userId, user.id),
        eq(ordersTable.type, "premium"),
        eq(ordersTable.status, "completed"),
      ))
      .orderBy(desc(ordersTable.id))
      .limit(50)

    for (const order of completedOrders) {
      recoveredPriority = Math.max(recoveredPriority, order.premiumPriority || 0)
      if (!order.premiumPriority && order.packageId) {
        const pkg = await getPremiumPackage(order.packageId)
        recoveredPriority = Math.max(recoveredPriority, pkg?.priority || 0)
      }
    }
  } catch {
    // The user row remains authoritative if order history is unavailable.
  }

  try {
    const completedCustomOrders = await db.select({
      packageId: customPaymentOrdersTable.packageId,
      premiumPriority: customPaymentOrdersTable.premiumPriority,
    }).from(customPaymentOrdersTable)
      .where(and(
        eq(customPaymentOrdersTable.userId, user.id),
        eq(customPaymentOrdersTable.type, "premium"),
        eq(customPaymentOrdersTable.status, "completed"),
      ))
      .orderBy(desc(customPaymentOrdersTable.id))
      .limit(50)

    for (const order of completedCustomOrders) {
      recoveredPriority = Math.max(recoveredPriority, order.premiumPriority || 0)
      if (!order.premiumPriority && order.packageId) {
        const pkg = await getPremiumPackage(order.packageId)
        recoveredPriority = Math.max(recoveredPriority, pkg?.priority || 0)
      }
    }
  } catch {
    // Some legacy installations do not have the manual-order table yet.
  }

  if (recoveredPriority > currentPriority) {
    await db.update(usersTable)
      .set({ premiumPriority: recoveredPriority })
      .where(eq(usersTable.id, user.id))
      .catch(() => {})
  }

  return recoveredPriority
}

/**
 * Repair the legacy admin fulfillment bug that treated every "week" package
 * as 30 days. This only changes a row when its stored expiry exactly matches
 * the old order-derived schedule, so manual grants remain authoritative.
 */
async function repairLegacyWeekExpiry(user: PremiumUser): Promise<number | null> {
  if (!user.id || user.premium !== 1 || !user.premiumExpiry) return null

  try {
    const [packages, paidOrders, customOrders] = await Promise.all([
      getPremiumPackages(),
      db.select({
        time: ordersTable.time,
        packageId: ordersTable.packageId,
        premiumDays: ordersTable.premiumDays,
        description: ordersTable.description,
      }).from(ordersTable).where(and(
        eq(ordersTable.userId, user.id),
        eq(ordersTable.type, "premium"),
        eq(ordersTable.status, "completed"),
      )),
      db.select({
        time: customPaymentOrdersTable.time,
        packageId: customPaymentOrdersTable.packageId,
        premiumDays: customPaymentOrdersTable.premiumDays,
      }).from(customPaymentOrdersTable).where(and(
        eq(customPaymentOrdersTable.userId, user.id),
        eq(customPaymentOrdersTable.type, "premium"),
        eq(customPaymentOrdersTable.status, "completed"),
      )),
    ])

    const orders = [
      ...paidOrders.map((order: any) => ({
        time: Number(order.time || 0),
        days: Number(order.premiumDays || 0) || packages[Number(order.packageId || 0)]?.days || parsePremiumDays(order.description || ""),
        legacyDays: Number(order.premiumDays || 0) || packages[Number(order.packageId || 0)]?.days ||
          (/week/i.test(order.description || "") ? 30 : parsePremiumDays(order.description || "")),
      })),
      ...customOrders.map((order: any) => {
        const pkg = packages[Number(order.packageId || 0)]
        return {
          time: Number(order.time || 0),
          days: Number(order.premiumDays || 0) || pkg?.days || null,
          legacyDays: Number(order.premiumDays || 0) || pkg?.days || null,
        }
      }),
    ]
      .filter(order => order.time > 0 && order.days && order.legacyDays)
      .sort((a, b) => a.time - b.time)

    if (!orders.some(order => order.legacyDays !== order.days)) return null

    let correctedExpiry = 0
    let legacyExpiry = 0
    for (const order of orders) {
      correctedExpiry = Math.max(correctedExpiry, order.time) + Number(order.days) * 86400
      legacyExpiry = Math.max(legacyExpiry, order.time) + Number(order.legacyDays) * 86400
    }

    if (correctedExpiry > 0 && legacyExpiry !== correctedExpiry && Number(user.premiumExpiry) === legacyExpiry) {
      await db.update(usersTable).set({ premiumExpiry: correctedExpiry }).where(eq(usersTable.id, user.id))
      return correctedExpiry
    }
  } catch {
    // Entitlement checks must still work if legacy order data is unavailable.
  }
  return null
}

export async function withEffectivePremiumPriority<T extends PremiumUser>(user: T): Promise<T> {
  const repairedExpiry = await repairLegacyWeekExpiry(user)
  const effectiveUser = repairedExpiry ? { ...user, premiumExpiry: repairedExpiry } : user
  if (!isActivePremium(effectiveUser)) {
    if (effectiveUser.id && effectiveUser.premium === 1 && (effectiveUser.premiumExpiry || 0) > 0) {
      await db.update(usersTable)
        .set({ premium: 0, premiumPriority: 0 })
        .where(eq(usersTable.id, effectiveUser.id))
        .catch(() => {})
    }
    return { ...effectiveUser, premium: 0, premiumPriority: 0 }
  }
  const premiumPriority = await getEffectivePremiumPriority(effectiveUser)
  return { ...effectiveUser, premium: 1, premiumPriority }
}

/** Apply expiry to rows that are returned as part of another user's list. */
export function toEffectivePremiumUser<T extends PremiumUser>(user: T): T {
  if (!isActivePremium(user)) return { ...user, premium: 0, premiumPriority: 0 }
  return { ...user, premium: 1 }
}