import { Router } from "express"
import { db, isMysql } from "@workspace/db"
import { siteConfigTable, usersTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
const SLUGS = ["terms", "privacy"] as const
type LegalSlug = typeof SLUGS[number]
type PageFields = "title" | "content" | "noindex" | "updated_at"

function isLegalSlug(value: string): value is LegalSlug {
  return (SLUGS as readonly string[]).includes(value)
}

function keyFor(slug: LegalSlug, field: PageFields) {
  return `legal_${slug}_${field}`
}

async function getConfig(key: string) {
  const [row] = await db.select({ value: siteConfigTable.value })
    .from(siteConfigTable)
    .where(eq(siteConfigTable.key, key))
    .limit(1)
  return row?.value ?? null
}

async function setConfig(key: string, value: string) {
  if (isMysql) {
    await db.insert(siteConfigTable).values({ key, value })
      .onDuplicateKeyUpdate({ set: { value } })
  } else {
    await db.insert(siteConfigTable).values({ key, value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } })
  }
}

async function isAdmin(req: any) {
  if (!req.userId) return false
  const [user] = await db.select({ admin: usersTable.admin })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId))
    .limit(1)
  return !!user && (user.admin ?? 0) >= 2
}

function requireLegalAdmin(req: any, res: any, next: any) {
  isAdmin(req)
    .then(admin => admin ? next() : res.status(req.userId ? 403 : 401).json({ error: "Admin access required" }))
    .catch(() => res.status(500).json({ error: "Unable to verify admin access" }))
}

async function readPage(slug: LegalSlug) {
  const [title, content, noIndex, updatedAt] = await Promise.all([
    getConfig(keyFor(slug, "title")),
    getConfig(keyFor(slug, "content")),
    getConfig(keyFor(slug, "noindex")),
    getConfig(keyFor(slug, "updated_at")),
  ])
  return {
    slug,
    title,
    content,
    noIndex: noIndex === "1",
    updatedAt,
  }
}

// Admin editor data. Legal copy is stored in the existing site-config table,
// so these settings work with both the production MySQL and dev PostgreSQL DBs.
router.get("/admin", requireAuth, requireLegalAdmin, async (_req, res) => {
  try {
    const pages = await Promise.all(SLUGS.map(readPage))
    res.json(pages)
  } catch (err) {
    console.error("[legal-pages] admin read failed", err)
    res.status(500).json({ error: "Unable to load legal pages" })
  }
})

router.put("/admin/:slug", requireAuth, requireLegalAdmin, async (req, res) => {
  const slug = String(req.params.slug || "")
  if (!isLegalSlug(slug)) {
    res.status(404).json({ error: "Legal page not found" })
    return
  }

  const title = typeof req.body?.title === "string" ? req.body.title.trim() : ""
  const content = typeof req.body?.content === "string" ? req.body.content : ""
  const noIndex = req.body?.noIndex

  if (!title || title.length > 120) {
    res.status(400).json({ error: "Title is required and must be 120 characters or fewer" })
    return
  }
  if (!content.trim() || content.length > 60000) {
    res.status(400).json({ error: "Content is required and must be 60,000 characters or fewer" })
    return
  }
  if (typeof noIndex !== "boolean") {
    res.status(400).json({ error: "noIndex must be true or false" })
    return
  }

  try {
    const updatedAt = new Date().toISOString()
    await Promise.all([
      setConfig(keyFor(slug, "title"), title),
      setConfig(keyFor(slug, "content"), content),
      setConfig(keyFor(slug, "noindex"), noIndex ? "1" : "0"),
      setConfig(keyFor(slug, "updated_at"), updatedAt),
    ])
    res.json({ slug, title, content, noIndex, updatedAt })
  } catch (err) {
    console.error("[legal-pages] save failed", err)
    res.status(500).json({ error: "Unable to save legal page" })
  }
})

// Public frontend page data. Only the two known legal page slugs are exposed.
router.get("/:slug", async (req, res) => {
  const slug = String(req.params.slug || "")
  if (!isLegalSlug(slug)) {
    res.status(404).json({ error: "Legal page not found" })
    return
  }
  try {
    res.setHeader("Cache-Control", "no-store")
    res.json(await readPage(slug))
  } catch (err) {
    console.error("[legal-pages] public read failed", err)
    res.status(500).json({ error: "Unable to load legal page" })
  }
})

export default router
