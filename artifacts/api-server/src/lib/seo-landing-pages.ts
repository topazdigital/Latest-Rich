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
const HOME_TITLE = "Rich Dating Network | Meet Wealthy Singles in Kenya & Worldwide"
const HOME_DESCRIPTION =
  "Meet singles in Kenya and worldwide. Create a free profile, browse by location, and choose the relationship goals that matter to you."
const MEMBERS_TITLE = "Browse Dating Profiles Worldwide | Rich Dating Network"
const MEMBERS_DESCRIPTION =
  "Browse dating profiles worldwide by location and preferences. Create a free profile, explore members, and choose who to contact. Verification is optional."

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

function removeUnsupportedGlobalHints(html: string): string {
  return html
    .replace(/<link\s+rel=["']alternate["'][^>]*hreflang=["'][^"']+["'][^>]*\/?>/gi, "")
    .replace(/<meta\s+name=["']geo\.(?:region|placename)["'][^>]*\/?>/gi, "")
}

function removeInvisibleFaqSchema(
  html: string,
  pageName = HOME_TITLE,
  pageDescription = HOME_DESCRIPTION,
  pageUrl = `${SITE_URL}/`,
): string {
  return html.replace(
    /<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi,
    (script, json) => {
      try {
        const schema = JSON.parse(json)
        if (!Array.isArray(schema["@graph"])) return script
        schema["@graph"] = schema["@graph"]
          .filter((item: any) => item["@type"] !== "FAQPage")
          .map((item: any) => item["@type"] === "WebPage"
            ? {
                ...item,
                "@id": `${pageUrl}#webpage`,
                url: pageUrl,
                name: pageName,
                description: pageDescription,
              }
            : item)
        return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
      } catch {
        return script
      }
    },
  )
}

function makeHomeContent(): string {
  return `<main style="max-width:960px;margin:0 auto;padding:40px 24px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
  <header style="margin-bottom:32px">
    <a href="/" style="color:#be123c;font-weight:700;text-decoration:none">Rich Dating Network</a>
  </header>
  <section aria-labelledby="home-title" style="padding:32px 0">
    <p style="color:#be123c;font-weight:700">Kenya and worldwide</p>
    <h1 id="home-title" style="font-size:clamp(2rem,5vw,3.25rem);line-height:1.12;margin:8px 0 16px">Meet wealthy singles in Kenya and around the world</h1>
    <p style="max-width:680px;font-size:1.1rem">Create a free profile, browse public member profiles by location, and choose the relationship goals and connections that suit you. Explore Nairobi, other Kenyan cities, or meet people internationally.</p>
    <p style="display:flex;gap:12px;flex-wrap:wrap;margin:24px 0">
      <a href="/register" style="background:#e11d48;color:white;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Create a free profile</a>
      <a href="/members" style="border:1px solid #d1d5db;color:#374151;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Browse public profiles</a>
    </p>
  </section>
  <section aria-labelledby="kenya-title" style="padding:24px 0;border-top:1px solid #e5e7eb">
    <h2 id="kenya-title" style="font-size:1.5rem">Dating in Kenya: start with your preferences</h2>
    <p>Browse profiles in Nairobi and other locations, read what each member shares, and decide who you want to contact. Profile verification is optional; a badge shows that a member completed the platform’s verification step, not proof of wealth, intentions, or a guaranteed match.</p>
    <p><a href="/rich-men-nairobi">Explore profiles of men in Nairobi</a> or <a href="/rich-men-kenya">browse men’s profiles across Kenya</a>.</p>
  </section>
  <section aria-labelledby="payments-title" style="padding:24px 0;border-top:1px solid #e5e7eb">
    <h2 id="payments-title" style="font-size:1.5rem">Free registration and payment choices</h2>
    <p>Creating an account is free. Paid plans and credits are optional. M-Pesa may be available for eligible purchases in Kenya; check the payment options, price, and renewal terms shown before confirming a purchase. A paid feature does not guarantee a match or a financial arrangement.</p>
  </section>
  <section aria-labelledby="safety-title" style="padding:24px 0;border-top:1px solid #e5e7eb">
    <h2 id="safety-title" style="font-size:1.5rem">Take your time and protect your privacy</h2>
    <p>Keep conversations on the platform until you are comfortable, never share your M-Pesa PIN or one-time codes, and meet in a public place if you decide to meet offline. Do not send money to someone you have not met and independently verified.</p>
  </section>
  <p style="margin-top:24px"><a href="/locations">Browse locations worldwide</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>
</main>`
}

function makeMembersContent(): string {
  return `<main style="max-width:960px;margin:0 auto;padding:40px 24px;color:#1f2937;font-family:Arial,Helvetica,sans-serif;line-height:1.65">
  <h1 style="font-size:2rem;line-height:1.2">Browse dating profiles worldwide</h1>
  <p>Explore public member profiles from around the world by location and preferences. Review the information each person shares and decide whom to contact. Profile verification is optional and does not independently confirm wealth or intentions.</p>
  <p><a href="/register">Create a free profile</a> · <a href="/locations">Browse locations worldwide</a></p>
</main>`
}

export function buildSeoHomeHtml(shell: string): string {
  let html = removeUnsupportedGlobalHints(shell)
  html = removeInvisibleFaqSchema(html)
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(HOME_TITLE)}</title>`)
  html = html.replace(/<meta\s+name=["']keywords["'][^>]*\/?>/i, "")
  html = setMeta(html, "description", HOME_DESCRIPTION)
  html = setMeta(html, "robots", "index, follow, max-image-preview:large")
  html = setMeta(html, "og:title", HOME_TITLE, "property")
  html = setMeta(html, "og:description", HOME_DESCRIPTION, "property")
  html = setMeta(html, "og:url", `${SITE_URL}/`, "property")
  html = setMeta(html, "twitter:title", HOME_TITLE)
  html = setMeta(html, "twitter:description", HOME_DESCRIPTION)
  html = setCanonical(html, `${SITE_URL}/`)
  return html.replace(/<div id="root"><\/div>/i, `<div id="root">${makeHomeContent()}</div>`)
}

export function buildSeoMembersHtml(shell: string): string {
  let html = removeUnsupportedGlobalHints(shell)
  html = removeInvisibleFaqSchema(html, MEMBERS_TITLE, MEMBERS_DESCRIPTION, `${SITE_URL}/members`)
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(MEMBERS_TITLE)}</title>`)
  html = html.replace(/<meta\s+name=["']keywords["'][^>]*\/?>/i, "")
  html = setMeta(html, "description", MEMBERS_DESCRIPTION)
  html = setMeta(html, "robots", "index, follow, max-image-preview:large")
  html = setMeta(html, "og:title", MEMBERS_TITLE, "property")
  html = setMeta(html, "og:description", MEMBERS_DESCRIPTION, "property")
  html = setMeta(html, "og:url", `${SITE_URL}/members`, "property")
  html = setMeta(html, "twitter:title", MEMBERS_TITLE)
  html = setMeta(html, "twitter:description", MEMBERS_DESCRIPTION)
  html = setCanonical(html, `${SITE_URL}/members`)
  return html.replace(/<div id="root"><\/div>/i, `<div id="root">${makeMembersContent()}</div>`)
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
  const kenyaRichMenPage =
    page.country === "Kenya" &&
    page.category === "rich-men" &&
    (!page.city || page.city === "Nairobi")
  const localLabel = page.city ? `${page.city}, Kenya` : "Kenya"
  const localGuidance = kenyaRichMenPage
    ? `<section style="margin-top:32px">
    <h2>Dating in ${escapeHtml(localLabel)}</h2>
    <p>Set your location and preferences, review the information each person shares, and choose whom to contact. A verification badge reflects completion of the platform’s verification step; it does not confirm wealth, intentions, or guarantee a match.</p>
    <h2>Payments and personal safety</h2>
    <p>Registration is free. M-Pesa may be available for eligible paid features; confirm the amount and terms at checkout. Never share your M-Pesa PIN or one-time codes, and meet in a public place if you decide to meet offline.</p>
  </section>`
    : ""
  return `<div class="min-h-screen bg-white">
  <section class="bg-gradient-to-br from-[#2a0a10] via-[#7a0e18] to-[#FF192C] text-white px-6 py-20">
    <div class="max-w-4xl mx-auto text-center">
      <span class="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">Dating in ${escapeHtml(page.city ? `${page.city}, ${page.country}` : page.country ?? "your community")}</span>
      <h1 class="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">${escapeHtml(page.h1)}</h1>
      <p class="text-lg text-white/85 max-w-2xl mx-auto mb-8">${escapeHtml(page.intro)}</p>
      <a href="/register" class="inline-flex items-center gap-2 bg-white text-[#FF192C] font-bold px-8 py-4 rounded-xl text-lg">Join Free Now</a>
      <div class="flex items-center justify-center gap-6 mt-8 text-sm text-white/80 flex-wrap">
        <span>Free registration</span><span>Optional profile verification</span><span>Local and worldwide discovery</span>
      </div>
    </div>
  </section>
  <main class="px-6 py-16 max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold mb-4">Explore member profiles and dating preferences</h2>
    <p class="text-gray-700 leading-relaxed mb-4">${escapeHtml(page.description)}</p>
    <p class="text-gray-700 leading-relaxed">Browse public profiles, review the information members choose to share, and connect at your own pace. Verification is optional and does not independently establish a member’s wealth or intentions.</p>
    ${localGuidance}
  </main>
</div>`
}

export function buildSeoLandingHtml(shell: string, page: SeoLandingPage): string {
  const canonical = `${SITE_URL}/${page.slug}`
  let html = removeUnsupportedGlobalHints(shell)
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
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
