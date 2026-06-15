import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve built React frontend in production
// Looks for the dist relative to CWD (project root) or next to dist/
const possibleFrontendDirs = [
  path.join(process.cwd(), "artifacts/rich-dating-network/dist/public"),
  path.resolve(__dirname, "../../rich-dating-network/dist/public"),
  path.resolve(__dirname, "../../../artifacts/rich-dating-network/dist/public"),
];
const frontendDir = possibleFrontendDirs.find(d => fs.existsSync(d));

if (frontendDir) {
  app.use(express.static(frontendDir));
  // SPA fallback — any non-API route serves index.html
  // Express 5 + path-to-regexp v8 require a named wildcard — bare "*" throws PathError
  app.get("/{*path}", (_req, res) => {
    const indexPath = path.join(frontendDir, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Frontend not built. Run: pnpm --filter @workspace/rich-dating-network run build");
    }
  });
  logger.info({ frontendDir }, "Serving React frontend from Express");
} else {
  logger.warn("React frontend dist not found — only API routes active");
}

// Start background auto-message scheduler
import("./lib/fake-message-scheduler").then(({ startAutoMessageScheduler }) => {
  startAutoMessageScheduler();
}).catch((err) => logger.error({ err }, "Failed to start auto-message scheduler"))

// Initialize Web Push (VAPID keys)
import("./lib/push").then(({ initWebPush }) => {
  initWebPush();
}).catch((err) => logger.error({ err }, "Failed to init web push"));

// Start age auto-updater (runs on startup + every 6h)
import("./lib/age-updater").then(({ startAgeUpdater }) => {
  startAgeUpdater();
}).catch((err) => logger.error({ err }, "Failed to start age updater"));

export default app;
