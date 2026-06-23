import http from "http"
import app from "./app"
import { logger } from "./lib/logger"
import { setupWebSocket } from "./lib/websocket"
import { startPaymentReconciler } from "./lib/payment-reconciler"
import { startFakeOnlineSimulator } from "./lib/fake-message-scheduler"

const rawPort = process.env["PORT"]

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.")
}

const port = Number(rawPort)

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`)
}

const server = http.createServer(app)

// Attach WebSocket server
setupWebSocket(server)

server.listen(port, () => {
  logger.info({ port }, "Server listening with WebSocket support")
  startPaymentReconciler()
  startFakeOnlineSimulator()
})

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port")
  process.exit(1)
})
