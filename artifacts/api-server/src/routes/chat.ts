import { Router } from "express"
import { db } from "@workspace/db"
import { messagesTable, usersTable, siteConfigTable, activityTable } from "@workspace/db/schema"
import { eq, and, or, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

async function getCreditCost(): Promise<number> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, "credits_per_message")).limit(1)
    return parseInt(row?.value || "10")
  } catch { return 10 }
}

// Detect phone numbers, emails, social handles, URLs
export function containsContactInfo(text: string): boolean {
  // Email addresses
  if (/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/.test(text)) return true
  // Phone numbers (7+ digits, various formats)
  if (/(\+?[\d][\d\s\.\-\(\)]{5,}[\d])/.test(text)) return true
  // Social media handles with context keywords
  if (/(instagram|insta|ig|whatsapp|whats\s*app|wa|telegram|tg|t\.me|snapchat|snap|sc|facebook|fb|twitter|x\.com|tiktok|tt|wechat|we\s*chat|line|kik|skype|discord|viber|signal|linktree|onlyfans)[\s:\/=@\-]*[\w.@\-]{2,}/i.test(text)) return true
  // @username patterns (3+ chars after @)
  if (/@[\w.]{3,}/.test(text)) return true
  // HTTP/HTTPS URLs
  if (/https?:\/\/[^\s]{4,}/.test(text)) return true
  // www. links
  if (/\bwww\.[a-zA-Z0-9\-]{2,}\.[a-zA-Z]{2,}/.test(text)) return true
  return false
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
        convMap.set(otherId, { otherId, lastMsg: m.message, lastTime: m.time, unread: 0 })
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
    res.json(msgs)
  } catch {
    res.status(500).json([])
  }
})

router.post("/", requireAuth, async (req, res) => {
  try {
    const myId = req.userId!
    const { toUserId, message } = req.body
    if (!toUserId || !message?.trim()) {
      res.status(400).json({ error: "toUserId and message are required" }); return
    }

    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, myId)).limit(1)
    if (!sender) { res.status(404).json({ error: "User not found" }); return }

    // Block contact info for non-premium real users
    if (sender.fake !== 1 && sender.premium !== 1 && containsContactInfo(message.trim())) {
      res.status(403).json({
        error: "premium_required",
        message: "Upgrade to Premium to share contact details, social handles, or links in chat.",
        code: "contact_info_blocked",
      })
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
    await db.insert(messagesTable).values({
      u1: myId, u2: parseInt(toUserId), message: message.trim(), time: msgTime, read: 0,
    })
    const [msg] = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.u1, myId), eq(messagesTable.u2, parseInt(toUserId)), eq(messagesTable.time, msgTime)))
      .orderBy(desc(messagesTable.id))
      .limit(1)

    const [updatedSender] = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, myId)).limit(1)

    // Log activity for admin
    const [recipient] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, parseInt(toUserId))).limit(1)
    db.insert(activityTable).values({
      type: "message",
      userId: myId,
      title: "Message sent",
      message: `${sender.name} → ${recipient?.name || 'Unknown'}: ${message.trim().slice(0, 80)}`,
      time: msgTime,
    }).catch(() => {})

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
