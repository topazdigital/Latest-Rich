/**
 * Automatic payment reconciler — runs every 10 minutes on the server.
 * Credits stuck pending orders that are older than 15 minutes by parsing
 * credits from the order description when the credits column is 0.
 * This ensures users always get their credits even if the PayHero callback
 * never fires (e.g. callback URL misconfigured, network timeout, etc.).
 */
import { db } from "@workspace/db"
import { ordersTable, usersTable, notificationsTable } from "@workspace/db/schema"
import { eq, and, lt, sql } from "drizzle-orm"
import { logger } from "./logger"

function now() { return Math.floor(Date.now() / 1000) }

function parseCreditsFromDescription(desc: string | null): number {
  if (!desc) return 0
  const m = desc.match(/^(\d+)\s*credits?/i)
  return m ? parseInt(m[1]) : 0
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
    for (const order of pending) {
      if (order.type !== "credits") continue
      const creditsFromDesc = parseCreditsFromDescription(order.description)
      const creditsToAdd = (order.credits && order.credits > 0) ? order.credits : creditsFromDesc
      if (creditsToAdd <= 0) continue

      try {
        // Atomically mark as completed ONLY if still pending — prevents double-credit
        // if the PayHero callback fires concurrently while the reconciler is running.
        await db.update(ordersTable)
          .set({ status: "completed", credits: creditsToAdd })
          .where(and(eq(ordersTable.id, order.id), eq(ordersTable.status, "pending")))

        // Re-fetch to confirm WE were the one that claimed it
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
        logger.info({ orderId: order.id, userId: order.userId, credits: creditsToAdd }, "[Reconciler] Auto-credited pending order")
      } catch (err) {
        logger.warn({ orderId: order.id, err }, "[Reconciler] Failed to fulfill order")
      }
    }

    if (fulfilled > 0) {
      logger.info({ fulfilled, checked: pending.length }, "[Reconciler] Auto-credit run complete")
    }
  } catch (err) {
    logger.warn({ err }, "[Reconciler] Reconcile run failed")
  }
}

export function startPaymentReconciler() {
  // Run once 2 minutes after startup (catches anything that failed during downtime)
  setTimeout(reconcile, 2 * 60 * 1000)
  // Then every 10 minutes
  setInterval(reconcile, 10 * 60 * 1000)
  logger.info("[Reconciler] Payment reconciler started (runs every 10 min)")
}
