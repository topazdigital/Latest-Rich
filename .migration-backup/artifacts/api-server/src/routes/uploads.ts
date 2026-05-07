import { Router } from "express"
import path from "path"
import fs from "fs"
import { createReadStream } from "fs"

const router = Router()
const uploadDir = path.join(process.cwd(), "uploads")

router.get("/:filename", (req, res) => {
  const { filename } = req.params
  if (filename.includes("..") || filename.includes("/")) {
    res.status(400).send("Invalid filename")
    return
  }
  const filePath = path.join(uploadDir, filename)
  if (!fs.existsSync(filePath)) {
    res.status(404).send("Not found")
    return
  }
  res.sendFile(filePath)
})

export default router
