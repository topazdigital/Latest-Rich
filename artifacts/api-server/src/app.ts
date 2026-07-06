import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, userExtendedTable, photosTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

// ── Google Search Console verification ───────────────────────────────────────
app.get("/google76ed499fbdba9e86.html", (_req, res) => {
  res.type("text/html").send("google-site-verification: google76ed499fbdba9e86.html")
})

// ── Google AdSense ads.txt ────────────────────────────────────────────────────
app.get("/ads.txt", (_req, res) => {
  res.type("text/plain").send("google.com, pub-6533927898054426, DIRECT, f08c47fec0942fa0")
})

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

// ── SEO: sitemap.xml ─────────────────────────────────────────────────────────
import sitemapRouter from "./routes/sitemap"
app.use(sitemapRouter)

// Serve old PHP uploads directory at the legacy URL path as well.
// The old site used absolute URLs like /assets/sources/uploads/2023/photo.jpg in the DB.
// Apache proxies everything to Node.js, so without this middleware Express would serve index.html.
const legacyUploadsOnDisk = path.join(process.cwd(), "assets", "sources", "uploads");
if (fs.existsSync(legacyUploadsOnDisk)) {
  app.use("/assets/sources/uploads", express.static(legacyUploadsOnDisk, { dotfiles: "deny" }));
}

// ── Social crawler OG injection ───────────────────────────────────────────────
// WhatsApp, Telegram, Facebook, Twitter/X, Slack, Discord don't run JS.
// When they crawl /profile/:id or /@:username we inject profile-specific
// OG/Twitter meta tags into the HTML so share previews show name + photo.

const SOCIAL_CRAWLERS =
  /whatsapp|telegrambot|facebookexternalhit|facebot|twitterbot|slackbot|discordbot|linkedinbot|pinterest|vkshare|applebot|googlebot|bingbot|yandexbot/i;

function isSocialCrawler(ua: string | undefined): boolean {
  return !!ua && SOCIAL_CRAWLERS.test(ua);
}

async function fetchProfileForOg(key: string, byUsername: boolean) {
  try {
    const condition = byUsername
      ? eq(usersTable.username, key)
      : eq(usersTable.id, parseInt(key));
    if (!byUsername && isNaN(parseInt(key))) return null;
    const [user] = await db.select().from(usersTable).where(condition).limit(1);
    if (!user) return null;
    const [extended] = await db
      .select()
      .from(userExtendedTable)
      .where(eq(userExtendedTable.userId, user.id))
      .limit(1);
    let photo = user.photo || "";
    if (!photo) {
      const [firstPhoto] = await db
        .select()
        .from(photosTable)
        .where(and(eq(photosTable.userId, user.id), eq(photosTable.approved, 1)))
        .orderBy(desc(photosTable.main), photosTable.id)
        .limit(1);
      if (firstPhoto) photo = firstPhoto.photo;
    }
    return { ...user, photo, userExtended: extended };
  } catch {
    return null;
  }
}

function buildProfileOgTags(profile: any): string {
  const name: string = profile.name || profile.username || "Profile";
  const age: string = profile.age ? String(profile.age) : "";
  const city: string = profile.city || "";
  const country: string = profile.country || "";
  const bio: string = profile.userExtended?.bio || profile.bio || "";
  const occupation: string =
    profile.userExtended?.occupation || profile.occupation || "";

  const titleParts = [name, age || null, city || null].filter(Boolean);
  const title = titleParts.join(", ") + " | Rich Dating Network";

  const locationStr =
    city && country ? `${city}, ${country}` : city || country;
  const descParts = [
    `Meet ${name}${age ? `, ${age}` : ""}${locationStr ? ` from ${locationStr}` : ""} on Rich Dating Network.`,
  ];
  if (occupation) descParts.push(`${occupation}.`);
  if (bio) descParts.push(bio.slice(0, 100));
  descParts.push(
    "Connect with verified wealthy singles on the #1 luxury dating platform.",
  );
  const description = descParts.join(" ").slice(0, 300);

  const canonical = profile.username
    ? `https://richdatingnetwork.com/@${profile.username}`
    : `https://richdatingnetwork.com/profile/${profile.id}`;

  const rawPhoto: string = profile.photo || "";
  const photoUrl = rawPhoto
    ? rawPhoto.startsWith("http")
      ? rawPhoto
      : `https://richdatingnetwork.com${rawPhoto.startsWith("/") ? "" : "/"}${rawPhoto}`
    : "https://richdatingnetwork.com/opengraph.jpg";

  const e = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  return [
    `<title>${e(title)}</title>`,
    `<meta name="description" content="${e(description)}" />`,
    `<meta property="og:title" content="${e(title)}" />`,
    `<meta property="og:description" content="${e(description)}" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:url" content="${e(canonical)}" />`,
    `<meta property="og:site_name" content="Rich Dating Network" />`,
    `<meta property="og:image" content="${e(photoUrl)}" />`,
    `<meta property="og:image:width" content="800" />`,
    `<meta property="og:image:height" content="800" />`,
    `<meta property="og:image:alt" content="${e(name + " — Rich Dating Network")}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(title)}" />`,
    `<meta name="twitter:description" content="${e(description)}" />`,
    `<meta name="twitter:image" content="${e(photoUrl)}" />`,
    `<meta name="twitter:site" content="@richdatingnet" />`,
    `<link rel="canonical" href="${e(canonical)}" />`,
  ].join("\n    ");
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
  const indexPath = path.join(frontendDir, "index.html");

  // Social crawler OG injection — runs before static file serving
  // Only activates for known bots; regular browsers fall through to express.static
  app.get(["/profile/:id", "/@:username"], async (req, res, next) => {
    if (!isSocialCrawler(req.headers["user-agent"])) return next();
    const byUsername = !!req.params.username;
    const key = byUsername ? req.params.username : req.params.id;
    const profile = await fetchProfileForOg(key, byUsername).catch(() => null);
    if (!profile) return next();
    try {
      const html = fs.readFileSync(indexPath, "utf-8");
      const tags = buildProfileOgTags(profile);
      // Replace the placeholder we added to index.html; fall back to appending before </head>
      const injected = html.includes("<!-- __OG_INJECT__ -->")
        ? html.replace("<!-- __OG_INJECT__ -->", tags)
        : html.replace("</head>", `    ${tags}\n  </head>`);
      res.type("html").send(injected);
    } catch {
      next();
    }
  });

  app.use(express.static(frontendDir));
  // SPA fallback — any non-API route serves index.html
  // Express 5 + path-to-regexp v8 require a named wildcard — bare "*" throws PathError
  app.get("/{*path}", (_req, res) => {
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
