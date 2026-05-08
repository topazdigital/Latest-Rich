import { Router } from "express"
import path from "path"
import fs from "fs"

const router = Router()

// Search these directories in order for uploaded files
function getSearchDirs(): string[] {
  const dirs = [
    path.join(process.cwd(), "assets", "sources", "uploads"),
    path.join(process.cwd(), "uploads"),
  ]
  // Allow pointing to an existing PHP site's uploads directory via env var
  if (process.env.LEGACY_UPLOADS_DIR) {
    dirs.unshift(process.env.LEGACY_UPLOADS_DIR)
  }
  return dirs
}

router.get("/:filename", (req, res) => {
  const { filename } = req.params
  if (filename.includes("..") || filename.includes("/")) {
    res.status(400).send("Invalid filename")
    return
  }
  for (const dir of getSearchDirs()) {
    const full = path.join(dir, filename)
    if (fs.existsSync(full)) {
      res.sendFile(full)
      return
    }
  }
  res.status(404).send("Not found")
})

export default router
