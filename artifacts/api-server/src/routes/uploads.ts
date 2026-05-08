import { Router } from "express"
import path from "path"
import fs from "fs"

const router = Router()
// Primary: assets/sources/uploads (old-site migrated photos)
// Fallback: uploads/ (new uploads from this app)
const uploadDir = path.join(process.cwd(), "assets", "sources", "uploads")
const fallbackDir = path.join(process.cwd(), "uploads")

router.get("/:filename", (req, res) => {
  const { filename } = req.params
  if (filename.includes("..") || filename.includes("/")) {
    res.status(400).send("Invalid filename")
    return
  }
  const primary = path.join(uploadDir, filename)
  if (fs.existsSync(primary)) {
    res.sendFile(primary)
    return
  }
  const fallback = path.join(fallbackDir, filename)
  if (fs.existsSync(fallback)) {
    res.sendFile(fallback)
    return
  }
  res.status(404).send("Not found")
})

export default router
