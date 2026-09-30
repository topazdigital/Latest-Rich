import crypto from "crypto"
import { db } from "@workspace/db"
import { chatmodzDeliveriesTable, messagesTable, photosTable, usersTable } from "@workspace/db/schema"
import { and, desc, eq, lte, or } from "drizzle-orm"

const CHATMODZ_BASE_URL = (process.env.CHATMODZ_BASE_URL || "https://chatmodz.com").replace(/\/+$/, "")
const CHATMODZ_SITE_KEY = process.env.CHATMODZ_SITE_KEY || "site_one"
const CHATMODZ_SECRET_ENV = process.env.CHATMODZ_SECRET_ENV || "SITE_ONE_SECRET"
const MAX_ATTEMPTS = 8
const DELIVERY_INTERVAL_MS = 30_000
const REQUEST_TIMEOUT_MS = 10_000

type ChatmodzDelivery = typeof chatmodzDeliveriesTable.$inferSelect
type ChatmodzDeliveryOutcome = "delivered" | "already_delivered" | "pending" | "failed" | "skipped" | "disabled"

function now() {
  return Math.floor(Date.now() / 1000)
}

function getSecret() {
  return process.env[CHATMODZ_SECRET_ENV] || ""
}

function chatmodzPhotoUrl(user: any) {
  let photo = String(user?.photoThumb || user?.photo || "").trim()
  if (!photo) return undefined

  try {
    const parsed = new URL(photo.startsWith("//") ? "https:" + photo : photo)
    if (parsed.hostname.toLowerCase() === "richdatingnetwork.com" || parsed.hostname.toLowerCase().endsWith(".richdatingnetwork.com")) {
      photo = parsed.pathname + parsed.search + parsed.hash
    }
  } catch {
    // Legacy database values are often stored as a relative path or filename.
  }

  if (photo.startsWith("/api/uploads/")) return photo
  for (const prefix of ["/assets/sources/uploads/", "assets/sources/uploads/", "/uploads/", "uploads/", "/photos/", "photos/"]) {
    if (photo.startsWith(prefix)) return "/api/uploads/" + photo.slice(prefix.length)
  }
  return photo.startsWith("/") ? photo : "/api/uploads/" + photo
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
    const responseText = await response.text()
    if (!responseText) return {}
    try {
      return JSON.parse(responseText)
    } catch {
      return {}
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function withProfilePhoto(user: any) {
  const currentPhoto = String(user?.photo || user?.photoThumb || "").trim()
  if (currentPhoto) return user

  const [profilePhoto] = await db.select({ photo: photosTable.photo, thumb: photosTable.thumb })
    .from(photosTable)
    .where(and(eq(photosTable.userId, user.id), eq(photosTable.approved, 1)))
    .orderBy(desc(photosTable.main), desc(photosTable.id))
    .limit(1)
  return profilePhoto
    ? { ...user, photo: profilePhoto.photo, photoThumb: profilePhoto.thumb || profilePhoto.photo }
    : user
}

async function getChatmodzMessage(messageId: number) {
  const [message] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1)
  if (!message) return null

  const body = typeof message.message === "string" ? message.message.trim() : ""
  const requestedMediaUrl = typeof message.mediaUrl === "string" ? message.mediaUrl.trim() : ""
  const requestedMediaType = typeof message.mediaType === "string" ? message.mediaType.trim().toLowerCase() : ""
  const mediaType = ["image", "video", "audio"].includes(requestedMediaType) ? requestedMediaType : ""
  const mediaUrl = mediaType ? requestedMediaUrl : ""
  if (!body && !mediaUrl) return null

  const users = await db.select().from(usersTable)
    .where(or(eq(usersTable.id, message.u1), eq(usersTable.id, message.u2)))
  const sender = users.find((user: any) => user.id === message.u1)
  const recipient = users.find((user: any) => user.id === message.u2)
  if (!sender || !recipient || Number(sender.fake) === Number(recipient.fake)) return null
  const senderIsManagedProfile = Number(sender.fake) === 1
  const member = senderIsManagedProfile ? recipient : sender
  const managedProfile = senderIsManagedProfile ? sender : recipient
  if (Number(member.fake) === 1 || Number(managedProfile.fake) !== 1) return null
  const [memberWithPhoto, managedProfileWithPhoto] = await Promise.all([withProfilePhoto(member), withProfilePhoto(managedProfile)])

  return {
    message,
    body,
    mediaUrl,
    mediaType,
    member: memberWithPhoto,
    managedProfile: managedProfileWithPhoto,
    senderType: senderIsManagedProfile ? "managed_profile" as const : "member" as const,
    eventId: `rdn-message-${message.id}`,
    conversationId: chatmodzConversationId(member.id, managedProfile.id),
  }
}

async function markDelivery(deliveryId: number, values: Record<string, unknown>) {
  await db.update(chatmodzDeliveriesTable)
    .set(values as any)
    .where(eq(chatmodzDeliveriesTable.id, deliveryId))
}

async function deliverOne(delivery: ChatmodzDelivery): Promise<ChatmodzDeliveryOutcome> {
  const claimedAttempts = Number(delivery.attempts || 0) + 1
  await markDelivery(delivery.id, {
    status: "sending",
    attempts: claimedAttempts,
    lastError: "",
  })

  try {
    const details = await getChatmodzMessage(Number(delivery.messageId))
    if (!details) {
      await markDelivery(delivery.id, {
        status: "skipped",
        lastError: "Message is not between a member and a managed profile, or has no content",
        deliveredAt: now(),
      })
      return "skipped"
    }

    await postSignedJson(`/api/chatmodz/integrations/${encodeURIComponent(CHATMODZ_SITE_KEY)}/messages`, {
      eventId: details.eventId,
      conversationId: details.conversationId,
      messageId: details.eventId,
      memberAlias: details.member.name || `Member ${details.member.id}`,
      managedProfileAlias: details.managedProfile.name || `Managed profile ${details.managedProfile.id}`,
      memberPhotoUrl: chatmodzPhotoUrl(details.member),
      managedProfilePhotoUrl: chatmodzPhotoUrl(details.managedProfile),
      sender: details.senderType,
      body: details.body,
      mediaUrl: details.mediaUrl,
      mediaType: details.mediaType,
      sentAt: new Date(Number(details.message.time || now()) * 1000).toISOString(),
    })

    await markDelivery(delivery.id, {
      status: "delivered",
      lastError: "",
      deliveredAt: now(),
      nextAttemptAt: 0,
    })
    return "delivered"
  } catch (error: any) {
    const message = String(error?.message || "Chatmodz delivery failed").slice(0, 500)
    const exhausted = claimedAttempts >= MAX_ATTEMPTS
    await markDelivery(delivery.id, {
      status: exhausted ? "failed" : "pending",
      lastError: message,
      nextAttemptAt: exhausted ? 0 : now() + retryDelay(claimedAttempts),
    })
    console.error("[Chatmodz] Message delivery failed", {
      deliveryId: delivery.id,
      messageId: delivery.messageId,
      attempts: claimedAttempts,
      error: message,
    })
    return exhausted ? "failed" : "pending"
  }
}

export async function syncExistingChatmodzProfiles() {
  if (!getSecret()) throw new Error(`${CHATMODZ_SECRET_ENV} is not configured`)

  const [messagePairs, users] = await Promise.all([
    db.select({ u1: messagesTable.u1, u2: messagesTable.u2 }).from(messagesTable),
    db.select().from(usersTable),
  ])
  const usersById = new Map<number, any>(users.map((user: any) => [Number(user.id), user] as [number, any]))
  const pairs = new Map<string, { memberId: number; managedProfileId: number }>()

  for (const row of messagePairs) {
    const first = usersById.get(Number(row.u1))
    const second = usersById.get(Number(row.u2))
    if (!first || !second) continue
    const member = first.fake === 1 ? second : first
    const managedProfile = first.fake === 1 ? first : second
    if (member.fake === 1 || managedProfile.fake !== 1) continue
    pairs.set(chatmodzConversationId(member.id, managedProfile.id), { memberId: member.id, managedProfileId: managedProfile.id })
  }

  let synced = 0
  let failed = 0
  const entries = [...pairs.values()]
  for (let offset = 0; offset < entries.length; offset += 10) {
    const results = await Promise.allSettled(entries.slice(offset, offset + 10).map(async ({ memberId, managedProfileId }) => {
      const [memberRow, managedProfileRow] = await Promise.all([
        db.select().from(usersTable).where(eq(usersTable.id, memberId)).limit(1),
        db.select().from(usersTable).where(eq(usersTable.id, managedProfileId)).limit(1),
      ])
      const member = memberRow[0]
      const managedProfile = managedProfileRow[0]
      if (!member || !managedProfile) return false
      const [memberWithPhoto, managedProfileWithPhoto] = await Promise.all([
        withProfilePhoto(member),
        withProfilePhoto(managedProfile),
      ])
      const memberPhotoUrl = chatmodzPhotoUrl(memberWithPhoto)
      const managedProfilePhotoUrl = chatmodzPhotoUrl(managedProfileWithPhoto)
      if (!memberPhotoUrl && !managedProfilePhotoUrl) return false
      const result = await postSignedJson("/api/chatmodz/integrations/" + encodeURIComponent(CHATMODZ_SITE_KEY) + "/profiles", {
        conversationId: chatmodzConversationId(member.id, managedProfile.id),
        memberId: member.id,
        managedProfileId: managedProfile.id,
        memberAlias: member.name || `Member ${member.id}`,
        managedProfileAlias: managedProfile.name || `Managed profile ${managedProfile.id}`,
        memberPhotoUrl,
        managedProfilePhotoUrl,
      })
      return (result as any)?.updated !== false
    }))
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) synced++
      else if (result.status === 'rejected') {
        failed++
        console.error('[Chatmodz] Profile sync failed', result.reason)
      }
    }
  }

  return { examined: entries.length, synced, failed }
}

export async function queueChatmodzMessage(messageId: number): Promise<ChatmodzDeliveryOutcome> {
  if (!getSecret()) return "disabled"
  const details = await getChatmodzMessage(messageId)
  if (!details) return "skipped"

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

  if (!delivery) return "failed"
  if (delivery.status === "delivered") return "already_delivered"
  if (delivery.status === "skipped") {
    await markDelivery(delivery.id, {
      status: "pending",
      attempts: 0,
      nextAttemptAt: 0,
      lastError: "",
    })
    delivery = { ...delivery, status: "pending", attempts: 0 } as ChatmodzDelivery
  }
  return deliverOne(delivery)
}

export async function syncExistingChatmodzMessages() {
  if (!getSecret()) throw new Error(`${CHATMODZ_SECRET_ENV} is not configured`)

  const [messageRows, users] = await Promise.all([
    db.select({ id: messagesTable.id, u1: messagesTable.u1, u2: messagesTable.u2 }).from(messagesTable).orderBy(messagesTable.id),
    db.select({ id: usersTable.id, fake: usersTable.fake }).from(usersTable),
  ])
  const usersById = new Map<number, any>(users.map((user: any) => [Number(user.id), user] as [number, any]))
  const messageIds = messageRows
    .filter((row: any) => {
      const sender = usersById.get(Number(row.u1))
      const recipient = usersById.get(Number(row.u2))
      return sender && recipient && Number(sender.fake) !== Number(recipient.fake)
    })
    .map((row: any) => Number(row.id))

  const totals = { examined: messageIds.length, delivered: 0, alreadyDelivered: 0, pending: 0, failed: 0, skipped: 0 }
  for (let offset = 0; offset < messageIds.length; offset += 10) {
    const results = await Promise.allSettled(messageIds.slice(offset, offset + 10).map(queueChatmodzMessage))
    for (const result of results) {
      if (result.status === "rejected") {
        totals.failed++
        continue
      }
      switch (result.value) {
        case "delivered": totals.delivered++; break
        case "already_delivered": totals.alreadyDelivered++; break
        case "pending": totals.pending++; break
        case "failed":
        case "disabled": totals.failed++; break
        case "skipped": totals.skipped++; break
      }
    }
  }
  return totals
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