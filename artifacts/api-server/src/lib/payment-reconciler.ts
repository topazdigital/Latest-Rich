/**
 * Automatic payment reconciler — runs every 10 minutes on the server.
 * For PayHero orders: verifies with the PayHero API before crediting.
 *   - SUCCESS  → credit the user
 *   - FAILED / CANCELLED / TIMEOUT → mark as failed/cancelled (no credits)
 *   - still PENDING on PayHero → skip (check again next cycle)
 * For other payment methods (Stripe, Paystack, PayMongo):
 *   - Their own webhooks handle success; we only fulfil here if truly stuck.
 *   - We leave them pending (they have their own verification flows).
 */
import { db } from "@workspace/db"
import { ordersTable, usersTable, notificationsTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and, lt, sql } from "drizzle-orm"
import { logger } from "./logger"

function now() { return Math.floor(Date.now() / 1000) }

function parseCreditsFromDescription(desc: string | null): number {
  if (!desc) return 0
  const m = desc.match(/^(\d+)\s*credits?/i)
  return m ? parseInt(m[1]) : 0
}

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

/** Checks PayHero API for the given external reference.
 *  Returns "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING" | "UNKNOWN"
 */
async function checkPayHeroStatus(ref: string): Promise<"SUCCESS" | "FAILED" | "CANCELLED" | "PENDING" | "UNKNOWN"> {
  try {
    const apiUsername = await getConfig("payhero_api_username")
    const apiPassword = await getConfig("payhero_api_password")
    if (!apiUsername || !apiPassword) return "UNKNOWN"
    const credentials = Buffer.from(`${apiUsername}:${apiPassword}`).toString("base64")
    const response = await fetch(`https://backend.payhero.co.ke/api/v2/transaction-status/${ref}`, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return "UNKNOWN"
    const data = await response.json() as Record<string, unknown>
    const phStatus = String(data.status || "").toUpperCase()
    const resultCode = data.ResultCode ?? data.resultCode ?? null
    if (phStatus === "SUCCESS" || resultCode === 0) return "SUCCESS"
    if (phStatus === "FAILED" || phStatus === "TIMEOUT") return "FAILED"
    if (phStatus === "CANCELLED" || resultCode === 1032 || resultCode === "1032") return "CANCELLED"
    if (phStatus === "PENDING" || phStatus === "") return "PENDING"
    return "UNKNOWN"
  } catch (err) {
    logger.warn({ ref, err }, "[Reconciler] PayHero status check failed")
    return "UNKNOWN"
  }
}

/** Returns true if this looks like a PayHero order reference (RDN-{userId}-{ts}) */
function isPayHeroRef(ref: string | null): boolean {
  if (!ref) return false
  // PayHero: "RDN-123-1234567890"
  // Paystack: "RDN-PS-123-..." → excluded
  // Stripe: "cs_..." → excluded
  if (ref.startsWith("cs_")) return false
  if (ref.startsWith("RDN-PS-")) return false
  if (ref.startsWith("RDN-PM-")) return false
  if (ref.startsWith("STRAT-")) return false
  if (ref.match(/^RDN-\d+-\d+$/)) return true
  return false
}

async function reconcile() {
  try {
    const cutoff = now() - 15 * 60 // orders older than 15 minutes
    const pending = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "pending"), lt(ordersTable.time, cutoff)))
      .limit(100)

    if (pending.length === 0) return

    let fulfilled = 0
    let cancelled = 0
    for (const order of pending) {
      const ref = order.stripeSessionId

      // ── PayHero orders: verify before crediting ──────────────────────────
      if (isPayHeroRef(ref)) {
        const phResult = await checkPayHeroStatus(ref || "")

        if (phResult === "FAILED" || phResult === "CANCELLED") {
          // Payment was not made — mark the order so it never gets auto-credited
          await db.update(ordersTable)
            .set({ status: phResult === "CANCELLED" ? "cancelled" : "failed" })
            .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")))
          cancelled++
          logger.info({ orderId: order.id, ref, phResult }, "[Reconciler] Marked unpaid PayHero order as " + (phResult === "CANCELLED" ? "cancelled" : "failed"))
          continue
        }

        if (phResult === "PENDING" || phResult === "UNKNOWN") {
          // Payment still in-flight or API unavailable — skip this cycle
          logger.debug({ orderId: order.id, ref, phResult }, "[Reconciler] Skipping PayHero order (still pending or unknown)")
          continue
        }

        // phResult === "SUCCESS" → fall through to credit logic below
      } else {
        // Non-PayHero orders (Stripe, Paystack, etc.) — skip reconciliation.
        // Those providers handle their own webhooks; auto-crediting without
        // verification would grant free credits on cancelled Stripe sessions.
        continue
      }

      // ── Credit logic (PayHero SUCCESS only) ─────────────────────────────
      if (order.type !== "credits") continue
      const creditsFromDesc = parseCreditsFromDescription(order.description)
      const creditsToAdd = (order.credits && order.credits > 0) ? order.credits : creditsFromDesc
      if (creditsToAdd <= 0) continue

      try {
        await db.update(ordersTable)
          .set({ status: "completed", credits: creditsToAdd })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")))

        const [claimed] = await db.select().from(ordersTable).where(eq(ordersTable.id, order.id)).limit(1)
        if (claimed?.status !== "completed" || claimed?.credits !== creditsToAdd) continue

        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1)
        if (!user) continue

        await db.update(usersTable)
          .set({ credits: (user.credits || 0) + creditsToAdd })
          .where(eq(usersTable.id, order.userId))

        await db.insert(notificationsTable).values({
          userId: order.userId,
          type: "credits",
          message: `${creditsToAdd} credits have been added to your account.`,
          time: now(),
          read: 0,
        } as any).catch(() => {})

        fulfilled++
        logger.info({ orderId: order.id, userId: order.userId, credits: creditsToAdd }, "[Reconciler] Auto-credited verified PayHero order")
      } catch (err) {
        logger.warn({ orderId: order.id, err }, "[Reconciler] Failed to fulfill order")
      }
    }

    if (fulfilled > 0 || cancelled > 0) {
      logger.info({ fulfilled, cancelled, checked: pending.length }, "[Reconciler] Auto-credit run complete")
    }
  } catch (err) {
    logger.warn({ err }, "[Reconciler] Reconcile run failed")
  }
}

export function startPaymentReconciler() {
  setTimeout(reconcile, 2 * 60 * 1000)
  setInterval(reconcile, 10 * 60 * 1000)
  logger.info("[Reconciler] Payment reconciler started (runs every 10 min)")
}
