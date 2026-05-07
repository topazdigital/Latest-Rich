import { db } from "@workspace/db"
import {
  usersTable, messagesTable, notificationsTable,
  fakeMessageTemplatesTable, autoMessageLogTable, likesTable
} from "@workspace/db/schema"
import { eq, and, sql, notInArray, inArray } from "drizzle-orm"

function now() { return Math.floor(Date.now() / 1000) }

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function triggerAutoMessages(realUserId?: number): Promise<number> {
  const templates = await db.select().from(fakeMessageTemplatesTable)
    .where(eq(fakeMessageTemplatesTable.active, 1))
  if (!templates.length) return 0

  const realUsers = realUserId
    ? await db.select().from(usersTable)
        .where(and(eq(usersTable.id, realUserId), eq(usersTable.fake, 0)))
        .limit(1)
    : await db.select().from(usersTable)
        .where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0)))
        .limit(50)

  if (!realUsers.length) return 0

  let sentCount = 0

  for (const realUser of realUsers) {
    // looking: 1 = men, 2 = women, 3 = both  |  gender: 1 = man, 2 = woman
    const genderFilter = realUser.looking === 3 ? [1, 2] : [realUser.looking ?? 2]

    const recentlyMessaged = await db
      .select({ fakeUserId: autoMessageLogTable.fakeUserId })
      .from(autoMessageLogTable)
      .where(and(
        eq(autoMessageLogTable.realUserId, realUser.id),
        sql`${autoMessageLogTable.time} > ${now() - 86400 * 3}`
      ))

    const excludeIds = recentlyMessaged
      .map(r => r.fakeUserId)
      .filter((id): id is number => id !== null)

    const fakeUsers = await db.select().from(usersTable)
      .where(and(
        eq(usersTable.fake, 1),
        eq(usersTable.banned, 0),
        inArray(usersTable.gender, genderFilter),
        ...(excludeIds.length > 0 ? [notInArray(usersTable.id, excludeIds)] : [])
      ))
      .limit(20)

    if (!fakeUsers.length) continue

    const numMessages = Math.floor(Math.random() * 3) + 1
    const selectedFakers = [...fakeUsers].sort(() => Math.random() - 0.5).slice(0, numMessages)

    for (const faker of selectedFakers) {
      const template = pickRandom(templates)
      const msgTime = now() - Math.floor(Math.random() * 3600)

      await db.insert(messagesTable).values({
        u1: faker.id,
        u2: realUser.id,
        message: template.message,
        time: msgTime,
        read: 0,
      })

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
        time: now(),
      })

      // Record the like using the correct schema fields (userId, targetId)
      await db.insert(likesTable).values({
        userId: faker.id,
        targetId: realUser.id,
        created: msgTime,
      }).onConflictDoNothing()

      sentCount++
    }
  }

  return sentCount
}

export function startAutoMessageScheduler() {
  setTimeout(() => { triggerAutoMessages().catch(console.error) }, 5000)
  setInterval(() => { triggerAutoMessages().catch(console.error) }, 30 * 60 * 1000)
}
