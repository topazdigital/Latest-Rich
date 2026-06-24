import { db } from "@workspace/db"
import {
  usersTable, messagesTable, notificationsTable,
  fakeMessageTemplatesTable, autoMessageLogTable, likesTable, siteConfigTable
} from "@workspace/db/schema"
import { eq, and, inArray, notInArray, gte } from "drizzle-orm"
import { send as wsSend } from "./websocket"

function now() { return Math.floor(Date.now() / 1000) }

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function getConfigVal(key: string, fallback: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || fallback
  } catch { return fallback }
}

async function isAutoMessagingEnabled(): Promise<boolean> {
  const val = await getConfigVal("auto_messages_enabled", "1")
  return val === "1"
}

async function getMinDelaySeconds(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_min_delay_seconds", "60"))
}

async function getMaxDelaySeconds(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_max_delay_seconds", "900"))
}

async function getNewUserDelaySeconds(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_new_user_delay_seconds", "5"))
}

async function getMessagesPerTrigger(): Promise<number> {
  return parseInt(await getConfigVal("auto_messages_count", "3"))
}

async function getMaxInactiveDays(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_max_inactive_days", "30"))
}

async function getDailyMessageCap(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_daily_cap", "5"))
}

async function getAutoMessageEmailEnabled(): Promise<boolean> {
  return (await getConfigVal("auto_message_send_email", "0")) === "1"
}

async function getAutoMessageEmailMaxInactiveHours(): Promise<number> {
  return parseInt(await getConfigVal("auto_message_email_max_inactive_hours", "2"))
}

async function getLastSeenMinOffset(): Promise<number> {
  return parseInt(await getConfigVal("fake_last_seen_min_offset", "120"))
}

async function getLastSeenMaxOffset(): Promise<number> {
  return parseInt(await getConfigVal("fake_last_seen_max_offset", "900"))
}

function randomDelay(minSec: number, maxSec: number): number {
  return minSec + Math.floor(Math.random() * (maxSec - minSec + 1))
}

// Returns a timestamp that is slightly in the past (by a random offset within the configured range)
// so fake users show "Last seen X minutes ago" rather than "just now".
async function fakeLastSeenTimestamp(): Promise<number> {
  const minOff = await getLastSeenMinOffset()
  const maxOff = await getLastSeenMaxOffset()
  const offset = randomDelay(minOff, maxOff)
  return now() - offset
}

export async function sendAutoMessagesToUser(realUserId: number): Promise<number> {
  if (!(await isAutoMessagingEnabled())) return 0

  const templates = await db.select().from(fakeMessageTemplatesTable)
    .where(eq(fakeMessageTemplatesTable.active, 1))
  if (!templates.length) return 0

  const [realUser] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, realUserId), eq(usersTable.fake, 0), eq(usersTable.banned, 0)))
    .limit(1)
  if (!realUser) return 0

  // Enforce daily cap — count messages sent to this user in the last 24 hours
  const dailyCap = await getDailyMessageCap()
  const dayAgo = now() - 86400
  const todayLogs = await db.select({ id: autoMessageLogTable.id })
    .from(autoMessageLogTable)
    .where(and(eq(autoMessageLogTable.realUserId, realUser.id), gte(autoMessageLogTable.time, dayAgo)))
  if (todayLogs.length >= dailyCap) return 0

  const genderFilter = realUser.looking === 3 ? [1, 2] : [realUser.looking ?? 2]

  const alreadySentLogs = await db
    .select({ fakeUserId: autoMessageLogTable.fakeUserId, templateId: autoMessageLogTable.templateId })
    .from(autoMessageLogTable)
    .where(eq(autoMessageLogTable.realUserId, realUser.id))

  const usedFakeUserIds = [...new Set(alreadySentLogs.map((r: any) => r.fakeUserId).filter((id: any): id is number => id !== null && id !== 0))]
  const usedTemplateIds = [...new Set(alreadySentLogs.map((r: any) => r.templateId).filter((id: any): id is number => id !== null && id !== 0))]

  const availableTemplates = templates.filter((t: any) => !usedTemplateIds.includes(t.id))
  if (!availableTemplates.length) return 0

  const fakeUsersQuery = db.select().from(usersTable)
    .where(and(
      eq(usersTable.fake, 1),
      eq(usersTable.banned, 0),
      inArray(usersTable.gender, genderFilter),
      ...(usedFakeUserIds.length > 0 ? [notInArray(usersTable.id, usedFakeUserIds as number[])] : [])
    ))
    .limit(30)

  const fakeUsers = await fakeUsersQuery
  if (!fakeUsers.length) return 0

  const numMessages = Math.min(await getMessagesPerTrigger(), availableTemplates.length, fakeUsers.length)
  const selectedFakers = [...fakeUsers].sort(() => Math.random() - 0.5).slice(0, numMessages)
  const shuffledTemplates = [...availableTemplates].sort(() => Math.random() - 0.5)

  let sentCount = 0

  for (let i = 0; i < selectedFakers.length; i++) {
    const faker = selectedFakers[i]
    const template = shuffledTemplates[i % shuffledTemplates.length]
    // Emit typing indicator to real user before message lands
    wsSend(realUser.id, { type: 'typing', fromUserId: faker.id, typing: true })

    const msgTime = now()

    await db.insert(messagesTable).values({
      u1: faker.id,
      u2: realUser.id,
      message: template.message,
      time: msgTime,
      read: 0,
    })

    wsSend(realUser.id, { type: 'typing', fromUserId: faker.id, typing: false })

    // Update fake user's lastAccess with a small random offset so "Last seen"
    // looks natural (e.g. "3 minutes ago") instead of exactly matching the message time.
    const fakeTs = await fakeLastSeenTimestamp()
    await db.update(usersTable)
      .set({ lastAccess: String(fakeTs) })
      .where(eq(usersTable.id, faker.id))

    await db.insert(notificationsTable).values({
      userId: realUser.id,
      fromId: faker.id,
      type: "message",
      message: `${faker.name} sent you a message`,
      link: `/chat/${faker.id}`,
      read: 0,
      time: msgTime,
    })

    await db.insert(autoMessageLogTable).values({
      fakeUserId: faker.id,
      realUserId: realUser.id,
      templateId: template.id,
      time: now(),
    })

    try {
      await db.insert(likesTable).values({
        userId: faker.id,
        targetId: realUser.id,
        created: msgTime,
      })
    } catch { /* ignore duplicate like */ }

    try {
      const autoEmailEnabled = await getAutoMessageEmailEnabled()
      if (autoEmailEnabled && realUser.email && !realUser.email.includes("@rdn.local")) {
        // Only email if user was active recently (within configured hours)
        const maxInactiveHours = await getAutoMessageEmailMaxInactiveHours()
        const recentCutoff = now() - maxInactiveHours * 3600
        const lastAccess = parseInt(realUser.lastAccess || "0")
        if (lastAccess >= recentCutoff) {
          // Deduplicate: only 1 email per user per day from auto-messages
          const emailSentToday = await db.select({ id: autoMessageLogTable.id })
            .from(autoMessageLogTable)
            .where(and(
              eq(autoMessageLogTable.realUserId, realUser.id),
              gte(autoMessageLogTable.time, dayAgo)
            ))
          const alreadyEmailedToday = emailSentToday.length > 1 // first message of the day gets email
          if (!alreadyEmailedToday) {
            const { sendNewMessageEmail } = await import("./mailer")
            const siteUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN || "localhost"}`
            sendNewMessageEmail(realUser.email, realUser.name, faker.name, template.message, siteUrl).catch(() => {})
          }
        }
      }
    } catch {}

    sentCount++
  }

  return sentCount
}

export async function triggerAutoMessages(realUserId?: number, isNewUser = false): Promise<number> {
  if (!(await isAutoMessagingEnabled())) return 0

  if (realUserId) {
    const minDelay = isNewUser ? await getNewUserDelaySeconds() : await getMinDelaySeconds()
    const maxDelay = isNewUser ? await getNewUserDelaySeconds() : await getMaxDelaySeconds()
    const delaySec = randomDelay(minDelay, maxDelay)
    const delayMs = delaySec * 1000

    setTimeout(async () => {
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, realUserId)).limit(1)
        if (!user || user.fake === 1 || user.banned === 1) return

        const cutoff = now() - (isNewUser ? 600 : 900)
        if (parseInt(user.lastAccess || "0") < cutoff) return

        await sendAutoMessagesToUser(realUserId)
      } catch (err) {
        console.error("[FakeScheduler] Error sending auto messages:", err)
      }
    }, delayMs)

    return 0
  }

  // Only target users who have been active within the configured window
  const maxInactiveDays = await getMaxInactiveDays()
  const activeAfter = now() - maxInactiveDays * 86400

  const realUsers = await db.select().from(usersTable)
    .where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0), gte(usersTable.lastAccess, String(activeAfter))))
    .limit(50)

  let total = 0
  for (const u of realUsers) {
    const sent = await sendAutoMessagesToUser(u.id)
    total += sent
  }
  return total
}

export function startAutoMessageScheduler() {
  setTimeout(() => { triggerAutoMessages().catch(console.error) }, 10000)
  setInterval(() => { triggerAutoMessages().catch(console.error) }, 30 * 60 * 1000)
}

// ── Fake Online Simulator ─────────────────────────────────────────────────────
// Periodically marks a random set of fake users as "online" by bumping their
// lastAccess to now, then broadcasts user_online events over WebSocket so
// connected real users see the green dot in real time.

async function runFakeOnlineSimulator() {
  try {
    const enabled = await getConfigVal("fake_online_enabled", "0")
    if (enabled !== "1") return

    const count = parseInt(await getConfigVal("fake_online_count", "5"))

    const fakeUsers = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.fake, 1), eq(usersTable.banned, 0)))

    if (!fakeUsers.length) return

    // Pick a random subset to be "online" right now
    const shuffled = [...fakeUsers].sort(() => Math.random() - 0.5)
    const toGoOnline = shuffled.slice(0, Math.min(count, shuffled.length))
    const onlineIds = new Set(toGoOnline.map(u => u.id))

    // Set the chosen fakes as "recently active" with a randomised last-seen offset
    // so they show "Last seen 3 minutes ago" rather than "just now".
    for (const u of toGoOnline) {
      const fakeTs = await fakeLastSeenTimestamp()
      await db.update(usersTable).set({ lastAccess: String(fakeTs) }).where(eq(usersTable.id, u.id))
    }

    // Broadcast via WebSocket so connected users see it live
    const { broadcastUserOnline } = await import("./websocket")
    for (const u of fakeUsers) {
      broadcastUserOnline(u.id, onlineIds.has(u.id))
    }
  } catch (err) {
    console.error("[FakeOnline] Error:", err)
  }
}

export function startFakeOnlineSimulator() {
  // Run once shortly after boot, then on a configurable interval
  setTimeout(() => { runFakeOnlineSimulator().catch(console.error) }, 15000)

  // Re-check interval every minute; actual run frequency is config-driven
  let lastRun = 0
  setInterval(async () => {
    try {
      const intervalMin = parseInt(await getConfigVal("fake_online_interval_minutes", "3"))
      const nowSec = now()
      if (nowSec - lastRun >= intervalMin * 60) {
        lastRun = nowSec
        await runFakeOnlineSimulator()
      }
    } catch {}
  }, 60 * 1000)
}
