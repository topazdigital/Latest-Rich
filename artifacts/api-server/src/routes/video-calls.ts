import { Router } from "express"
import { db } from "@workspace/db"
import { fakeVideoCallsTable, videoCallSessionsTable, usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { verifyToken } from "../lib/jwt"

const router = Router()
const CALL_RATE = 5
const billingLocks = new Map<number, Promise<any>>()

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

function notify(userId: number, data: object) {
  import("../lib/websocket").then(({ send }) => send(userId, data)).catch(() => {})
}

async function getSession(sessionId: number) {
  const [session] = await db.select().from(videoCallSessionsTable)
    .where(eq(videoCallSessionsTable.id, sessionId)).limit(1)
  return session
}

export async function connectVideoCall(sessionId: number, userId: number) {
  const session = await getSession(sessionId)
  if (!session || session.status !== "ringing" || session.calleeId !== userId) return false
  const connectedAt = now()
  await db.update(videoCallSessionsTable).set({ status: "connected", connectedAt })
    .where(and(eq(videoCallSessionsTable.id, sessionId), eq(videoCallSessionsTable.status, "ringing")))
  notify(session.callerId, { type: "call_connected", sessionId })
  notify(session.calleeId, { type: "call_connected", sessionId })
  return true
}

export async function billVideoCall(sessionId: number) {
  const previous = billingLocks.get(sessionId) || Promise.resolve()
  let resolveLock!: () => void
  const lock = new Promise<void>(resolve => { resolveLock = resolve })
  const queued = previous.then(() => lock)
  billingLocks.set(sessionId, queued)
  await previous
  try {
    const session = await getSession(sessionId)
    if (!session || session.status !== "connected" || !session.connectedAt) return { ended: false, charged: 0 }
    const targetMinutes = Math.ceil(Math.max(1, now() - session.connectedAt) / 60)
    const alreadyBilled = session.billedMinutes || 0
    const minutes = Math.max(0, targetMinutes - alreadyBilled)
    if (!minutes) return { ended: false, charged: 0 }

    const [caller] = await db.select({ credits: usersTable.credits, fake: usersTable.fake })
      .from(usersTable).where(eq(usersTable.id, session.callerId)).limit(1)
    if (!caller || caller.fake === 1 || (caller.credits || 0) < minutes * CALL_RATE) {
      await endVideoCall(sessionId, session.callerId, "insufficient_credits", false)
      return { ended: true, charged: 0 }
    }

    const charged = minutes * CALL_RATE
    await db.update(usersTable).set({ credits: (caller.credits || 0) - charged })
      .where(eq(usersTable.id, session.callerId))
    await db.update(videoCallSessionsTable).set({
      billedMinutes: alreadyBilled + minutes,
      creditsCharged: (session.creditsCharged || 0) + charged,
    }).where(eq(videoCallSessionsTable.id, sessionId))
    notify(session.callerId, {
      type: "credits_updated",
      credits: (caller.credits || 0) - charged,
      callSessionId: sessionId,
    })
    return { ended: false, charged }
  } finally {
    resolveLock()
    if (billingLocks.get(sessionId) === queued) billingLocks.delete(sessionId)
  }
}

export async function endVideoCall(sessionId: number, userId: number, reason = "hangup", bill = true) {
  const session = await getSession(sessionId)
  if (!session || session.status === "ended" || (session.callerId !== userId && session.calleeId !== userId)) return
  if (bill && session.status === "connected") await billVideoCall(sessionId)
  const latest = await getSession(sessionId)
  if (!latest || latest.status === "ended") return
  await db.update(videoCallSessionsTable).set({ status: "ended", endedAt: now(), endReason: reason })
    .where(eq(videoCallSessionsTable.id, sessionId))
  notify(latest.callerId, { type: "call_ended", sessionId, reason })
  notify(latest.calleeId, { type: "call_ended", sessionId, reason })
  if (reason === "insufficient_credits") notify(latest.callerId, {
    type: "call_balance_empty", sessionId, message: "Your call ended because your credits ran out.",
  })
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

// Start a caller-paid call. Ringing is free; billing begins after connection.
router.post("/start", async (req, res) => {
  const callerId = auth(req, res)
  if (!callerId) return
  const calleeId = Number(req.body?.toUserId)
  if (!Number.isInteger(calleeId) || calleeId === callerId) {
    res.status(400).json({ error: "A valid recipient is required" }); return
  }
  try {
    const [caller] = await db.select({ id: usersTable.id, name: usersTable.name, photo: usersTable.photo, fake: usersTable.fake, credits: usersTable.credits })
      .from(usersTable).where(eq(usersTable.id, callerId)).limit(1)
    const [callee] = await db.select({ id: usersTable.id, name: usersTable.name, age: usersTable.age, photo: usersTable.photo, fake: usersTable.fake })
      .from(usersTable).where(eq(usersTable.id, calleeId)).limit(1)
    if (!caller || !callee) { res.status(404).json({ error: "User not found" }); return }
    if (caller.fake === 1) { res.status(403).json({ error: "Only real users can start paid calls" }); return }
    if ((caller.credits || 0) < CALL_RATE) {
      res.status(402).json({ error: "You need at least 5 credits to start a video call", creditsNeeded: CALL_RATE, creditsHave: caller.credits || 0 }); return
    }
    const createdAt = now()
    const immediatelyConnected = callee.fake === 1
    await db.insert(videoCallSessionsTable).values({
      callerId, calleeId, status: immediatelyConnected ? "connected" : "ringing",
      createdAt, connectedAt: immediatelyConnected ? createdAt : 0,
    })
    const session = await db.select().from(videoCallSessionsTable)
      .where(and(eq(videoCallSessionsTable.callerId, callerId), eq(videoCallSessionsTable.calleeId, calleeId), eq(videoCallSessionsTable.createdAt, createdAt)))
      .orderBy(desc(videoCallSessionsTable.id)).limit(1)
    const call = session[0]
    if (!call) { res.status(500).json({ error: "Could not create call" }); return }
    if (!immediatelyConnected) notify(calleeId, {
      type: "call_invite",
      sessionId: call.id,
      caller: { id: caller.id, name: caller.name, photo: caller.photo ? `/api/uploads/${caller.photo}` : "" },
    })
    res.json({
      sessionId: call.id,
      connected: immediatelyConnected,
      peer: { id: callee.id, name: callee.name, age: callee.age, photo: callee.photo ? `/api/uploads/${callee.photo}` : "", fake: callee.fake },
      rate: CALL_RATE,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to start video call" })
  }
})

router.post("/:id/heartbeat", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return
  const result = await billVideoCall(Number(req.params.id))
  res.json({ success: true, ...result })
})

router.post("/:id/end", async (req, res) => {
  const userId = auth(req, res)
  if (!userId) return
  await endVideoCall(Number(req.params.id), userId, String(req.body?.reason || "hangup"))
  res.json({ success: true })
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

    const callTriggeredAt = now()
    await db.insert(fakeVideoCallsTable).values({
      fakeUserId: parseInt(fakeUserId),
      realUserId: parseInt(realUserId),
      videoUrl: videoUrl || "",
      triggeredAt: callTriggeredAt,
      answered: 0,
      dismissed: 0,
    })
    const [call] = await db.select().from(fakeVideoCallsTable)
      .where(and(eq(fakeVideoCallsTable.fakeUserId, parseInt(fakeUserId)), eq(fakeVideoCallsTable.triggeredAt, callTriggeredAt)))
      .orderBy(desc(fakeVideoCallsTable.id))
      .limit(1)

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
