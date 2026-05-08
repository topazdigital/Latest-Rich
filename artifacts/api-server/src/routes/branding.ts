import { Router } from "express"
import path from "path"
import fs from "fs"
import multer from "multer"
import { db } from "@workspace/db"
import { siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"

const router = Router()
const brandingDir = path.join(process.cwd(), "uploads", "branding")
if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true })

const storage = multer.diskStorage({
  destination: brandingDir,
  filename(req, file, cb) {
    const type = req.params.type || "logo"
    const ext = path.extname(file.originalname)
    cb(null, `${type}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" })
  const { usersTable } = await import("@workspace/db/schema")
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)
  if (!user || user.admin !== 1) return res.status(403).json({ error: "Admin only" })
  next()
}

router.post("/upload/:type", requireAuth, requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file" }); return }
    const type = req.params.type as string
    if (!["logo", "favicon", "gesture"].includes(type)) { res.status(400).json({ error: "Invalid type" }); return }
    const filename = req.file.filename
    const url = `/api/branding/file/${filename}`
    await db.insert(siteConfigTable).values({ key: `branding_${type}`, value: url })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: url } })
    res.json({ url })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/file/:filename", (req, res) => {
  const { filename } = req.params
  if (filename.includes("..") || filename.includes("/")) { res.status(400).send("Invalid"); return }
  const filePath = path.join(brandingDir, filename)
  if (!fs.existsSync(filePath)) { res.status(404).send("Not found"); return }
  res.sendFile(filePath)
})

router.get("/public", async (req, res) => {
  try {
    const rows = await db.select().from(siteConfigTable)
    const config: Record<string, string> = {}
    const keys = ["site_name", "site_tagline", "branding_logo", "branding_favicon", "site_email", "feed_enabled", "site_url"]
    for (const row of rows) {
      if (keys.includes(row.key)) config[row.key] = row.value || ""
    }
    res.json(config)
  } catch { res.json({}) }
})

export default router
