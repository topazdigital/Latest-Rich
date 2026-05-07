import { db } from "@workspace/db"
import {
  usersTable, messagesTable, notificationsTable,
  fakeMessageTemplatesTable, autoMessageLogTable
} from "@workspace/db/schema"
import { eq, ne, and, sql, notInArray, inArray } from "drizzle-orm"

function now() { return Math.floor(Date.now() / 1000) }

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function triggerAutoMessages(realUserId?: number): Promise<number> {
  try {
    const templates = await db.select().from(fakeMessageTemplatesTable).where(eq(fakeMessageTemplatesTable.active, 1))
    if (!templates.length) return 0

    // Get real users (fake=0, not banned)
    let realUsersQuery = db.select().from(usersTable).where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0)))
    const realUsers = realUserId
      ? await db.select().from(usersTable).where(and(eq(usersTable.id, realUserId), eq(usersTable.fake, 0))).limit(1)
      : await (realUsersQuery as any).limit(50)

    if (!realUsers.length) return 0

    let sentCount = 0

    for (const realUser of realUsers) {
      // Find fake users of the gender the real user is looking for
      // looking: 1 = men, 2 = women, 3 = both
      // gender: 1 = man, 2 = woman
      let genderFilter = realUser.looking === 3 ? [1, 2] : [realUser.looking || 2]

      // Get fake users matching criteria, that haven't already messaged this real user recently
      const recentlyMessaged = await db.select({ fakeUserId: autoMessageLogTable.fakeUserId })
        .from(autoMessageLogTable)
        .where(and(
          eq(autoMessageLogTable.realUserId, realUser.id),
          sql`${autoMessageLogTable.time} > ${now() - 86400 * 3}`
        ))
      const excludeIds = recentlyMessaged.map(r => r.fakeUserId)

      const fakeUsersQ = db.select().from(usersTable)
        .where(and(
          eq(usersTable.fake, 1),
          eq(usersTable.banned, 0),
          inArray(usersTable.gender, genderFilter),
          ...(excludeIds.length > 0 ? [notInArray(usersTable.id, excludeIds)] : [])
        ))

      const fakeUsers = await (fakeUsersQ as any).limit(20)
      if (!fakeUsers.length) continue

      // Send 1-3 messages per real user
      const numMessages = Math.floor(Math.random() * 3) + 1
      const selectedFakers = fakeUsers.sort(() => Math.random() - 0.5).slice(0, numMessages)

      for (const faker of selectedFakers) {
        const template = pickRandom(templates)
        const msgTime = now() - Math.floor(Math.random() * 3600) // random within last hour

        // Insert message
        await db.insert(messagesTable).values({
          u1: faker.id,
          u2: realUser.id,
          message: template.message,
          time: msgTime,
          read: 0,
        })

        // Insert notification
        await db.insert(notificationsTable).values({
          userId: realUser.id,
          fromId: faker.id,
          type: "message",
          message: `${faker.name} sent you a message`,
          link: `/chat/${faker.id}`,
          read: 0,
          time: msgTime,
        })

        // Log it
        await db.insert(autoMessageLogTable).values({
          fakeUserId: faker.id,
          realUserId: realUser.id,
          time: now(),
        })

        // Also give a like from the fake user (silent, best-effort)
        try {
          const { likesTable: lt } = await import("@workspace/db/schema")
          await db.insert(lt).values({ u1: faker.id, u2: realUser.id, type: "like", time: msgTime }).onConflictDoNothing()
        } catch { /* ignore */ }

        sentCount++
      }
    }

    return sentCount
  } catch (err) {
    console.error("Auto message scheduler error:", err)
    return 0
  }
}

export function startAutoMessageScheduler() {
  // Run immediately on start
  setTimeout(async () => {
    await triggerAutoMessages()
  }, 5000)

  // Then every 30 minutes
  setInterval(async () => {
    await triggerAutoMessages()
  }, 30 * 60 * 1000)
}
