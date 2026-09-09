import crypto from "crypto"
import { db } from "@workspace/db"
import { chatmodzDeliveriesTable, messagesTable, usersTable } from "@workspace/db/schema"
import { and, eq, lte, or } from "drizzle-orm"

const CHATMODZ_BASE_URL = (process.env.CHATMODZ_BASE_URL || "https://chatmodz.com").replace(/\/+$/, "")
const CHATMODZ_SITE_KEY = process.env.CHATMODZ_SITE_KEY || "site_one"
const CHATMODZ_SECRET_ENV = process.env.CHATMODZ_SECRET_ENV || "SITE_ONE_SECRET"
const MAX_ATTEMPTS = 8
const DELIVERY_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 10_000

type ChatmodzDelivery = typeof chatmodzDeliveriesTable.$inferSelect

function now() {
  return Math.floor(Date.now() / 1000)
}

function getSecret() {
  return process.env[CHATMODZ_SECRET_ENV] || ""
}

export function chatmodzSignature(timestamp: string, body: string, secret = getSecret()) {
  return `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`
}

export function chatmodzConversationId(memberId: number, managedProfileId: number) {
  return `rdn-${Math.min(memberId, managedProfileId)}-${Math.max(memberId, managedProfileId)}`
}

function isDuplicateError(error: any) {
  return error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY" || error?.code === "23505"
}

function retryDelay(attempts: number) {
  return Math.min(15 * 60, Math.max(30, 30 * 2 ** Math.max(0, attempts - 1)))
}

async function postSignedJson(path: string, payload: Record<string, unknown>) {
  const secret = getSecret()
  if (!secret) throw new Error(`${CHATMODZ_SECRET_ENV} is not configured`)

  const timestamp = new Date().toISOString()
  const body = JSON.stringify(payload)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${CHATMODZ_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Chatmodz-Timestamp": timestamp,
        "X-Chatmodz-Signature": chatmodzSignature(timestamp, body, secret),
      },
      body,
      signal: controller.signal,
    })
    if (!response.ok) {
      const responseText = (await response.text()).slice(0, 300)
      throw new Error(`Chatmodz returned HTTP ${response.status}${responseText ? `: ${responseText}` : ""}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function getMemberMessage(messageId: number) {
  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1)
  if (!message || !message.message?.trim()) return null

  const users = await db.select().from(usersTable)
    .where(or(eq(usersTable.id, message.u1), eq(usersTable.id, message.u2)))
  const sender = users.find((user: any) => user.id === message.u1)
  const recipient = users.find((user: any) => user.id === message.u2)
  if (!sender || !recipient || sender.fake === 1 || recipient.fake !== 1) return null

  return {
    message,
    member: sender,
    managedProfile: recipient,
    eventId: `rdn-message-${message.id}`,
    conversationId: chatmodzConversationId(sender.id, recipient.id),
  }
}

async function markDelivery(deliveryId: number, values: Record<string, unknown>) {
  await db.update(chatmodzDeliveriesTable)
    .set(values as any)
    .where(eq(chatmodzDeliveriesTable.id, deliveryId))
}

async function deliverOne(delivery: ChatmodzDelivery) {
  const claimedAttempts = Number(delivery.attempts || 0) + 1
  await markDelivery(delivery.id, {
    status: "sending",
    attempts: claimedAttempts,
    lastError: "",
  })

  try {
    const details = await getMemberMessage(Number(delivery.messageId))
    if (!details) {
      await markDelivery(delivery.id, {
        status: "skipped",
        lastError: "Message is not a text message from a real member to a managed profile",
        deliveredAt: now(),
      })
      return
    }

    await postSignedJson(`/api/chatmodz/integrations/${encodeURIComponent(CHATMODZ_SITE_KEY)}/messages`, {
      eventId: details.eventId,
      conversationId: details.conversationId,
      messageId: details.eventId,
      memberAlias: details.member.name || `Member ${details.member.id}`,
      managedProfileAlias: details.managedProfile.name || `Managed profile ${details.managedProfile.id}`,
      sender: "member",
      body: details.message.message.trim(),
      sentAt: new Date(Number(details.message.time || now()) * 1000).toISOString(),
    })

    await markDelivery(delivery.id, {
      status: "delivered",
      lastError: "",
      deliveredAt: now(),
      nextAttemptAt: 0,
    })
  } catch (error: any) {
    const message = String(error?.message || "Chatmodz delivery failed").slice(0, 500)
    const exhausted = claimedAttempts >= MAX_ATTEMPTS
    await markDelivery(delivery.id, {
      status: exhausted ? "failed" : "pending",
      lastError: message,
      nextAttemptAt: exhausted ? 0 : now() + retryDelay(claimedAttempts),
    })
    console.error("[Chatmodz] Member message delivery failed", {
      deliveryId: delivery.id,
      messageId: delivery.messageId,
      attempts: claimedAttempts,
      error: message,
    })
  }
}

export async function queueChatmodzMessage(messageId: number) {
  if (!getSecret()) return
  const details = await getMemberMessage(messageId)
  if (!details) return

  const [existing] = await db.select().from(chatmodzDeliveriesTable)
    .where(and(
      eq(chatmodzDeliveriesTable.direction, "to_chatmodz"),
      eq(chatmodzDeliveriesTable.externalEventId, details.eventId),
    ))
    .limit(1)

  let delivery = existing
  if (!delivery) {
    try {
      await db.insert(chatmodzDeliveriesTable).values({
        direction: "to_chatmodz",
        externalEventId: details.eventId,
        conversationId: details.conversationId,
        messageId: messageId,
        status: "pending",
        attempts: 0,
        nextAttemptAt: 0,
        lastError: "",
        createdAt: now(),
        deliveredAt: 0,
      })
      const [created] = await db.select().from(chatmodzDeliveriesTable)
        .where(and(
          eq(chatmodzDeliveriesTable.direction, "to_chatmodz"),
          eq(chatmodzDeliveriesTable.externalEventId, details.eventId),
        ))
        .limit(1)
      delivery = created
    } catch (error) {
      if (!isDuplicateError(error)) throw error
      const [created] = await db.select().from(chatmodzDeliveriesTable)
        .where(and(
          eq(chatmodzDeliveriesTable.direction, "to_chatmodz"),
          eq(chatmodzDeliveriesTable.externalEventId, details.eventId),
        ))
        .limit(1)
      delivery = created
    }
  }

  if (delivery && delivery.status !== "delivered" && delivery.status !== "skipped") {
    await deliverOne(delivery)
  }
}

export async function processPendingChatmodzDeliveries() {
  const pending = await db.select().from(chatmodzDeliveriesTable)
    .where(and(
      eq(chatmodzDeliveriesTable.direction, "to_chatmodz"),
      or(eq(chatmodzDeliveriesTable.status, "pending"), eq(chatmodzDeliveriesTable.status, "failed")),
      lte(chatmodzDeliveriesTable.nextAttemptAt, now()),
    ))
    .limit(50)

  for (const delivery of pending) {
    if (Number(delivery.attempts || 0) < MAX_ATTEMPTS) {
      await deliverOne(delivery)
    }
  }
}

export function startChatmodzDeliveryWorker() {
  if (!getSecret()) {
    console.info(`[Chatmodz] Delivery worker disabled: ${CHATMODZ_SECRET_ENV} is not configured`)
    return null
  }
  processPendingChatmodzDeliveries().catch(error => {
    console.error("[Chatmodz] Initial delivery scan failed", error)
  })
  const timer = setInterval(() => {
    processPendingChatmodzDeliveries().catch(error => {
      console.error("[Chatmodz] Delivery scan failed", error)
    })
  }, DELIVERY_INTERVAL_MS)
  timer.unref?.()
  return timer
}