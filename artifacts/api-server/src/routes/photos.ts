import { Router } from "express"
import { db } from "@workspace/db"
import { photosTable } from "@workspace/db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import multer from "multer"
import path from "path"
import fs from "fs"

const uploadDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

router.post("/upload", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return }
    const filename = req.file.filename
    const [photo] = await db.insert(photosTable).values({
      userId: req.userId!,
      photo: filename,
      thumb: filename,
      approved: 1,
      created: now(),
    }).returning()
    res.json({ photo })
  } catch { res.status(500).json({ error: "Upload failed" }) }
})

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const [photo] = await db.select().from(photosTable).where(and(eq(photosTable.id, id), eq(photosTable.userId, req.userId!))).limit(1)
    if (!photo) { res.status(404).json({ error: "Not found" }); return }
    await db.delete(photosTable).where(eq(photosTable.id, id))
    try { fs.unlinkSync(path.join(uploadDir, photo.photo || "")) } catch {}
    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed" }) }
})

export default router
