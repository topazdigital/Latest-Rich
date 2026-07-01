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
Allow: /profile/
Allow: /@
Disallow: /admin
Disallow: /moderator
Disallow: /api/
Disallow: /chat
Disallow: /notifications
Disallow: /settings
Disallow: /home
Disallow: /likes
Disallow: /visitors
Disallow: /gifts
Disallow: /boost

Sitemap: https://richdatingnetwork.com/sitemap.xml
`)
})

// Keyword landing page slugs targeting high-intent search queries
// (sugar daddy / sugar mummy / blesser / rich dating, by city and generically).
// Must stay in sync with artifacts/rich-dating-network/src/data/seoLandingPages.ts
const SEO_LANDING_CITIES = [
  "nairobi", "mombasa", "kisumu", "lagos", "abuja", "port-harcourt", "accra", "kumasi",
  "kampala", "dar-es-salaam", "johannesburg", "cape-town", "durban", "manila", "cebu",
  "dubai", "london", "new-york", "los-angeles",
]
const SEO_LANDING_GENERIC = [
  "sugar-daddy", "sugar-mummy", "blesser-dating", "rich-men-dating", "rich-women-dating",
  "sugar-baby", "millionaire-dating", "seeking-arrangement", "wealthy-singles",
]
const SEO_LANDING_SLUGS = [
  ...SEO_LANDING_GENERIC,
  ...SEO_LANDING_CITIES.map(c => `sugar-daddy-${c}`),
  ...SEO_LANDING_CITIES.map(c => `sugar-mummy-${c}`),
]

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
    { path: "/members", priority: "0.9", freq: "daily" },
    { path: "/contact", priority: "0.6", freq: "monthly" },
    { path: "/privacy", priority: "0.3", freq: "monthly" },
    { path: "/terms",   priority: "0.3", freq: "monthly" },
  ]

  // All ISO 3166-1 alpha-2 country codes — worldwide coverage
  const countries = [
    "AF","AL","DZ","AS","AD","AO","AI","AG","AR","AM","AW","AU","AT","AZ",
    "BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BR","BN","BG","BF","BI",
    "CV","KH","CM","CA","KY","CF","TD","CL","CN","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ",
    "DK","DJ","DM","DO",
    "EC","EG","SV","GQ","ER","EE","SZ","ET",
    "FK","FO","FJ","FI","FR",
    "GF","PF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY",
    "HT","HN","HK","HU",
    "IS","IN","ID","IR","IQ","IE","IM","IL","IT",
    "JM","JP","JE","JO",
    "KZ","KE","KI","KP","KR","KW","KG",
    "LA","LV","LB","LS","LR","LY","LI","LT","LU",
    "MO","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM",
    "NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MK","MP","NO",
    "OM",
    "PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR",
    "QA",
    "RE","RO","RU","RW",
    "BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","SS","ES","LK","SD","SR","SE","CH","SY",
    "TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV",
    "UG","UA","AE","GB","US","UY","UZ",
    "VU","VE","VN","VG","VI",
    "WF",
    "YE",
    "ZM","ZW",
  ]

  const urlEntries = [
    ...staticPages.map(({ path, priority, freq }) => `
  <url>
    <loc>${base}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority}</priority>
  </url>`),
    ...SEO_LANDING_SLUGS.map(slug => `
  <url>
    <loc>${base}/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
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
