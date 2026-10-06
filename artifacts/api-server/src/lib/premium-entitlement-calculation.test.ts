import assert from "node:assert/strict"
import { test } from "node:test"
import { calculatePremiumEntitlementFromOrders, parsePremiumDays } from "./premium-entitlement-calculation"

const DAY = 86400
const now = 2_000_000_000

test("applies the current admin duration to a previous package purchase", () => {
  const purchasedAt = now - 60 * DAY
  const result = calculatePremiumEntitlementFromOrders(
    [{ id: 1, time: purchasedAt, packageId: 1, premiumDays: 30, premiumPriority: 1 }],
    { 1: { days: 7, priority: 1 } },
    now,
  )

  assert.ok(result)
  assert.equal(result.premiumExpiry, purchasedAt + 7 * DAY)
  assert.equal(result.premium, 0)
  assert.equal(result.premiumPriority, 0)
})

test("applies current days and priority when a member is still within the plan", () => {
  const purchasedAt = now - 10 * DAY
  const result = calculatePremiumEntitlementFromOrders(
    [{ id: 2, time: purchasedAt, packageId: 2, premiumDays: 14, premiumPriority: 2 }],
    { 2: { days: 30, priority: 3 } },
    now,
  )

  assert.ok(result)
  assert.equal(result.premium, 1)
  assert.equal(result.premiumExpiry, purchasedAt + 30 * DAY)
  assert.equal(result.premiumPriority, 3)
})

test("stacks overlapping purchases and uses the highest current tier", () => {
  const result = calculatePremiumEntitlementFromOrders(
    [
      { id: 1, time: now - 2 * DAY, packageId: 1 },
      { id: 2, time: now - DAY, packageId: 2 },
    ],
    { 1: { days: 7, priority: 1 }, 2: { days: 14, priority: 2 } },
    now,
  )

  assert.ok(result)
  assert.equal(result.premiumExpiry, now - 2 * DAY + 7 * DAY + 14 * DAY)
  assert.equal(result.premiumPriority, 2)
})

test("does not carry a previous tier into a new term after expiry", () => {
  const result = calculatePremiumEntitlementFromOrders(
    [
      { id: 1, time: now - 100 * DAY, packageId: 1 },
      { id: 2, time: now - 5 * DAY, packageId: 2 },
    ],
    { 1: { days: 7, priority: 3 }, 2: { days: 30, priority: 1 } },
    now,
  )

  assert.ok(result)
  assert.equal(result.premium, 1)
  assert.equal(result.premiumPriority, 1)
  assert.equal(result.premiumExpiry, now + 25 * DAY)
})

test("falls back to saved order details when a package slot has no current settings", () => {
  const result = calculatePremiumEntitlementFromOrders(
    [{ id: 3, time: now - DAY, packageId: 9, premiumDays: 14, premiumPriority: 2 }],
    {},
    now,
  )

  assert.ok(result)
  assert.equal(result.premiumExpiry, now + 13 * DAY)
  assert.equal(result.premiumPriority, 2)
})

test("parses historical duration labels with their correct units", () => {
  assert.equal(parsePremiumDays("7 Days"), 7)
  assert.equal(parsePremiumDays("2 Weeks"), 14)
  assert.equal(parsePremiumDays("1 Month"), 30)
  assert.equal(parsePremiumDays("1 Year"), 365)
})
