import express from "express"
import cors from "cors"
import http from "node:http"
import chatmodzRouter from "./chatmodz.js"

const app = express()
app.use(cors())
app.use(express.json({ verify: (req, _res, buffer) => { (req as any).rawBody = Buffer.from(buffer) } }))
const basePath = process.env.CHATMODZ_API_BASE_PATH || "/api"
app.use(`${basePath}/chatmodz`, chatmodzRouter)
app.get(`${basePath}/healthz`, (_req, res) => res.json({ ok: true, service: "chatmodz-api" }))

const port = Number(process.env.PORT || 8080)
if (!Number.isFinite(port) || port <= 0) throw new Error("PORT must be a positive number")
http.createServer(app).listen(port, () => console.log(`Chatmodz API listening on ${port}`))
