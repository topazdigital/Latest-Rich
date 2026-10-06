export type PremiumPackageTerms = {
  days?: number | null
  priority?: number | null
}

export type PremiumPurchaseRecord = {
  id?: number | null
  time?: number | string | null
  packageId?: number | string | null
  premiumDays?: number | null
  premiumPriority?: number | null
  description?: string | null
}

export type CalculatedPremiumEntitlement = {
  premium: 0 | 1
  premiumExpiry: number
  premiumPriority: number
  processedOrders: number
}

/** Parse a saved plan label without treating weeks as months. */
export function parsePremiumDays(label: string): number | null {
  const match = String(label || "").match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|year|years)\b/i)
  if (!match) return null
  const quantity = Number(match[1])
  if (!Number.isFinite(quantity) || quantity <= 0) return null
  const unit = match[2].toLowerCase()
  const multiplier = unit.startsWith("year") ? 365 : unit.startsWith("month") ? 30 : unit.startsWith("week") ? 7 : 1
  return Math.max(1, Math.round(quantity * multiplier))
}

function positiveInteger(value: unknown): number | null {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return Math.floor(number)
}

/**
 * Rebuild a currently-active member's package entitlement using today's admin
 * package settings. Completed-order snapshots are used only when a package
 * slot no longer has usable settings.
 */
export function calculatePremiumEntitlementFromOrders(
  orders: readonly PremiumPurchaseRecord[],
  currentPackages: Record<number, PremiumPackageTerms>,
  now: number,
): CalculatedPremiumEntitlement | null {
  const sortedOrders = orders
    .map((order, index) => ({
      order,
      index,
      time: Number(order.time || 0),
    }))
    .filter(({ order, time }) => time > 0 && (
      Number(order.packageId || 0) > 0 ||
      positiveInteger(order.premiumDays) !== null ||
      parsePremiumDays(order.description || "") !== null
    ))
    .sort((a, b) => a.time - b.time || Number(a.order.id || a.index) - Number(b.order.id || b.index) || a.index - b.index)

  if (sortedOrders.length === 0) return null

  let expiry = 0
  let priority = 0
  let processedOrders = 0

  for (const { order, time } of sortedOrders) {
    const packageId = Number(order.packageId || 0)
    const configuredPackage = packageId > 0 ? currentPackages[packageId] : undefined
    const days = positiveInteger(configuredPackage?.days)
      ?? positiveInteger(order.premiumDays)
      ?? parsePremiumDays(order.description || "")
    if (!days) continue

    const currentPriority = positiveInteger(configuredPackage?.priority)
      ?? positiveInteger(order.premiumPriority)
      ?? 1

    // A purchase while premium is active extends the existing term and keeps
    // its highest configured tier. A later purchase after expiry starts a new
    // term at that package's current tier.
    priority = expiry > time ? Math.max(priority, currentPriority) : currentPriority
    expiry = Math.max(expiry, time) + days * 86400
    processedOrders++
  }

  if (processedOrders === 0) return null
  const active = expiry > now
  return {
    premium: active ? 1 : 0,
    premiumExpiry: expiry,
    premiumPriority: active ? priority : 0,
    processedOrders,
  }
}
