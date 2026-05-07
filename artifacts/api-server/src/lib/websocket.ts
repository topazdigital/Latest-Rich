import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { Server } from "http"
import { verifyToken } from "./jwt"
import { db } from "@workspace/db"
import { messagesTable, siteConfigTable, usersTable } from "@workspace/db/schema"
import { eq, and } from "drizzle-orm"
import { logger } from "./logger"

function now() { return Math.floor(Date.now() / 1000) }

interface WSClient {
  ws: WebSocket
  userId: number
  isAlive: boolean
}

const clients = new Map<number, WSClient>()

// Detect contact info — duplicated here for WS handler
function containsContactInfo(text: string): boolean {
  if (/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/.test(text)) return true
  if (/(\+?[\d][\d\s\.\-\(\)]{5,}[\d])/.test(text)) return true
  if (/(instagram|insta|ig|whatsapp|whats\s*app|wa|telegram|tg|t\.me|snapchat|snap|sc|facebook|fb|twitter|x\.com|tiktok|tt|wechat|line|kik|skype|discord|viber|signal|linktree|onlyfans)[\s:\/=@\-]*[\w.@\-]{2,}/i.test(text)) return true
  if (/@[\w.]{3,}/.test(text)) return true
  if (/https?:\/\/[^\s]{4,}/.test(text)) return true
  if (/\bwww\.[a-zA-Z0-9\-]{2,}\.[a-zA-Z]{2,}/.test(text)) return true
  return false
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" })

  const heartbeat = setInterval(() => {
    for (const [userId, client] of clients) {
      if (!client.isAlive) {
        client.ws.terminate()
        clients.delete(userId)
        broadcastOnlineStatus(userId, false)
        continue
      }
      client.isAlive = false
      client.ws.ping()
    }
  }, 30000)

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`)
    const token = url.searchParams.get("token")
    if (!token) { ws.close(1008, "No token"); return }

    const payload = verifyToken(token)
    if (!payload?.userId) { ws.close(1008, "Invalid token"); return }

    const userId = payload.userId

    const existing = clients.get(userId)
    if (existing) existing.ws.close(1000, "New connection")

    const client: WSClient = { ws, userId, isAlive: true }
    clients.set(userId, client)

    await db.update(usersTable).set({ online: 1, lastAccess: String(now()) }).where(eq(usersTable.id, userId)).catch(() => {})
    broadcastOnlineStatus(userId, true)

    logger.info({ userId }, "WebSocket connected")

    ws.on("pong", () => { client.isAlive = true })
    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString())
        await handleMessage(userId, msg)
      } catch (err) {
        logger.error({ err }, "WS message error")
      }
    })
    ws.on("close", async () => {
      clients.delete(userId)
      await db.update(usersTable).set({ online: 0, lastAccess: String(now()) }).where(eq(usersTable.id, userId)).catch(() => {})
      broadcastOnlineStatus(userId, false)
      logger.info({ userId }, "WebSocket disconnected")
    })
    ws.on("error", (err) => {
      logger.error({ err, userId }, "WebSocket error")
      clients.delete(userId)
    })

    send(userId, { type: "connected", userId })
  })

  wss.on("close", () => clearInterval(heartbeat))
  return wss
}

async function handleMessage(fromUserId: number, msg: any) {
  switch (msg.type) {
    case "chat_message": {
      const { toUserId, message, tempId } = msg
      if (!toUserId || !message?.trim()) return

      const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, fromUserId)).limit(1)
      if (!fromUser) return

      // Block contact info for non-premium real users
      if (fromUser.fake !== 1 && fromUser.premium !== 1 && containsContactInfo(message.trim())) {
        send(fromUserId, {
          type: "error",
          code: "contact_info_blocked",
          message: "Upgrade to Premium to share contact details, social handles, or links in chat.",
          tempId,
        })
        return
      }

      const [creditConfig] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "credits_per_message")).limit(1)
      const creditCost = parseInt(creditConfig?.value || "10")

      if (fromUser.fake !== 1 && creditCost > 0) {
        if ((fromUser.credits || 0) < creditCost) {
          send(fromUserId, { type: "error", code: "insufficient_credits", message: "Not enough credits to send a message", tempId })
          return
        }
        await db.update(usersTable).set({ credits: (fromUser.credits || 0) - creditCost }).where(eq(usersTable.id, fromUserId))
        send(fromUserId, { type: "credits_updated", credits: (fromUser.credits || 0) - creditCost })
      }

      const [savedMsg] = await db.insert(messagesTable).values({
        u1: fromUserId, u2: toUserId, message: message.trim(), time: now(), read: 0,
      }).returning()

      send(fromUserId, { type: "message_sent", tempId, message: savedMsg })
      send(toUserId, { type: "new_message", message: savedMsg, from: { id: fromUser.id, name: fromUser.name, photo: fromUser.photoThumb || fromUser.photo } })

      // If a real user messaged a fake user, push-notify moderators
      const [toUser] = await db.select({ fake: usersTable.fake }).from(usersTable).where(eq(usersTable.id, toUserId)).limit(1)
      if (fromUser.fake !== 1 && toUser?.fake === 1) {
        import("./push").then(({ sendPushToModerators }) => {
          sendPushToModerators({
            title: "💬 New message needs reply",
            body: `${fromUser.name} sent a message — tap to reply as the fake user`,
            url: "/moderator",
          }).catch(() => {})
        }).catch(() => {})
      }
      break
    }

    case "typing_start": {
      const { toUserId } = msg
      if (!toUserId) return
      send(toUserId, { type: "typing", fromUserId, typing: true })
      break
    }

    case "typing_stop": {
      const { toUserId } = msg
      if (!toUserId) return
      send(toUserId, { type: "typing", fromUserId, typing: false })
      break
    }

    case "mark_read": {
      const { fromUserId: otherId } = msg
      if (!otherId) return
      await db.update(messagesTable)
        .set({ read: 1 })
        .where(and(eq(messagesTable.u1, otherId), eq(messagesTable.u2, fromUserId), eq(messagesTable.read, 0)))
      send(otherId, { type: "messages_read", byUserId: fromUserId })
      break
    }

    case "ping": {
      send(fromUserId, { type: "pong" })
      await db.update(usersTable).set({ lastAccess: String(now()) }).where(eq(usersTable.id, fromUserId)).catch(() => {})
      break
    }
  }
}

function broadcastOnlineStatus(userId: number, online: boolean) {
  const payload = JSON.stringify({ type: "user_online", userId, online })
  for (const [, client] of clients) {
    if (client.ws.readyState === WebSocket.OPEN) client.ws.send(payload)
  }
}

export function send(userId: number, data: object) {
  const client = clients.get(userId)
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(data))
  }
}

export function isOnlineWS(userId: number): boolean { return clients.has(userId) }
export function getOnlineUsers(): number[] { return Array.from(clients.keys()) }
