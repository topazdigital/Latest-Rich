import { Router } from "express"
import path from "path"
import fs from "fs"

const router = Router()

function getSearchDirs(): string[] {
  const dirs = [
    path.join(process.cwd(), "assets", "sources", "uploads"),
    path.join(process.cwd(), "uploads"),
  ]
  if (process.env.LEGACY_UPLOADS_DIR) {
    dirs.unshift(process.env.LEGACY_UPLOADS_DIR)
  }
  return dirs
}

// Handle any path, including subdirectory paths like "2023/photo.jpg"
// (The old PHP site stored photos in date-based subfolders)
router.use((req, res) => {
  // req.url is relative to the router mount point, e.g. "/2023/photo.jpg"
  const rawUrl = req.url.split('?')[0]  // ignore query strings
  const rawPath = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl

  // Decode each segment individually to prevent encoded traversal attacks
  const parts = rawPath.split('/').map(seg => {
    try { return decodeURIComponent(seg) } catch { return seg }
  })

  // Block path traversal and empty paths
  if (!parts[0] || parts.some(p => p === '..' || p === '.')) {
    res.status(400).send("Invalid path")
    return
  }

  const filename = parts.join(path.sep)

  for (const dir of getSearchDirs()) {
    const full = path.resolve(dir, filename)
    // Ensure resolved path is still inside the search directory
    if (!full.startsWith(path.resolve(dir))) continue
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.sendFile(full)
      return
    }
  }
  res.status(404).send("Not found")
})

export default router
