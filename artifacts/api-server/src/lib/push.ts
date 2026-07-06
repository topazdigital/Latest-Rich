import webpush from "web-push"
import { db, isMysql } from "@workspace/db"
import { pushSubscriptionsTable, siteConfigTable, usersTable } from "@workspace/db/schema"
import { eq, sql, inArray } from "drizzle-orm"
import { logger } from "./logger"

let vapidInitialized = false

async function getOrCreateVapidKeys(): Promise<{ publicKey: string; privateKey: string } | null> {
  try {
    const [pub] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "vapid_public_key")).limit(1)
    const [priv] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "vapid_private_key")).limit(1)

    if (pub?.value && priv?.value) {
      return { publicKey: pub.value, privateKey: priv.value }
    }

    const keys = webpush.generateVAPIDKeys()

    if (isMysql) {
      await db.insert(siteConfigTable).values({ key: "vapid_public_key", value: keys.publicKey })
        .onDuplicateKeyUpdate({ set: { value: keys.publicKey } })
      await db.insert(siteConfigTable).values({ key: "vapid_private_key", value: keys.privateKey })
        .onDuplicateKeyUpdate({ set: { value: keys.privateKey } })
    } else {
      await db.insert(siteConfigTable).values({ key: "vapid_public_key", value: keys.publicKey })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: keys.publicKey } })
      await db.insert(siteConfigTable).values({ key: "vapid_private_key", value: keys.privateKey })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: keys.privateKey } })
    }

    logger.info("Generated new VAPID keys")
    return keys
  } catch (err) {
    logger.error({ err }, "Failed to get/create VAPID keys")
    return null
  }
}

export async function initWebPush(): Promise<string | null> {
  if (vapidInitialized) return null
  const keys = await getOrCreateVapidKeys()
  if (!keys) return null

  webpush.setVapidDetails(
    "mailto:admin@richdatingnetwork.com",
    keys.publicKey,
    keys.privateKey,
  )
  vapidInitialized = true
  logger.info("Web Push initialized")
  return keys.publicKey
}

export async function getVapidPublicKey(): Promise<string | null> {
  const keys = await getOrCreateVapidKeys()
  return keys?.publicKey ?? null
}

export async function sendPushToUser(userId: number, payload: {
  title: string
  body: string
  url?: string
  icon?: string
}) {
  try {
    const subs = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId))
    if (subs.length === 0) return

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
      icon: payload.icon || "/icons/icon-192.svg",
    })

    await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)).catch(() => {})
          }
          throw err
        })
      )
    )
  } catch (err) {
    logger.error({ err, userId }, "Failed to send push to user")
  }
}

export async function sendPushToModerators(payload: {
  title: string
  body: string
  url?: string
  icon?: string
}) {
  try {
    const mods = await db.select({ userId: pushSubscriptionsTable.userId })
      .from(pushSubscriptionsTable)
      .innerJoin(usersTable, eq(usersTable.id, pushSubscriptionsTable.userId))
      .where(sql`${usersTable.admin} >= 1`)

    if (mods.length === 0) return

    const modIds = [...new Set(mods.map(m => m.userId))]
    const subs = await db.select().from(pushSubscriptionsTable)
      .where(inArray(pushSubscriptionsTable.userId, modIds.filter((id): id is number => id !== null && id !== undefined)))

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/moderator",
      icon: payload.icon || "/icons/icon-192.svg",
    })

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        ).catch(async (err: any) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint)).catch(() => {})
          }
          throw err
        })
      )
    )

    const sent = results.filter(r => r.status === "fulfilled").length
    if (sent > 0) logger.info({ sent, total: subs.length }, "Push notifications sent to moderators")
  } catch (err) {
    logger.error({ err }, "Failed to send push to moderators")
  }
}
