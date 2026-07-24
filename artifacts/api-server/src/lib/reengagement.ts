import { db } from "@workspace/db"
import { notificationsTable, usersTable } from "@workspace/db/schema"
import { and, eq, gte, lte } from "drizzle-orm"
import { sendEmail, wrapBrandedHtml } from "./mailer"

const now = () => Math.floor(Date.now() / 1000)
const THREE_DAYS = 3 * 86400
const COOLDOWN = 7 * 86400

export async function sendReengagementEmails() {
  try {
    const cutoff = now() - THREE_DAYS
    const users = await db.select().from(usersTable)
      .where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0), lte(usersTable.lastAccess, String(cutoff))))
      .limit(200)
    let sent = 0
    for (const user of users) {
      if (!user.email || user.email.includes("@rdn.local")) continue
      const [recent] = await db.select({ id: notificationsTable.id }).from(notificationsTable)
        .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.type, "reengagement"), gte(notificationsTable.time, now() - COOLDOWN))).limit(1)
      if (recent) continue
      const ok = await sendEmail({
        to: user.email,
        subject: "You have new admirers waiting",
        html: wrapBrandedHtml({
          title: "Your connections are waiting",
          emoji: "💌",
          bodyHtml: `<p>Hi ${String(user.name || "there").replace(/[<>]/g, "")},</p><p>You have new admirers and conversations waiting on Rich Dating Network. Come back and see who is thinking of you.</p><p><a href="https://richdatingnetwork.com/likes" style="display:inline-block;background:#FF192C;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">See your admirers</a></p>`,
        }),
      })
      if (ok) {
        await db.insert(notificationsTable).values({
          userId: user.id, type: "reengagement", message: "You have new admirers waiting", link: "/likes", read: 0, time: now(),
        } as any)
        sent++
      }
    }
    if (sent) console.log(`[Re-engagement] Sent ${sent} inactive-user email(s)`)
  } catch (err) {
    console.error("[Re-engagement] Job failed:", err)
  }
}