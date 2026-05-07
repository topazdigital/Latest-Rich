import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable, siteConfigTable, activityTable, notificationsTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "../lib/auth-middleware"
import multer from "multer"
import path from "path"
import fs from "fs"

const router = Router()
function now() { return Math.floor(Date.now() / 1000) }

const uploadDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `verify_${(req as any).userId}_${Date.now()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
    const ext = path.extname(file.originalname).toLowerCase()
    if (!allowed.includes(ext)) return cb(new Error("Only image files are allowed"))
    cb(null, true)
  },
})

async function getConfig(key: string, fallback = ""): Promise<string> {
  try {
    const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return row?.value || fallback
  } catch { return fallback }
}

// GET /api/verification/challenge — get current gesture + user status
router.get("/challenge", requireAuth, async (req: any, res) => {
  try {
    const gesture = await getConfig("verification_gesture", "Hold up two fingers and smile at the camera")
    const [user] = await db.select({
      verificationStatus: usersTable.verificationStatus,
      verificationPhoto: usersTable.verificationPhoto,
      verificationNote: usersTable.verificationNote,
      verified: usersTable.verified,
    }).from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)

    res.json({
      gesture,
      status: user?.verificationStatus || "none",
      photo: user?.verificationPhoto || "",
      note: user?.verificationNote || "",
      verified: user?.verified || 0,
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/verification/submit — submit selfie photo
router.post("/submit", requireAuth, upload.single("photo"), async (req: any, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId)).limit(1)
    if (!user) { res.status(404).json({ error: "User not found" }); return }
    if (user.verificationStatus === "approved" || user.verified === 1) {
      res.status(400).json({ error: "Already verified" }); return
    }
    if (!req.file) { res.status(400).json({ error: "Photo required" }); return }

    const filename = req.file.filename
    const mode = await getConfig("verification_mode", "manual")
    const isAuto = mode === "auto"

    await db.update(usersTable).set({
      verificationStatus: isAuto ? "approved" : "pending",
      verificationPhoto: filename,
      verificationNote: "",
      verified: isAuto ? 1 : 0,
    }).where(eq(usersTable.id, req.userId))

    if (isAuto) {
      await db.insert(notificationsTable).values({
        userId: req.userId,
        fromId: null,
        type: "verified",
        message: "🎉 Your account has been verified! You now have a blue tick on your profile.",
        link: `/profile/${req.userId}`,
        read: 0,
        time: now(),
      })
    } else {
      await db.insert(activityTable).values({
        type: "verification",
        userId: req.userId,
        title: "Verification request submitted",
        message: `${user.name} submitted a verification selfie — awaiting admin review`,
        time: now(),
      })
    }

    res.json({
      success: true,
      status: isAuto ? "approved" : "pending",
      verified: isAuto ? 1 : 0,
      message: isAuto
        ? "Congratulations! Your account is now verified."
        : "Your verification photo has been submitted. An admin will review it shortly.",
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
