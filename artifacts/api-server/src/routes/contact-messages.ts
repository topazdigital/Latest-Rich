import { Router } from "express"
import { db } from "@workspace/db"
import { contactSubmissionsTable, usersTable, activityTable } from "@workspace/db/schema"
import { eq, desc } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { sendEmail, wrapBrandedHtml } from "../lib/mailer"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) { res.status(401).json({ error: "Not authenticated" }); return }
  db.select({ admin: usersTable.admin }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1).then(([u]) => {
    if (!u || (u.admin ?? 0) < 2) { res.status(403).json({ error: "Admin access required" }); return }
    next()
  }).catch(() => res.status(500).json({ error: "Auth check failed" }))
}

// List all contact-form submissions, newest first
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await db.select().from(contactSubmissionsTable).orderBy(desc(contactSubmissionsTable.id))
    res.json(rows)
  } catch (err) {
    console.error("[ContactMessages] list error:", err)
    res.status(500).json({ error: "Failed to load messages" })
  }
})

router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const [row] = await db.select().from(contactSubmissionsTable).where(eq(contactSubmissionsTable.id, id)).limit(1)
    if (!row) { res.status(404).json({ error: "Not found" }); return }
    res.json(row)
  } catch {
    res.status(500).json({ error: "Failed to load message" })
  }
})

// Send a reply email to the submitter and record it on the thread
router.post("/:id/reply", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { subject, html } = req.body
    if (!html?.trim()) { res.status(400).json({ error: "Reply body is required" }); return }

    const [row] = await db.select().from(contactSubmissionsTable).where(eq(contactSubmissionsTable.id, id)).limit(1)
    if (!row) { res.status(404).json({ error: "Message not found" }); return }

    const finalSubject = subject?.trim() || `Re: ${row.subject?.trim() || "Your message to us"}`
    const wrapped = wrapBrandedHtml({
      title: finalSubject,
      emoji: "💬",
      bodyHtml: `<p style="margin:0 0 16px">Hi ${escapeHtml(row.name)},</p>${html}`,
      footerNote: "This is a reply to the message you sent us via our contact form.",
    })

    const sent = await sendEmail({
      to: row.email,
      subject: finalSubject,
      html: wrapped,
    })

    if (!sent) { res.status(502).json({ error: "SMTP is not configured or the send failed. Check Settings → Email." }); return }

    await db.update(contactSubmissionsTable).set({
      replied: 1,
      repliedAt: now(),
      replyMessage: html,
    }).where(eq(contactSubmissionsTable.id, id))

    await db.insert(activityTable).values({
      type: "admin", userId: req.userId, title: "Contact reply sent",
      message: `Replied to ${row.name} <${row.email}>`, time: now(),
    }).catch(() => {})

    res.json({ success: true })
  } catch (err) {
    console.error("[ContactMessages] reply error:", err)
    res.status(500).json({ error: "Failed to send reply" })
  }
})

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    await db.delete(contactSubmissionsTable).where(eq(contactSubmissionsTable.id, id))
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: "Failed to delete message" })
  }
})

function escapeHtml(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export default router
