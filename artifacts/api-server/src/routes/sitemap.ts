import { Router } from "express"

const router = Router()

const DOMAIN = "https://richdatingnetwork.com"

const STATIC_PAGES = [
  { loc: "/",         priority: "1.0", changefreq: "daily" },
  { loc: "/register", priority: "0.9", changefreq: "monthly" },
  { loc: "/login",    priority: "0.8", changefreq: "monthly" },
  { loc: "/contact",  priority: "0.8", changefreq: "monthly" },
  { loc: "/terms",    priority: "0.5", changefreq: "yearly" },
  { loc: "/privacy",  priority: "0.5", changefreq: "yearly" },
]

router.get("/sitemap.xml", (_req, res) => {
  const now = new Date().toISOString().split("T")[0]
  const urls = STATIC_PAGES.map(p => `
  <url>
    <loc>${DOMAIN}${p.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("")

  res.header("Content-Type", "application/xml; charset=utf-8")
  res.header("Cache-Control", "public, max-age=3600")
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`)
})

router.get("/robots.txt", (_req, res) => {
  res.header("Content-Type", "text/plain; charset=utf-8")
  res.header("Cache-Control", "public, max-age=86400")
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /moderator
Disallow: /api/
Disallow: /chat
Disallow: /notifications
Disallow: /settings
Disallow: /home

Sitemap: ${DOMAIN}/sitemap.xml

# Rich Dating Network — Luxury Dating for Wealthy Singles
# contact@richdatingnetwork.com
`)
})

export default router
