import { Router } from "express"
import { db, pool, isMysql } from "@workspace/db"
import { emailCampaignsTable, usersTable, activityTable } from "@workspace/db/schema"
import { eq, and, ne, desc, gte, lte } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import { sendEmail } from "../lib/mailer"

function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) { res.status(401).json({ error: "Not authenticated" }); return }
  db.select({ admin: usersTable.admin }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1).then(([u]) => {
    if (!u || (u.admin ?? 0) < 2) { res.status(403).json({ error: "Admin access required" }); return }
    next()
  }).catch(() => res.status(500).json({ error: "Auth check failed" }))
}

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

// In-memory send state per campaign
const activeSenders = new Map<number, { timer: ReturnType<typeof setInterval>; stopped: boolean }>()

async function buildRecipientQuery(campaign: any): Promise<Array<{ email: string; name: string }>> {
  const rows = await (db.select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(and(
      eq(usersTable.banned, 0),
      ne(usersTable.email, ""),
      ...(campaign.onlyReal ? [eq(usersTable.fake, 0)] : []),
      ...(campaign.filterGender ? [eq(usersTable.gender, campaign.filterGender)] : []),
      ...(campaign.filterCountry ? [eq(usersTable.countryCode as any, campaign.filterCountry)] : []),
      ...(campaign.filterMinAge ? [gte(usersTable.age as any, campaign.filterMinAge)] : []),
      ...(campaign.filterMaxAge ? [lte(usersTable.age as any, campaign.filterMaxAge)] : []),
    )) as any)
  const seen = new Set<string>()
  const recipients: Array<{ email: string; name: string }> = []
  for (const r of rows) {
    if (r.email && !seen.has(r.email.toLowerCase())) {
      seen.add(r.email.toLowerCase())
      recipients.push({ email: r.email, name: r.name || "" })
    }
  }
  return recipients
}

async function logEmailResult(campaignId: number, email: string, status: "ok" | "fail", error = "") {
  const ts = now()
  try {
    if (isMysql) {
      const conn = await pool.getConnection()
      try {
        await conn.execute(
          "INSERT INTO email_campaign_logs (campaign_id, email, status, error, sent_at) VALUES (?, ?, ?, ?, ?)",
          [campaignId, email, status, error.slice(0, 1000), ts]
        )
      } finally { conn.release() }
    } else {
      await db.execute(
        `INSERT INTO email_campaign_logs (campaign_id, email, status, error, sent_at) VALUES ($1,$2,$3,$4,$5)` as any,
        [campaignId, email, status, error.slice(0, 1000), ts] as any
      )
    }
  } catch { /* log failures are non-fatal */ }
}

async function startCampaignSender(campaignId: number) {
  if (activeSenders.has(campaignId)) return

  const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, campaignId)).limit(1)
  if (!campaign || campaign.status !== "sending") return

  const recipients = await buildRecipientQuery(campaign)
  const total = recipients.length

  // Only overwrite totalRecipients if this is the first start (sentCount === 0),
  // so a server-restart resume doesn't reset the counter shown in the UI.
  if ((campaign.sentCount ?? 0) === 0) {
    await db.update(emailCampaignsTable)
      .set({ totalRecipients: total, startedAt: now() })
      .where(eq(emailCampaignsTable.id, campaignId))
  }

  let offset = campaign.sentCount ?? 0
  const batchSize = campaign.batchSize || 50
  const coolingMs = (campaign.coolingSeconds || 60) * 1000

  async function sendBatch() {
    const [fresh] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, campaignId)).limit(1)
    if (!fresh || fresh.status !== "sending") {
      stopSender(campaignId)
      return
    }

    const batch = recipients.slice(offset, offset + batchSize)
    if (batch.length === 0) {
      await db.update(emailCampaignsTable).set({ status: "completed", completedAt: now() }).where(eq(emailCampaignsTable.id, campaignId))
      stopSender(campaignId)
      return
    }

    let sentInBatch = 0
    let failedInBatch = 0
    for (const recipient of batch) {
      try {
        const ok = await sendEmail({ to: recipient.email, subject: fresh.subject, html: fresh.htmlBody })
        if (ok) {
          sentInBatch++
          await logEmailResult(campaignId, recipient.email, "ok")
        } else {
          failedInBatch++
          await logEmailResult(campaignId, recipient.email, "fail", "sendEmail returned false")
        }
      } catch (e: any) {
        failedInBatch++
        await logEmailResult(campaignId, recipient.email, "fail", e?.message || "unknown error")
      }
    }

    offset += batch.length
    await db.update(emailCampaignsTable).set({
      sentCount: (fresh.sentCount ?? 0) + sentInBatch,
      failedCount: (fresh.failedCount ?? 0) + failedInBatch,
      lastSentAt: now(),
    }).where(eq(emailCampaignsTable.id, campaignId))

    if (offset >= recipients.length) {
      await db.update(emailCampaignsTable).set({ status: "completed", completedAt: now() }).where(eq(emailCampaignsTable.id, campaignId))
      stopSender(campaignId)
    }
  }

  sendBatch().catch(console.error)
  const timer = setInterval(() => sendBatch().catch(console.error), coolingMs)
  activeSenders.set(campaignId, { timer, stopped: false })
}

function stopSender(campaignId: number) {
  const s = activeSenders.get(campaignId)
  if (s) {
    clearInterval(s.timer)
    activeSenders.delete(campaignId)
  }
}

// Resume any campaigns that were "sending" when the server last restarted
export async function resumeInProgressCampaigns() {
  try {
    const rows = await db.select().from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.status as any, "sending"))
    for (const campaign of rows) {
      console.log(`[email-campaigns] Resuming campaign #${campaign.id} "${campaign.name}" from offset ${campaign.sentCount}`)
      startCampaignSender(campaign.id).catch(console.error)
    }
  } catch (e) {
    console.error("[email-campaigns] Failed to resume in-progress campaigns:", e)
  }
}

// GET /api/admin/email-campaigns — list all campaigns
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const campaigns = await db.select().from(emailCampaignsTable).orderBy(desc(emailCampaignsTable.id))
    res.json(campaigns)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/email-campaigns/:id — get single campaign
router.get("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, id)).limit(1)
    if (!campaign) { res.status(404).json({ error: "Not found" }); return }
    res.json(campaign)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/admin/email-campaigns/:id/logs — per-email delivery log
router.get("/:id/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const page = Math.max(0, parseInt((req.query.page as string) || "0"))
    const limit = 100
    const offset = page * limit
    const status = req.query.status as string | undefined

    let rows: any[]
    if (isMysql) {
      const conn = await pool.getConnection()
      try {
        const statusClause = status ? " AND status = ?" : ""
        const params: any[] = [id]
        if (status) params.push(status)
        params.push(limit, offset)
        const [r]: any = await conn.execute(
          `SELECT id, email, status, error, sent_at FROM email_campaign_logs WHERE campaign_id = ?${statusClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
          params
        )
        const [cnt]: any = await conn.execute(
          `SELECT COUNT(*) as total FROM email_campaign_logs WHERE campaign_id = ?${statusClause}`,
          status ? [id, status] : [id]
        )
        rows = r
        res.json({ logs: rows, total: cnt[0]?.total || 0, page, limit })
      } finally { conn.release() }
    } else {
      const statusWhere = status ? ` AND status = '${status === "ok" ? "ok" : "fail"}'` : ""
      rows = await db.execute(
        `SELECT id, email, status, error, sent_at FROM email_campaign_logs WHERE campaign_id = ${id}${statusWhere} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}` as any
      ) as any
      res.json({ logs: rows, total: rows.length, page, limit })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/email-campaigns — create campaign
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, subject, htmlBody, batchSize, coolingSeconds, filterGender, filterCountry, filterMinAge, filterMaxAge, onlyReal } = req.body
    if (!name || !subject || !htmlBody) { res.status(400).json({ error: "name, subject and htmlBody are required" }); return }

    const vals = {
      name: String(name).trim(),
      subject: String(subject).trim(),
      htmlBody: String(htmlBody),
      status: "draft",
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      batchSize: parseInt(batchSize) || 50,
      coolingSeconds: parseInt(coolingSeconds) || 60,
      filterGender: parseInt(filterGender) || 0,
      filterCountry: String(filterCountry || ""),
      filterMinAge: parseInt(filterMinAge) || 0,
      filterMaxAge: parseInt(filterMaxAge) || 0,
      onlyReal: onlyReal === false ? 0 : 1,
      createdBy: req.userId ?? 0,
      createdAt: now(),
      startedAt: 0,
      completedAt: 0,
      lastSentAt: 0,
    }

    if (isMysql) {
      const conn = await pool.getConnection()
      try {
        const [result]: any = await conn.execute(
          `INSERT INTO email_campaigns
            (name, subject, html_body, status, total_recipients, sent_count, failed_count,
             batch_size, cooling_seconds, filter_gender, filter_country, filter_min_age,
             filter_max_age, only_real, created_by, created_at, started_at, completed_at, last_sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vals.name, vals.subject, vals.htmlBody, vals.status,
            vals.totalRecipients, vals.sentCount, vals.failedCount,
            vals.batchSize, vals.coolingSeconds, vals.filterGender, vals.filterCountry,
            vals.filterMinAge, vals.filterMaxAge, vals.onlyReal,
            vals.createdBy, vals.createdAt, vals.startedAt, vals.completedAt, vals.lastSentAt,
          ]
        )
        const insertId = result.insertId
        const [rows]: any = await conn.execute("SELECT * FROM email_campaigns WHERE id = ?", [insertId])
        const row = rows[0]
        res.json({
          id: row.id, name: row.name, subject: row.subject, htmlBody: row.html_body,
          status: row.status, totalRecipients: row.total_recipients, sentCount: row.sent_count,
          failedCount: row.failed_count, batchSize: row.batch_size, coolingSeconds: row.cooling_seconds,
          filterGender: row.filter_gender, filterCountry: row.filter_country,
          filterMinAge: row.filter_min_age, filterMaxAge: row.filter_max_age,
          onlyReal: row.only_real, createdBy: row.created_by, createdAt: row.created_at,
          startedAt: row.started_at, completedAt: row.completed_at, lastSentAt: row.last_sent_at,
        })
      } finally {
        conn.release()
      }
      return
    }

    await db.insert(emailCampaignsTable).values(vals)
    const campaigns = await db.select().from(emailCampaignsTable).orderBy(desc(emailCampaignsTable.id)).limit(1)
    res.json(campaigns[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/admin/email-campaigns/:id — update draft campaign
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, id)).limit(1)
    if (!campaign) { res.status(404).json({ error: "Not found" }); return }
    if (campaign.status !== "draft" && campaign.status !== "paused") {
      res.status(400).json({ error: "Can only edit draft or paused campaigns" }); return
    }
    const { name, subject, htmlBody, batchSize, coolingSeconds, filterGender, filterCountry, filterMinAge, filterMaxAge, onlyReal } = req.body
    await db.update(emailCampaignsTable).set({
      ...(name && { name: name.trim() }),
      ...(subject && { subject: subject.trim() }),
      ...(htmlBody !== undefined && { htmlBody }),
      ...(batchSize && { batchSize: parseInt(batchSize) }),
      ...(coolingSeconds && { coolingSeconds: parseInt(coolingSeconds) }),
      ...(filterGender !== undefined && { filterGender: parseInt(filterGender) }),
      ...(filterCountry !== undefined && { filterCountry }),
      ...(filterMinAge !== undefined && { filterMinAge: parseInt(filterMinAge) }),
      ...(filterMaxAge !== undefined && { filterMaxAge: parseInt(filterMaxAge) }),
      ...(onlyReal !== undefined && { onlyReal: onlyReal ? 1 : 0 }),
    }).where(eq(emailCampaignsTable.id, id))
    const [updated] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, id)).limit(1)
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/email-campaigns/:id/start — start sending
router.post("/:id/start", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [campaign] = await db.select().from(emailCampaignsTable).where(eq(emailCampaignsTable.id, id)).limit(1)
    if (!campaign) { res.status(404).json({ error: "Not found" }); return }
    if (campaign.status === "sending") { res.json({ ok: true, message: "Already sending" }); return }
    await db.update(emailCampaignsTable).set({ status: "sending", startedAt: campaign.startedAt || now() }).where(eq(emailCampaignsTable.id, id))
    await db.insert(activityTable as any).values({ type: "email_campaign", userId: req.userId, title: "Campaign started", message: `"${campaign.name}" started`, time: now() })
    startCampaignSender(id).catch(console.error)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/email-campaigns/:id/pause — pause sending
router.post("/:id/pause", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    await db.update(emailCampaignsTable).set({ status: "paused" }).where(eq(emailCampaignsTable.id, id))
    stopSender(id)
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/admin/email-campaigns/:id/reset — reset to draft
router.post("/:id/reset", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    stopSender(id)
    await db.update(emailCampaignsTable).set({ status: "draft", sentCount: 0, failedCount: 0, totalRecipients: 0, startedAt: 0, completedAt: 0 }).where(eq(emailCampaignsTable.id, id))
    // Clear logs for this campaign too
    if (isMysql) {
      const conn = await pool.getConnection()
      try { await conn.execute("DELETE FROM email_campaign_logs WHERE campaign_id = ?", [id]) } finally { conn.release() }
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/email-campaigns/:id — delete campaign
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    stopSender(id)
    if (isMysql) {
      const conn = await pool.getConnection()
      try {
        await conn.execute("DELETE FROM email_campaign_logs WHERE campaign_id = ?", [id])
        await conn.execute("DELETE FROM email_campaigns WHERE id = ?", [id])
      } finally { conn.release() }
    } else {
      await db.delete(emailCampaignsTable).where(eq(emailCampaignsTable.id, id))
    }
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
