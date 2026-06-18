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

// ── SEO: robots.txt ──────────────────────────────────────────────────────────
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /moderator
Disallow: /api/

Sitemap: https://richdatingnetwork.com/sitemap.xml
`)
})

// ── SEO: sitemap.xml ─────────────────────────────────────────────────────────
app.get("/sitemap.xml", (_req, res) => {
  const base = "https://richdatingnetwork.com"
  const today = new Date().toISOString().split("T")[0]

  // Static pages
  const staticPages = [
    { path: "/",        priority: "1.0", freq: "daily" },
    { path: "/register",priority: "0.9", freq: "weekly" },
    { path: "/login",   priority: "0.8", freq: "monthly" },
    { path: "/discover",priority: "0.8", freq: "daily" },
    { path: "/privacy", priority: "0.3", freq: "monthly" },
    { path: "/terms",   priority: "0.3", freq: "monthly" },
  ]

  // Country-specific landing URLs with rich keyword targeting
  const countries = [
    "KE","NG","GH","ZA","UG","TZ","ZM","ZW","RW","ET","EG",
    "US","GB","CA","AU","AE","DE","FR","SG","JP","IN",
    "MX","BR","PH","ID","MY","TH","PK","BD","LK",
  ]

  const urlEntries = [
    ...staticPages.map(({ path, priority, freq }) => `
  <url>
    <loc>${base}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`),
    ...countries.map(cc => `
  <url>
    <loc>${base}/register?country=${cc.toLowerCase()}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`),
  ].join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`

  res.type("application/xml").send(xml)
})

// Serve old PHP uploads directory at the legacy URL path as well.
// The old site used absolute URLs like /assets/sources/uploads/2023/photo.jpg in the DB.
// Apache proxies everything to Node.js, so without this middleware Express would serve index.html.
const legacyUploadsOnDisk = path.join(process.cwd(), "assets", "sources", "uploads");
if (fs.existsSync(legacyUploadsOnDisk)) {
  app.use("/assets/sources/uploads", express.static(legacyUploadsOnDisk, { dotfiles: "deny" }));
}

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

// Resume any email campaigns that were mid-send when the server last restarted
import("./routes/email-campaigns").then(({ resumeInProgressCampaigns }) => {
  resumeInProgressCampaigns();
}).catch((err) => logger.error({ err }, "Failed to resume email campaigns"))

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
