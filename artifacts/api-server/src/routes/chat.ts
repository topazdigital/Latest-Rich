import { Router } from "express"
import { db } from "@workspace/db"
import { messagesTable, usersTable, siteConfigTable, activityTable } from "@workspace/db/schema"
import { eq, and, or, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { decodeHtml } from "../lib/html-decode"
import { containsContactInfo, CONTACT_INFO_CHAT_ERROR } from "../lib/contact-filter"
import multer from "multer"
import path from "path"
import fs from "fs"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// ── Chat media upload storage ────────────────────────────────────────────────
const chatUploadDir = path.join(process.cwd(), "uploads", "chat")
if (!fs.existsSync(chatUploadDir)) fs.mkdirSync(chatUploadDir, { recursive: true })

const chatStorage = multer.diskStorage({
  destination: chatUploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `chat-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "image", "image/jpg": "image", "image/png": "image",
  "image/gif": "image", "image/webp": "image", "image/heic": "image",
  "video/mp4": "video", "video/webm": "video", "video/quicktime": "video",
  "video/3gpp": "video", "video/x-msvideo": "video",
  "audio/mpeg": "audio", "audio/mp4": "audio", "audio/ogg": "audio",
  "audio/wav": "audio", "audio/webm": "audio", "audio/aac": "audio",
  "audio/x-m4a": "audio",
}

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME[file.mimetype]) {
      cb(null, true)
    } else {
      cb(new Error("Unsupported file type. Allowed: images, videos, audio."))
    }
  },
})

// ── Upload media for chat ────────────────────────────────────────────────────
router.post("/upload", requireAuth, (req, res) => {
  chatUpload.single("media")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Upload failed" })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" })
    }
    const mediaType = ALLOWED_MIME[req.file.mimetype] || "image"
    const url = `/api/uploads/chat/${req.file.filename}`
    res.json({ url, type: mediaType })
  })
})

async function getCreditCost(): Promise<number> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "credits_per_message")).limit(1)
    return parseInt(row?.value || "10")
  } catch { return 10 }
}

router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const msgs = await db.select().from(messagesTable)
      .where(or(eq(messagesTable.u1, myId), eq(messagesTable.u2, myId)))
      .orderBy(desc(messagesTable.time))

    const convMap = new Map<number, any>()
    for (const m of msgs) {
      const otherId = m.u1 === myId ? m.u2 : m.u1
      if (!convMap.has(otherId)) {
        const preview = m.mediaType ? `📎 ${m.mediaType === "image" ? "Photo" : m.mediaType === "video" ? "Video" : "Audio"}` : decodeHtml(m.message)
        convMap.set(otherId, { otherId, lastMsg: preview, lastTime: m.time, unread: 0 })
      }
      if (m.u2 === myId && m.read === 0) convMap.get(otherId).unread++
    }

    const results = []
    for (const [otherId, conv] of convMap) {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, otherId)).limit(1)
      if (user) {
        const { password, ...safe } = user
        results.push({ ...conv, ...safe, otherId })
      }
    }
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json([])
  }
})

router.get("/:otherId/messages", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const otherId = parseInt(req.params.otherId as string)
    const msgs = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.u1, myId), eq(messagesTable.u2, otherId)),
        and(eq(messagesTable.u1, otherId), eq(messagesTable.u2, myId)),
      ))
      .orderBy(messagesTable.time)
    await db.update(messagesTable).set({ read: 1 })
      .where(and(eq(messagesTable.u1, otherId), eq(messagesTable.u2, myId), eq(messagesTable.read, 0)))
    res.json(msgs.map(m => ({ ...m, message: decodeHtml(m.message) })))
  } catch {
    res.status(500).json([])
  }
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const { toUserId, message, mediaUrl, mediaType } = req.body
    if (!toUserId || (!message?.trim() && !mediaUrl)) {
      res.status(400).json({ error: "toUserId and message or media are required" }); return
    }

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, myId)).limit(1)
    if (!sender) { res.status(404).json({ error: "User not found" }); return }

    // Block fake→fake messaging
    const [toUser] = await db.select({ fake: usersTable.fake }).from(usersTable).where(eq(usersTable.id, parseInt(toUserId))).limit(1)
    if (sender.fake === 1 && toUser?.fake === 1) {
      res.status(403).json({ error: "Cannot message between fake accounts" }); return
    }

    // Block contact info for non-premium real users (text messages only)
    if (message?.trim() && sender.fake !== 1 && sender.premium !== 1 && containsContactInfo(message.trim())) {
      res.status(403).json(CONTACT_INFO_CHAT_ERROR)
      return
    }

    // Deduct credits for real users
    if (sender.fake !== 1) {
      const creditCost = await getCreditCost()
      if (creditCost > 0) {
        if ((sender.credits || 0) < creditCost) {
          res.status(402).json({ error: "Insufficient credits", creditsNeeded: creditCost, creditsHave: sender.credits || 0 }); return
        }
        await db.update(usersTable).set({ credits: (sender.credits || 0) - creditCost }).where(eq(usersTable.id, myId))
      }
    }

    const msgTime = now()
    const msgText = message?.trim() || ""
    await db.insert(messagesTable).values({
      u1: myId, u2: parseInt(toUserId), message: msgText, time: msgTime, read: 0,
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
    })
    const [msg] = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.u1, myId), eq(messagesTable.u2, parseInt(toUserId)), eq(messagesTable.time, msgTime)))
      .orderBy(desc(messagesTable.id))
      .limit(1)

    // If sender is a fake user (admin logged in as fake), keep their "Last seen" consistent
    if (sender.fake === 1) {
      await db.update(usersTable).set({ lastAccess: String(msgTime) }).where(eq(usersTable.id, myId))
    }

    const [updatedSender] = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, myId)).limit(1)

    // Log activity for admin
    const [recipient] = await db.select({ name: usersTable.name, fake: usersTable.fake }).from(usersTable).where(eq(usersTable.id, parseInt(toUserId))).limit(1)
    const logText = mediaType ? `[${mediaType}]` : (msgText.slice(0, 80))
    db.insert(activityTable).values({
      type: "message",
      userId: myId,
      title: "Message sent",
      message: `${sender.name} → ${recipient?.name || 'Unknown'}: ${logText}`,
      time: msgTime,
    }).catch(() => {})

    // Push notify moderators when a real user messages a fake user
    if (sender.fake !== 1 && recipient?.fake === 1) {
      import("../lib/push").then(({ sendPushToModerators }) => {
        sendPushToModerators({
          title: `💬 ${sender.name} is waiting for a reply`,
          body: mediaType ? `Sent a ${mediaType}` : msgText.slice(0, 100),
          url: "/admin",
          icon: "/icons/icon-192.svg",
        })
      }).catch(() => {})
    }

    // Push notify real recipient when a real sender messages them
    if (sender.fake !== 1 && recipient?.fake !== 1) {
      import("../lib/push").then(({ sendPushToUser }) => {
        sendPushToUser(recipientId, {
          title: `💬 New message from ${sender.name}`,
          body: mediaType ? `Sent a ${mediaType}` : msgText.slice(0, 80),
          url: `/chat/${sender.id}`,
        })
      }).catch(() => {})
    }

    res.json({ ...msg, credits: updatedSender?.credits })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to send" })
  }
})

router.get("/credit-cost", requireAuth, async (req, res) => {
  const cost = await getCreditCost()
  res.json({ cost })
})

export default router
