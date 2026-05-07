import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"

function calcAge(birthday: string): number {
  if (!birthday) return 0
  const d = new Date(birthday)
  const t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
  return Math.max(0, age)
}

async function updateAges() {
  try {
    const users = await db.select({ id: usersTable.id, birthday: usersTable.birthday, age: usersTable.age })
      .from(usersTable)
      .limit(5000)

    let updated = 0
    for (const user of users) {
      if (!user.birthday) continue
      const correctAge = calcAge(user.birthday)
      if (correctAge > 0 && correctAge !== user.age) {
        await db.update(usersTable).set({ age: correctAge }).where(eq(usersTable.id, user.id))
        updated++
      }
    }
    if (updated > 0) console.log(`[age-updater] Updated ages for ${updated} users`)
  } catch (err) {
    console.error('[age-updater] Error:', err)
  }
}

export function startAgeUpdater() {
  updateAges().catch(() => {})
  setInterval(() => updateAges().catch(() => {}), 6 * 60 * 60 * 1000)
}
