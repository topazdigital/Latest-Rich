import { db } from "@workspace/db"
import { customPaymentOrdersTable, ordersTable, usersTable } from "@workspace/db/schema"
import { and, desc, eq } from "drizzle-orm"
import { getPremiumPackage } from "./premium-packages"
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

export async function withEffectivePremiumPriority<T extends PremiumUser>(user: T): Promise<T> {
  const premiumPriority = await getEffectivePremiumPriority(user)
  return { ...user, premiumPriority }
}