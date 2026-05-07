import { Router } from "express"
import { db } from "@workspace/db"
import { giftsTable, userGiftsTable, usersTable, notificationsTable } from "@workspace/db/schema"
import { eq, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// Seed default gifts if none exist
async function seedGifts() {
  const existing = await db.select().from(giftsTable).limit(1)
  if (!existing.length) {
    await db.insert(giftsTable).values([
      { name: "Rose", emoji: "🌹", credits: 10, active: 1 },
      { name: "Heart", emoji: "❤️", credits: 15, active: 1 },
      { name: "Diamond", emoji: "💎", credits: 50, active: 1 },
      { name: "Crown", emoji: "👑", credits: 100, active: 1 },
      { name: "Kiss", emoji: "💋", credits: 20, active: 1 },
      { name: "Champagne", emoji: "🍾", credits: 30, active: 1 },
      { name: "Ring", emoji: "💍", credits: 200, active: 1 },
      { name: "Star", emoji: "⭐", credits: 25, active: 1 },
    ])
  }
}

seedGifts().catch(console.error)

// List all gifts
router.get("/", requireAuth, async (req, res) => {
  try {
    const gifts = await db.select().from(giftsTable).where(eq(giftsTable.active, 1))
    res.json(gifts)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Send gift
router.post("/send", requireAuth, async (req, res) => {
  try {
    const { toId, giftId, message } = req.body
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    const [gift] = await db.select().from(giftsTable).where(eq(giftsTable.id, parseInt(giftId))).limit(1)
    const [recipient] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(toId))).limit(1)

    if (!sender || !gift || !recipient) { res.status(404).json({ error: "Not found" }); return }
    if ((sender.credits || 0) < (gift.credits || 0)) { res.status(400).json({ error: "Not enough credits" }); return }

    await db.update(usersTable).set({ credits: (sender.credits || 0) - (gift.credits || 0) }).where(eq(usersTable.id, sender.id))
    await db.insert(userGiftsTable).values({ fromId: sender.id, toId: recipient.id, giftId: gift.id, message: message || "", time: now() })
    await db.insert(notificationsTable).values({
      userId: recipient.id, fromId: sender.id, type: "gift",
      message: `${sender.name} sent you a ${gift.emoji} ${gift.name}${message ? ": " + message : ""}`,
      link: `/profile/${sender.id}`, read: 0, time: now()
    })
    res.json({ success: true, newCredits: (sender.credits || 0) - (gift.credits || 0) })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get gifts received
router.get("/received", requireAuth, async (req, res) => {
  try {
    const gifts = await db.select({
      gift: userGiftsTable,
      giftInfo: giftsTable,
      sender: { id: usersTable.id, name: usersTable.name, photo: usersTable.photo }
    }).from(userGiftsTable)
      .leftJoin(giftsTable, eq(userGiftsTable.giftId, giftsTable.id))
      .leftJoin(usersTable, eq(userGiftsTable.fromId, usersTable.id))
      .where(eq(userGiftsTable.toId, req.userId!))
      .orderBy(desc(userGiftsTable.id)).limit(50)
    res.json(gifts)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
