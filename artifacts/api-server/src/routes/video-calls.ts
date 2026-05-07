import { Router } from "express"
import { db } from "@workspace/db"
import { fakeVideoCallsTable, usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { verifyToken } from "../lib/jwt"

const router = Router()

function now() { return Math.floor(Date.now() / 1000) }

function auth(req: any, res: any): number | null {
  const h = req.headers.authorization
  if (!h) { res.status(401).json({ error: "Unauthorized" }); return null }
  const p = verifyToken(h.replace("Bearer ", ""))
  if (!p?.userId) { res.status(401).json({ error: "Unauthorized" }); return null }
  return p.userId
}

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

// Check for pending incoming video call for the current user
router.get("/pending", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return

  try {
    const calls = await db.select({
      id: fakeVideoCallsTable.id,
      fakeUserId: fakeVideoCallsTable.fakeUserId,
      videoUrl: fakeVideoCallsTable.videoUrl,
      triggeredAt: fakeVideoCallsTable.triggeredAt,
    })
      .from(fakeVideoCallsTable)
      .where(
        and(
          eq(fakeVideoCallsTable.realUserId, userId),
          eq(fakeVideoCallsTable.answered, 0),
          eq(fakeVideoCallsTable.dismissed, 0),
          sql`${fakeVideoCallsTable.triggeredAt} > ${now() - 60}` // Only calls from last 60 seconds
        )
      )
      .orderBy(desc(fakeVideoCallsTable.triggeredAt))
      .limit(1)

    if (calls.length === 0) { res.json({ call: null }); return }

    const call = calls[0]
    const [fakeUser] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      age: usersTable.age,
      photo: usersTable.photo,
    }).from(usersTable).where(eq(usersTable.id, call.fakeUserId)).limit(1)

    if (!fakeUser) { res.json({ call: null }); return }

    res.json({
      call: {
        callId: call.id,
        id: fakeUser.id,
        name: fakeUser.name,
        age: fakeUser.age,
        photo: fakeUser.photo ? `/api/uploads/${fakeUser.photo}` : "",
        videoUrl: call.videoUrl || "",
      }
    })
  } catch (err) {
    res.json({ call: null })
  }
})

// Mark call as answered
router.post("/:id/answer", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return
  const callId = parseInt(req.params.id)
  try {
    await db.update(fakeVideoCallsTable)
      .set({ answered: 1 })
      .where(and(eq(fakeVideoCallsTable.id, callId), eq(fakeVideoCallsTable.realUserId, userId)))
    res.json({ success: true })
  } catch { res.json({ success: false }) }
})

// Mark call as dismissed
router.post("/:id/dismiss", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return
  const callId = parseInt(req.params.id)
  try {
    await db.update(fakeVideoCallsTable)
      .set({ dismissed: 1 })
      .where(and(eq(fakeVideoCallsTable.id, callId), eq(fakeVideoCallsTable.realUserId, userId)))
    res.json({ success: true })
  } catch { res.json({ success: false }) }
})

// Admin: trigger a video call from a fake user to a real user
router.post("/trigger", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return
  const [me] = await db.select({ admin: usersTable.admin }).from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  if (!me?.admin) { res.status(403).json({ error: "Admin only" }); return }

  const { fakeUserId, realUserId, videoUrl } = req.body
  try {
    // Dismiss any previous pending calls for this real user
    await db.update(fakeVideoCallsTable)
      .set({ dismissed: 1 })
      .where(and(eq(fakeVideoCallsTable.realUserId, realUserId), eq(fakeVideoCallsTable.answered, 0), eq(fakeVideoCallsTable.dismissed, 0)))

    const [call] = await db.insert(fakeVideoCallsTable).values({
      fakeUserId: parseInt(fakeUserId),
      realUserId: parseInt(realUserId),
      videoUrl: videoUrl || "",
      triggeredAt: now(),
      answered: 0,
      dismissed: 0,
    }).returning()

    res.json({ success: true, callId: call.id })
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger call" })
  }
})

// Schedule auto video calls (triggered by fake-message-scheduler)
export async function scheduleVideoCall(fakeUserId: number, realUserId: number, videoUrl = "") {
  try {
    await db.update(fakeVideoCallsTable)
      .set({ dismissed: 1 })
      .where(and(eq(fakeVideoCallsTable.realUserId, realUserId), eq(fakeVideoCallsTable.answered, 0), eq(fakeVideoCallsTable.dismissed, 0)))

    await db.insert(fakeVideoCallsTable).values({
      fakeUserId,
      realUserId,
      videoUrl,
      triggeredAt: now(),
      answered: 0,
      dismissed: 0,
    })
  } catch { }
}

export default router
