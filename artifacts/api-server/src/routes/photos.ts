import { Router } from "express"
import { db } from "@workspace/db"
import { photosTable, usersTable, siteConfigTable } from "@workspace/db/schema"
import { eq, and } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import multer from "multer"
import path from "path"
import fs from "fs"

/** Compress an uploaded image in-place using sharp (if available).
 *  Resizes to max 1200px on either dimension, converts to JPEG at quality 85.
 *  Returns true if compression succeeded, false if sharp is unavailable or failed. */
async function compressImage(filePath: string): Promise<boolean> {
  try {
    // Dynamic import with type bypass so sharp is optional (not bundled, loaded at runtime)
    const sharpMod = await import("sharp" as unknown as string) as any
    const sharp = sharpMod.default ?? sharpMod
    const tmpPath = filePath + ".tmp"
    await sharp(filePath)
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(tmpPath)
    fs.renameSync(tmpPath, filePath)
    return true
  } catch {
    // sharp not installed or unsupported — keep original file as-is
    return false
  }
}

const uploadDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowed.includes(ext)) {
      return cb(new Error("Only image files are allowed"))
    }
    cb(null, true)
  }
})

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

const PHONE_PATTERN = /(\+?[\d\s\-().]{7,20})/g
const CONTACT_KEYWORDS = /\b(whatsapp|telegram|signal|snapchat|instagram|facebook|twitter|tiktok|kik|viber|wechat|line|skype|discord|email|gmail|yahoo|hotmail|@|\.com|\.net|\.org)\b/i

function detectContactInfo(text: string): { detected: boolean; reason: string } {
  if (PHONE_PATTERN.test(text)) {
    const matches = text.match(PHONE_PATTERN)
    const phones = (matches || [] as string[]).filter((m: string) => m.replace(/\D/g, "").length >= 7)
    if (phones.length > 0) return { detected: true, reason: "Phone number detected in filename" }
  }
  if (CONTACT_KEYWORDS.test(text)) {
    return { detected: true, reason: "Contact/social media info detected in filename" }
  }
  return { detected: false, reason: "" }
}

function checkFilenameForContacts(filename: string): { flagged: boolean; reason: string } {
  const nameWithoutExt = path.basename(filename, path.extname(filename)).toLowerCase()
  const decoded = decodeURIComponent(nameWithoutExt).replace(/[_\-]/g, " ")
  const detection = detectContactInfo(decoded)
  if (detection.detected) return { flagged: true, reason: detection.reason }
  return { flagged: false, reason: "" }
}

router.post("/upload", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return }

    const originalName = req.file.originalname || ""
    const { flagged, reason } = checkFilenameForContacts(originalName)

    const photoModeration = await getConfig("photo_moderation")
    const autoDetectContacts = await getConfig("auto_detect_contacts")

    if (flagged && autoDetectContacts === "1") {
      fs.unlink(req.file.path, () => {})
      res.status(400).json({
        error: "Photo rejected: Uploading photos with contact information is not allowed. Please upload a clean profile photo."
      })
      return
    }

    const approved = photoModeration === "1" ? 0 : 1

    // Compress the uploaded file (shrink to max 1200px, JPEG q85)
    const compressed = await compressImage(req.file.path)

    // If compression ran, output is always JPEG — rename non-jpeg extensions accordingly
    let filename = req.file.filename
    if (compressed) {
      const uploadedExt = path.extname(filename).toLowerCase()
      if (uploadedExt !== ".jpg" && uploadedExt !== ".jpeg") {
        const newFilename = filename.replace(/\.[^.]+$/, ".jpg")
        const oldPath = path.join(uploadDir, filename)
        const newPath = path.join(uploadDir, newFilename)
        if (fs.existsSync(oldPath)) fs.renameSync(oldPath, newPath)
        filename = newFilename
      }
    }
    await db.insert(photosTable).values({
      userId: req.userId!,
      photo: filename,
      thumb: filename,
      approved,
      flagged: flagged ? 1 : 0,
      flagReason: reason,
      created: now(),
    })
    const [photo] = await db.select().from(photosTable)
      .where(eq(photosTable.photo, filename))
      .limit(1)

    const [userPhotos] = await db.select().from(photosTable)
      .where(and(eq(photosTable.userId, req.userId!), eq(photosTable.main, 1)))
      .limit(1)

    if (!userPhotos) {
      await db.update(photosTable).set({ main: 1 }).where(eq(photosTable.id, photo.id))
      await db.update(usersTable).set({ photo: filename, photoThumb: filename }).where(eq(usersTable.id, req.userId!))
    }

    res.json({
      photo,
      flagged,
      flagReason: reason,
      pending: approved === 0,
      message: approved === 0 ? "Photo uploaded and awaiting admin approval" : "Photo uploaded successfully"
    })
  } catch (err: any) {
    console.error("Upload error:", err)
    res.status(500).json({ error: err.message || "Upload failed" })
  }
})

router.post("/set-main/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [photo] = await db.select().from(photosTable)
      .where(and(eq(photosTable.id, id), eq(photosTable.userId, req.userId!)))
      .limit(1)
    if (!photo) { res.status(404).json({ error: "Photo not found" }); return }

    await db.update(photosTable).set({ main: 0 }).where(eq(photosTable.userId, req.userId!))
    await db.update(photosTable).set({ main: 1 }).where(eq(photosTable.id, id))
    await db.update(usersTable).set({ photo: photo.photo, photoThumb: photo.thumb || photo.photo }).where(eq(usersTable.id, req.userId!))

    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [photo] = await db.select().from(photosTable).where(and(eq(photosTable.id, id), eq(photosTable.userId, req.userId!))).limit(1)
    if (!photo) { res.status(404).json({ error: "Not found" }); return }
    await db.delete(photosTable).where(eq(photosTable.id, id))
    try { fs.unlinkSync(path.join(uploadDir, photo.photo || "")) } catch {}
    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.get("/mine", requireAuth, async (req, res) => {
  try {
    const photos = await db.select().from(photosTable)
      .where(eq(photosTable.userId, req.userId!))
    res.json(photos)
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.put("/admin/approve/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!me || me.admin < 1) { res.status(403).json({ error: "Admin only" }); return }
    await db.update(photosTable).set({ approved: 1 }).where(eq(photosTable.id, id))
    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.delete("/admin/reject/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string)
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!me || me.admin < 1) { res.status(403).json({ error: "Admin only" }); return }
    const [photo] = await db.select().from(photosTable).where(eq(photosTable.id, id)).limit(1)
    if (photo) {
      await db.delete(photosTable).where(eq(photosTable.id, id))
      try { fs.unlinkSync(path.join(uploadDir, photo.photo || "")) } catch {}
    }
    res.json({ success: true })
  } catch { res.status(500).json({ error: "Failed" }) }
})

router.get("/admin/pending", requireAuth, async (req, res) => {
  try {
    const [me] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1)
    if (!me || me.admin < 1) { res.status(403).json({ error: "Admin only" }); return }
    const photos = await db.select({
      photo: photosTable,
      user: { id: usersTable.id, name: usersTable.name }
    }).from(photosTable)
      .leftJoin(usersTable, eq(photosTable.userId, usersTable.id))
      .where(eq(photosTable.approved, 0))
    res.json(photos)
  } catch { res.status(500).json({ error: "Failed" }) }
})

export default router
