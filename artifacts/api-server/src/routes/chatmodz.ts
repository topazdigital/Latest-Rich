import crypto from "crypto"
import { Router } from "express"
import { and, eq, or } from "drizzle-orm"
import { db } from "@workspace/db"
import { chatmodzDeliveriesTable, messagesTable, usersTable } from "@workspace/db/schema"
import { send as wsSend } from "../lib/websocket"
import { chatmodzSignature } from "../lib/chatmodz"

const router = Router()
const SIGNATURE_WINDOW_MS = 5 * 60 * 1000
const CHATMODZ_SECRET_ENV = process.env.CHATMODZ_SECRET_ENV || "SITE_ONE_SECRET"

function now() {
  return Math.floor(Date.now() / 1000)
}

function getSecret() {
  return process.env[CHATMODZ_SECRET_ENV] || ""
}

function isDuplicateError(error: any) {
  return error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY" || error?.code === "23505"
}

function verifySignature(req: any) {
  const secret = getSecret()
  const timestamp = String(req.header("X-Chatmodz-Timestamp") || "")
  const received = String(req.header("X-Chatmodz-Signature") || "")
  const timestampMs = Date.parse(timestamp)
  if (!secret || !timestamp || !received || !Number.isFinite(timestampMs)) return false
  if (Math.abs(Date.now() - timestampMs) > SIGNATURE_WINDOW_MS) return false

  const rawBody = Buffer.isBuffer(req.rawBody)
    ? req.rawBody.toString("utf8")
    : JSON.stringify(req.body || {})
  const expected = chatmodzSignature(timestamp, rawBody, secret).replace(/^sha256=/, "")
  const actual = received.replace(/^sha256=/, "")
  const expectedBuffer = Buffer.from(expected, "hex")
  const actualBuffer = Buffer.from(actual, "hex")
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

function parseConversationId(value: unknown) {
  const match = /^rdn-(\d+)-(\d+)$/.exec(String(value || ""))
  if (!match) return null
  return { firstId: Number(match[1]), secondId: Number(match[2]) }
}

router.post("/replies", async (req, res) => {
  if (!verifySignature(req)) {
    res.status(401).json({ error: "Invalid Chatmodz signature" })
    return
  }

  const conversationId = String(req.body?.conversationId || "")
  const externalMessageId = String(req.body?.messageId || "")
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : ""
  const sentAt = typeof req.body?.sentAt === "string" ? Date.parse(req.body.sentAt) : NaN
  const parsed = parseConversationId(conversationId)

  if (!parsed || !externalMessageId || !body) {
    res.status(400).json({ error: "conversationId, messageId, and body are required" })
    return
  }

  const [existing] = await db.select().from(chatmodzDeliveriesTable)
    .where(and(
      eq(chatmodzDeliveriesTable.direction, "from_chatmodz"),
      eq(chatmodzDeliveriesTable.externalEventId, externalMessageId),
    ))
    .limit(1)
  if (existing?.status === "processed") {
    res.status(202).json({ accepted: true, duplicate: true })
    return
  }

  const [firstUser, secondUser] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, parsed.firstId)).limit(1),
    db.select().from(usersTable).where(eq(usersTable.id, parsed.secondId)).limit(1),
  ]).then(([first, second]) => [first[0], second[0]])
  const users = [firstUser, secondUser].filter(Boolean) as any[]
  const managedProfile = users.find(user => user.fake === 1)
  const member = users.find(user => user.fake !== 1)
  if (!managedProfile || !member) {
    res.status(404).json({ error: "Conversation users were not found" })
    return
  }

  try {
    if (!existing) {
      await db.insert(chatmodzDeliveriesTable).values({
        direction: "from_chatmodz",
        externalEventId: externalMessageId,
        conversationId,
        messageId: 0,
        status: "processing",
        attempts: 1,
        nextAttemptAt: 0,
        lastError: "",
        createdAt: now(),
        deliveredAt: 0,
      })
    } else {
      await db.update(chatmodzDeliveriesTable)
        .set({ status: "processing", attempts: Number(existing.attempts || 0) + 1, lastError: "" })
        .where(eq(chatmodzDeliveriesTable.id, existing.id))
    }
  } catch (error) {
    if (!isDuplicateError(error)) {
      console.error("[Chatmodz] Could not reserve reply delivery", error)
      res.status(500).json({ error: "Could not reserve reply" })
      return
    }
    res.status(202).json({ accepted: true, duplicate: true })
    return
  }

  try {
    const messageTime = Number.isFinite(sentAt) ? Math.floor(sentAt / 1000) : now()
    await db.insert(messagesTable).values({
      u1: managedProfile.id,
      u2: member.id,
      message: body,
      time: messageTime,
      read: 0,
      mediaUrl: "",
      mediaType: "",
    })
    const [savedMessage] = await db.select().from(messagesTable)
      .where(and(
        eq(messagesTable.u1, managedProfile.id),
        eq(messagesTable.u2, member.id),
        eq(messagesTable.time, messageTime),
      ))
      .orderBy(messagesTable.id)
      .limit(1)

    await db.update(chatmodzDeliveriesTable)
      .set({
        status: "processed",
        messageId: savedMessage?.id || 0,
        deliveredAt: now(),
        lastError: "",
      })
      .where(and(
        eq(chatmodzDeliveriesTable.direction, "from_chatmodz"),
        eq(chatmodzDeliveriesTable.externalEventId, externalMessageId),
      ))

    if (savedMessage) {
      wsSend(member.id, {
        type: "new_message",
        message: savedMessage,
        from: { id: managedProfile.id, name: managedProfile.name, photo: managedProfile.photoThumb || managedProfile.photo },
      })
    }

    res.status(202).json({ accepted: true })
  } catch (error: any) {
    await db.update(chatmodzDeliveriesTable)
      .set({ status: "failed", lastError: String(error?.message || "Could not store reply").slice(0, 500) })
      .where(and(
        eq(chatmodzDeliveriesTable.direction, "from_chatmodz"),
        eq(chatmodzDeliveriesTable.externalEventId, externalMessageId),
      ))
    console.error("[Chatmodz] Could not store operator reply", error)
    res.status(500).json({ error: "Could not store reply" })
  }
})

export default router