export interface SeoLandingPage {
  slug: string
  h1: string
  title: string
  description: string
  intro: string
  country?: string
  city?: string
  category?: string
  ethnicity?: string
  language?: string
  community?: string
  intent?: string
  intentLabel?: string
  gender?: number
}

interface SeoMatrixCommunity {
  slug: string
  label: string
  kind: "ethnicity" | "language"
  value: string
}

interface SeoMatrixIntent {
  slug: string
  label: string
  gender?: number
  category?: string
  phrase: string
}

interface SeoMatrixLocation {
  slug: string
  country?: string
  city?: string
}

export interface SeoLandingManifest {
  editorialPages: SeoLandingPage[]
  communities: SeoMatrixCommunity[]
  intents: SeoMatrixIntent[]
  locations: SeoMatrixLocation[]
}

const SITE_URL = "https://richdatingnetwork.com"

function slugify(value: string): string {
  return value.toLowerCase().replace(/['']/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

function makeMatrixPage(
  community: SeoMatrixCommunity,
  intent: SeoMatrixIntent,
  location?: SeoMatrixLocation,
): SeoLandingPage {
  const locationLabel = location?.city
    ? `${location.city}, ${location.country}`
    : location?.country ?? "Worldwide"
  const subject = `${community.label} ${intent.phrase}`
  return {
    slug: `${community.slug}-${intent.slug}${location ? `-${location.slug}` : ""}`,
    h1: `${subject}${location ? ` in ${locationLabel}` : ""}`,
    title: `${subject} ${location ? `in ${locationLabel} ` : ""}| Verified Matches — Rich Dating Network`,
    description: `Meet verified ${subject}${location ? ` in ${locationLabel}` : " worldwide"} on Rich Dating Network. Browse public profiles, connect respectfully, and join free.`,
    intro: `Looking for ${subject}${location ? ` in ${locationLabel}` : ""}? Rich Dating Network helps you discover public profiles who share your community and dating goals. Join free, browse respectfully, and make genuine connections.`,
    community: community.slug,
    intent: intent.slug,
    intentLabel: intent.label,
    country: location?.country,
    city: location?.city,
    gender: intent.gender,
    category: intent.category,
    ...(community.kind === "language"
      ? { language: community.value }
      : { ethnicity: community.value }),
  }
}

export function createSeoLandingResolver(manifest: SeoLandingManifest) {
  const editorialPages = new Map(manifest.editorialPages.map(page => [page.slug, page]))
  const locations = new Map(manifest.locations.map(location => [location.slug, location]))
  const candidates = manifest.communities
    .flatMap(community => manifest.intents.map(intent => ({ community, intent })))
    .sort((a, b) =>
      b.community.slug.length + b.intent.slug.length -
      (a.community.slug.length + a.intent.slug.length),
    )

  return (slug: string): SeoLandingPage | undefined => {
    const editorialPage = editorialPages.get(slug)
    if (editorialPage) return editorialPage

    for (const { community, intent } of candidates) {
      const baseSlug = `${community.slug}-${intent.slug}`
      if (slug === baseSlug) return makeMatrixPage(community, intent)
      if (!slug.startsWith(`${baseSlug}-`)) continue
      const location = locations.get(slug.slice(baseSlug.length + 1))
      if (location) return makeMatrixPage(community, intent, location)
    }
    return undefined
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function setMeta(html: string, key: string, value: string, attribute: "name" | "property" = "name"): string {
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${escapeRegExp(key)}["'][^>]*\\/?>`, "i")
  const tag = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`
  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}

function setCanonical(html: string, canonical: string): string {
  const pattern = /<link\s+rel=["']canonical["'][^>]*\/?>/i
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`
  if (pattern.test(html)) return html.replace(pattern, tag)
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`)
}

function makeStructuredData(page: SeoLandingPage, canonical: string): string {
  const breadcrumbs = [{ name: "Home", item: `${SITE_URL}/` }]
  if (page.country && page.city) {
    const parentSlug = page.community && page.intent
      ? `${page.community}-${page.intent}-${slugify(page.country)}`
      : page.category
        ? `${page.category}-${slugify(page.country)}`
        : slugify(page.country)
    breadcrumbs.push({
      name: page.country,
      item: `${SITE_URL}/${parentSlug}`,
    })
  }
  breadcrumbs.push({ name: page.h1, item: canonical })

  const graph = [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: "Rich Dating Network",
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Rich Dating Network",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icons/icon-512.svg`,
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: page.title,
      description: page.description,
      inLanguage: "en",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.item,
        })),
      },
    },
  ]

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph })
    .replace(/</g, "\\u003c")
}

function makeVisiblePage(page: SeoLandingPage): string {
  return `<div class="min-h-screen bg-white">
  <section class="bg-gradient-to-br from-[#2a0a10] via-[#7a0e18] to-[#FF192C] text-white px-6 py-20">
    <div class="max-w-4xl mx-auto text-center">
      <span class="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">Exclusive Luxury Dating Platform</span>
      <h1 class="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">${escapeHtml(page.h1)}</h1>
      <p class="text-lg text-white/85 max-w-2xl mx-auto mb-8">${escapeHtml(page.intro)}</p>
      <a href="/register" class="inline-flex items-center gap-2 bg-white text-[#FF192C] font-bold px-8 py-4 rounded-xl text-lg">Join Free Now</a>
      <div class="flex items-center justify-center gap-6 mt-8 text-sm text-white/80 flex-wrap">
        <span>100% Free to Join</span><span>Verified Profiles</span><span>180+ Countries</span>
      </div>
    </div>
  </section>
  <main class="px-6 py-16 max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">Why join Rich Dating Network?</h2>
    <p class="text-gray-700 leading-relaxed mb-4">${escapeHtml(page.description)}</p>
    <p class="text-gray-700 leading-relaxed">Browse public profiles, connect respectfully, and take time to get to know members who share your community and relationship goals.</p>
  </main>
</div>`
}

export function buildSeoLandingHtml(shell: string, page: SeoLandingPage): string {
  const canonical = `${SITE_URL}/${page.slug}`
  let html = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
  html = setMeta(html, "description", page.description)
  html = html.replace(/<meta\s+name=["']keywords["'][^>]*\/?>/i, "")
  html = setMeta(html, "robots", "index, follow, max-image-preview:large")
  html = setMeta(html, "og:title", page.title, "property")
  html = setMeta(html, "og:description", page.description, "property")
  html = setMeta(html, "og:type", "website", "property")
  html = setMeta(html, "og:site_name", "Rich Dating Network", "property")
  html = setMeta(html, "og:url", canonical, "property")
  html = setMeta(html, "twitter:card", "summary_large_image")
  html = setMeta(html, "twitter:title", page.title)
  html = setMeta(html, "twitter:description", page.description)
  html = setCanonical(html, canonical)
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "")
  html = html.replace(
    /<\/head>/i,
    `  <script type="application/ld+json">${makeStructuredData(page, canonical)}</script>\n</head>`,
  )
  return html.replace(/<div id="root"><\/div>/i, `<div id="root">${makeVisiblePage(page)}</div>`)
}
