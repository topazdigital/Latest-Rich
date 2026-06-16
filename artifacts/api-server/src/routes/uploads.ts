import { Router } from "express"
import express from "express"
import path from "path"
import fs from "fs"

const router = Router()

// Determine which upload directories actually exist on this machine.
// Evaluated once at startup — process.cwd() is set to the project root via ecosystem.config.cjs.
const uploadDirs = [
  path.join(process.cwd(), "assets", "sources", "uploads"),  // production: old PHP site uploads
  path.join(process.cwd(), "uploads"),                         // dev / symlink target
  ...(process.env.LEGACY_UPLOADS_DIR ? [process.env.LEGACY_UPLOADS_DIR] : []),
].filter(d => { try { return fs.existsSync(d) && fs.statSync(d).isDirectory() } catch { return false } })

console.log("[uploads] Serving from directories:", uploadDirs.length ? uploadDirs : ["(none found)"])

// express.static handles any subdirectory depth (e.g., "2023/photo.jpg") transparently and securely.
// fallthrough:true means we try the next dir if the file isn't found in this one.
for (const dir of uploadDirs) {
  router.use(express.static(dir, { fallthrough: true, dotfiles: "deny" }))
}

// 404 fallback — file not found in any known upload directory
router.use((_req, res) => {
  res.status(404).send("Not found")
})

export default router
