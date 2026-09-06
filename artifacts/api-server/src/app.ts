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
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /discover
Disallow: /meet
Disallow: /likes
Disallow: /visitors
Disallow: /gifts
Disallow: /boost
Disallow: /premium
Disallow: /credits
Disallow: /referrals
Disallow: /ref/
Disallow: /profile

Sitemap: https://richdatingnetwork.com/sitemap-index.xml
`)
})

// Keep authenticated and account-only pages out of search indexes even when a
// crawler does not execute the React app's client-side metadata updates.
const SEO_NOINDEX_PATHS = [
  "/admin", "/moderator", "/login", "/register", "/forgot-password",
  "/reset-password", "/verify-email", "/home", "/discover", "/meet",
  "/chat", "/profile", "/notifications", "/settings", "/premium",
  "/credits", "/gifts", "/visitors", "/likes", "/boost", "/referrals", "/ref/",
]
app.use((req, res, next) => {
  const pathName = req.path
  const noindex = SEO_NOINDEX_PATHS.some(prefix =>
    pathName === prefix || pathName.startsWith(`${prefix}/`)
  )
  if (noindex) res.setHeader("X-Robots-Tag", "noindex, nofollow")
  next()
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

/** Build a complete, self-contained HTML page for social crawlers.
 *  Serving a dedicated page (rather than injecting into index.html) guarantees
 *  no duplicate <title> or og:* tags — crawlers always see exactly one of each.
 *  Regular browsers never hit this path (isSocialCrawler gates it).
 */
function buildCrawlerHtml(profile: any): string {
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
  if (bio) descParts.push(bio.slice(0, 120));
  descParts.push("Connect with verified wealthy singles on the #1 luxury dating platform.");
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
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const personSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    ...(age ? { age: parseInt(age) } : {}),
    ...(locationStr ? { homeLocation: { "@type": "Place", name: locationStr } } : {}),
    ...(bio ? { description: bio.slice(0, 300) } : {}),
    ...(occupation ? { jobTitle: occupation } : {}),
    ...(rawPhoto ? { image: photoUrl } : {}),
    url: canonical,
    memberOf: { "@type": "Organization", name: "Rich Dating Network", url: "https://richdatingnetwork.com" },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${e(title)}</title>
  <meta name="description" content="${e(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${e(canonical)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${e(canonical)}" />
  <meta property="og:site_name" content="Rich Dating Network" />
  <meta property="og:title" content="${e(title)}" />
  <meta property="og:description" content="${e(description)}" />
  <meta property="og:image" content="${e(photoUrl)}" />
  <meta property="og:image:width" content="800" />
  <meta property="og:image:height" content="800" />
  <meta property="og:image:alt" content="${e(name)} — Rich Dating Network" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@richdatingnet" />
  <meta name="twitter:title" content="${e(title)}" />
  <meta name="twitter:description" content="${e(description)}" />
  <meta name="twitter:image" content="${e(photoUrl)}" />
  <script type="application/ld+json">${personSchema}</script>
</head>
<body>
  <h1>${e(name)}${age ? `, ${age}` : ""}${city ? ` — ${e(city)}` : ""}</h1>
  ${bio ? `<p>${e(bio.slice(0, 200))}</p>` : ""}
  <p><a href="${e(canonical)}">View full profile on Rich Dating Network</a></p>
</body>
</html>`;
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

  // Social crawler handler — intercepts /profile/:id and /@username for bots.
  // Serves a complete, self-contained HTML page with profile-specific OG/Twitter
  // tags so WhatsApp, Telegram, Facebook, Slack etc. show rich link previews.
  // Regular browsers fall through to express.static → SPA as normal.
  //
  // Uses a regex route (/^\/@.+/ + /profile/:id) to avoid any path-to-regexp v8
  // issues with the literal "@" character in Express 5 named segments.
  const crawlerHandler = async (req: any, res: any, next: any) => {
    if (!isSocialCrawler(req.headers["user-agent"])) return next();
    const rawPath: string = req.path;
    let profile: any = null;
    if (rawPath.startsWith("/@")) {
      const username = rawPath.slice(2); // strip leading "/@"
      profile = await fetchProfileForOg(username, true).catch(() => null);
    } else if (req.params?.id) {
      profile = await fetchProfileForOg(req.params.id, false).catch(() => null);
    }
    if (!profile) return next();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.type("html").send(buildCrawlerHtml(profile));
  };

  app.get("/profile/:id", crawlerHandler);
  // Regex route safely matches /@anything without relying on named param "@" handling
  app.get(/^\/@.+/, crawlerHandler);

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
