import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"

const router = Router()

const DOMAIN = "https://richdatingnetwork.com"

const STATIC_PAGES = [
  { loc: "/",         priority: "1.0", changefreq: "daily" },
  { loc: "/register", priority: "0.9", changefreq: "monthly" },
  { loc: "/contact",  priority: "0.8", changefreq: "monthly" },
  { loc: "/terms",    priority: "0.5", changefreq: "yearly" },
  { loc: "/privacy",  priority: "0.5", changefreq: "yearly" },
]

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const now = new Date().toISOString().split("T")[0]

    // Fetch all real (non-fake) user profile slugs for Google to crawl
    const profiles = await db
      .select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.fake, 0))
      .limit(10000)

    const staticUrls = STATIC_PAGES.map(p => `
  <url>
    <loc>${DOMAIN}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("")

    const profileUrls = profiles
      .filter(p => p.id)
      .map(p => {
        const loc = p.username ? `/@${p.username}` : `/profile/${p.id}`
        return `
  <url>
    <loc>${DOMAIN}${loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
      }).join("")

    res.header("Content-Type", "application/xml; charset=utf-8")
    res.header("Cache-Control", "public, max-age=3600")
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticUrls}${profileUrls}
</urlset>`)
  } catch {
    const now = new Date().toISOString().split("T")[0]
    const staticUrls = STATIC_PAGES.map(p => `
  <url>
    <loc>${DOMAIN}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("")
    res.header("Content-Type", "application/xml; charset=utf-8")
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
</urlset>`)
  }
})

router.get("/robots.txt", (_req, res) => {
  res.header("Content-Type", "text/plain; charset=utf-8")
  res.header("Cache-Control", "public, max-age=86400")
  res.send(`User-agent: *
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

Sitemap: ${DOMAIN}/sitemap.xml

# Rich Dating Network — Luxury Dating for Wealthy Singles
# contact@richdatingnetwork.com
`)
})

export default router
