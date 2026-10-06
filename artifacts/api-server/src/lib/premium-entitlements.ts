import { db } from "@workspace/db"
import { customPaymentOrdersTable, ordersTable, usersTable } from "@workspace/db/schema"
import { and, desc, eq, inArray } from "drizzle-orm"
import { getPremiumPackage, getPremiumPackageSettings, getPremiumPackages, parsePremiumDays } from "./premium-packages"
import { isActivePremium } from "./contact-filter"
import {
  calculatePremiumEntitlementFromOrders,
  type PremiumPurchaseRecord,
} from "./premium-entitlement-calculation"

type PremiumUser = {
  id?: number
  premium?: number | null
  premiumExpiry?: number | null
  premiumPriority?: number | null
  fake?: number | null
}

export type PremiumActivation = {
  days: number
  priority: number
  startedAt?: number
}

type PremiumEntitlementFields = {
  premium: number
  premiumExpiry: number
  premiumPriority: number
}

type EntitlementCacheEntry = {
  fingerprint: string
  expiresAt: number
  entitlement: PremiumEntitlementFields | null
}

const entitlementCache = new Map<number, EntitlementCacheEntry>()
const ENTITLEMENT_CACHE_TTL_MS = 15_000

function entitlementFingerprint(user: PremiumUser): string {
  return `${user.premium || 0}:${user.premiumExpiry || 0}:${user.premiumPriority || 0}`
}

export function clearPremiumEntitlementCache(): void {
  entitlementCache.clear()
}

async function getCurrentPackageEntitlement(user: PremiumUser): Promise<PremiumUser | null> {
  if (!user.id || !isActivePremium(user) || Number(user.premiumExpiry || 0) <= 0) return null

  const fingerprint = entitlementFingerprint(user)
  const cached = entitlementCache.get(user.id)
  if (cached && cached.fingerprint === fingerprint && cached.expiresAt > Date.now()) {
    return cached.entitlement ? { ...user, ...cached.entitlement } : null
  }

  try {
    const [packages, regularOrders] = await Promise.all([
      getPremiumPackageSettings(),
      db.select({
        id: ordersTable.id,
        time: ordersTable.time,
        packageId: ordersTable.packageId,
        premiumDays: ordersTable.premiumDays,
        premiumPriority: ordersTable.premiumPriority,
        description: ordersTable.description,
      }).from(ordersTable).where(and(
        eq(ordersTable.userId, user.id),
        eq(ordersTable.type, "premium"),
        eq(ordersTable.status, "completed"),
      )),
    ])

    let manualOrders: PremiumPurchaseRecord[] = []
    try {
      manualOrders = await db.select({
        id: customPaymentOrdersTable.id,
        time: customPaymentOrdersTable.time,
        packageId: customPaymentOrdersTable.packageId,
        premiumDays: customPaymentOrdersTable.premiumDays,
        premiumPriority: customPaymentOrdersTable.premiumPriority,
      }).from(customPaymentOrdersTable).where(and(
        eq(customPaymentOrdersTable.userId, user.id),
        eq(customPaymentOrdersTable.type, "premium"),
        eq(customPaymentOrdersTable.status, "completed"),
      ))
    } catch {
      // Legacy installations may not have manual payment orders.
    }

    const calculated = calculatePremiumEntitlementFromOrders(
      [...regularOrders, ...manualOrders],
      packages,
      Math.floor(Date.now() / 1000),
    )
    const entitlement = calculated
      ? {
          premium: calculated.premium,
          premiumExpiry: calculated.premiumExpiry,
          premiumPriority: calculated.premiumPriority,
        }
      : null

    if (entitlement) {
      await db.update(usersTable).set(entitlement).where(eq(usersTable.id, user.id))
    }

    const cacheUser = entitlement ? { ...user, ...entitlement } : user
    entitlementCache.set(user.id, {
      fingerprint: entitlementFingerprint(cacheUser),
      expiresAt: Date.now() + ENTITLEMENT_CACHE_TTL_MS,
      entitlement,
    })
    return entitlement ? cacheUser : null
  } catch {
    // If order history is unavailable, preserve the already-stored entitlement.
    return null
  }
}

/**
 * Recalculate all currently active, package-backed subscriptions after an
 * admin changes package settings. Expired accounts are not reactivated by a
 * later increase in package duration; manual grants without package orders
 * remain untouched.
 */
export async function recalculateActivePremiumSubscriptions(): Promise<{
  recalculatedSubscriptions: number
  expiredSubscriptions: number
}> {
  clearPremiumEntitlementCache()

  const [packageSettings, premiumUsers] = await Promise.all([
    getPremiumPackageSettings(),
    db.select({
      id: usersTable.id,
      premium: usersTable.premium,
      premiumExpiry: usersTable.premiumExpiry,
      premiumPriority: usersTable.premiumPriority,
    }).from(usersTable).where(eq(usersTable.premium, 1)),
  ])
  const activeUsers = premiumUsers.filter((user: PremiumUser) =>
    user.id &&
    Number(user.premiumExpiry || 0) > 0 &&
    isActivePremium(user)
  )
  if (activeUsers.length === 0) return { recalculatedSubscriptions: 0, expiredSubscriptions: 0 }

  const ordersByUser = new Map<number, PremiumPurchaseRecord[]>()
  const appendOrders = (rows: Array<PremiumPurchaseRecord & { userId: number }>) => {
    for (const row of rows) {
      const list = ordersByUser.get(row.userId) || []
      list.push(row)
      ordersByUser.set(row.userId, list)
    }
  }

  const userIds = activeUsers.map((user: PremiumUser) => user.id as number)
  for (let offset = 0; offset < userIds.length; offset += 500) {
    const batch = userIds.slice(offset, offset + 500)
    const [regularOrders, manualOrders] = await Promise.all([
      db.select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        time: ordersTable.time,
        packageId: ordersTable.packageId,
        premiumDays: ordersTable.premiumDays,
        premiumPriority: ordersTable.premiumPriority,
        description: ordersTable.description,
      }).from(ordersTable).where(and(
        eq(ordersTable.type, "premium"),
        eq(ordersTable.status, "completed"),
        inArray(ordersTable.userId, batch),
      )),
      db.select({
        id: customPaymentOrdersTable.id,
        userId: customPaymentOrdersTable.userId,
        time: customPaymentOrdersTable.time,
        packageId: customPaymentOrdersTable.packageId,
        premiumDays: customPaymentOrdersTable.premiumDays,
        premiumPriority: customPaymentOrdersTable.premiumPriority,
      }).from(customPaymentOrdersTable).where(and(
        eq(customPaymentOrdersTable.type, "premium"),
        eq(customPaymentOrdersTable.status, "completed"),
        inArray(customPaymentOrdersTable.userId, batch),
      )).catch(() => []),
    ])
    appendOrders(regularOrders)
    appendOrders(manualOrders)
  }

  let recalculatedSubscriptions = 0
  let expiredSubscriptions = 0
  for (const user of activeUsers) {
    const orders = ordersByUser.get(user.id) || []
    const calculated = calculatePremiumEntitlementFromOrders(
      orders,
      packageSettings,
      Math.floor(Date.now() / 1000),
    )
    if (!calculated) continue
    recalculatedSubscriptions++
    const changed =
      Number(user.premium || 0) !== calculated.premium ||
      Number(user.premiumExpiry || 0) !== calculated.premiumExpiry ||
      Number(user.premiumPriority || 0) !== calculated.premiumPriority
    if (!changed) continue

    await db.update(usersTable).set({
      premium: calculated.premium,
      premiumExpiry: calculated.premiumExpiry,
      premiumPriority: calculated.premiumPriority,
    }).where(eq(usersTable.id, user.id))
    if (calculated.premium === 0) expiredSubscriptions++
  }

  clearPremiumEntitlementCache()
  return { recalculatedSubscriptions, expiredSubscriptions }
}

/**
 * Apply a purchased premium package. The order timestamp is the subscription
 * start date; fulfillment may happen later when a provider callback or admin
 * approval arrives.
 */
export async function activatePremiumEntitlement(userId: number, packageDetails: PremiumActivation): Promise<void> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  if (!user) return

  const currentTime = Math.floor(Date.now() / 1000)
  const startedAt = Number(packageDetails.startedAt || 0) > 0
    ? Math.floor(Number(packageDetails.startedAt))
    : currentTime
  const days = Math.max(1, Math.floor(Number(packageDetails.days) || 0))
  const priority = Math.max(1, Math.floor(Number(packageDetails.priority) || 1))
  const existingExpiry = Number(user.premiumExpiry || 0)
  const currentlyActive = user.premium === 1 && (existingExpiry === 0 || existingExpiry > currentTime)
  const baseExpiry = currentlyActive && existingExpiry > 0
    ? existingExpiry
    : startedAt

  await db.update(usersTable).set({
    premium: 1,
    premiumExpiry: baseExpiry + days * 86400,
    premiumPriority: Math.max(currentlyActive ? Number(user.premiumPriority || 0) : 0, priority),
  }).where(eq(usersTable.id, userId))
  entitlementCache.delete(userId)
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
        // The order label is the historical package snapshot when the
        // snapshot columns were not available. Prefer it over today's
        // package configuration so "2 Weeks" cannot become 30 days later.
        days: Number(order.premiumDays || 0) || parsePremiumDays(order.description || "") ||
          packages[Number(order.packageId || 0)]?.days,
        legacyDays: Number(order.premiumDays || 0) || (/week/i.test(order.description || "") ? 30 :
          parsePremiumDays(order.description || "") || packages[Number(order.packageId || 0)]?.days),
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
  const packageEntitlement = await getCurrentPackageEntitlement(user)
  if (packageEntitlement) return packageEntitlement as T

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