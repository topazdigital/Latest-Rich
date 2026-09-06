import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { eq, and, isNotNull, ne, gt } from "drizzle-orm"

const router = Router()

const BASE = "https://richdatingnetwork.com"

// All places used for SEO landing pages
const PLACES = [
  // Kenya
  "Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kitale","Garissa","Nyeri","Meru","Machakos","Kisii","Kakamega","Embu","Kericho","Migori","Homa Bay","Turkana","Kajiado","Muranga","Nandi","Bungoma","Vihiga","Trans Nzoia","Uasin Gishu","Samburu","Laikipia","Nyandarua","Narok","Bomet","Siaya","Busia","Isiolo","Marsabit","Wajir","Mandera","Lamu","Tana River","Taita Taveta","Kilifi","Kwale","Kitui","Makueni","Tharaka Nithi","Kiambu","Ruiru","Athi River","Limuru",
  // Nigeria
  "Lagos","Abuja","Port Harcourt","Kano","Ibadan","Kaduna","Benin City","Enugu","Onitsha","Aba","Warri","Abeokuta","Calabar","Ilorin","Jos","Maiduguri","Uyo","Asaba","Owerri","Akure","Osogbo","Sokoto","Zaria","Bauchi","Makurdi","Yola","Minna","Abakaliki","Awka","Lekki","Victoria Island","Ikeja","Surulere",
  // Uganda
  "Kampala","Entebbe","Jinja","Gulu","Mbarara","Masaka","Mukono","Mbale","Lira","Kasese","Fort Portal","Kabale","Soroti","Arua","Tororo","Wakiso","Kitgum","Hoima","Iganga","Buikwe",
  // Tanzania
  "Dar es Salaam","Arusha","Mwanza","Dodoma","Zanzibar","Moshi","Tanga","Morogoro","Mbeya","Iringa","Kigoma","Tabora","Shinyanga","Musoma","Songea",
  // Ghana
  "Accra","Kumasi","Tamale","Sekondi-Takoradi","Cape Coast","Obuasi","Koforidua","Sunyani","Wa","Ho","Bolgatanga","Tema","Kasoa","Techiman",
  // South Africa
  "Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Nelspruit","Polokwane","Kimberley","Rustenburg","George","Pietermaritzburg","Witbank","Sandton","Soweto","Midrand","Stellenbosch","Paarl",
  // Zimbabwe
  "Harare","Bulawayo","Mutare","Gweru","Masvingo","Chinhoyi","Victoria Falls","Kwekwe","Bindura",
  // Zambia
  "Lusaka","Ndola","Kitwe","Livingstone","Kabwe","Chipata","Solwezi","Kasama",
  // Ethiopia
  "Addis Ababa","Dire Dawa","Mekelle","Gondar","Hawassa","Bahir Dar","Jimma",
  // Cameroon
  "Douala","Yaoundé","Bamenda","Bafoussam","Garoua",
  // Côte d'Ivoire
  "Abidjan","Bouaké","Daloa","Yamoussoukro",
  // Senegal
  "Dakar","Thiès","Kaolack","Saint-Louis","Ziguinchor",
  // Rwanda
  "Kigali","Butare","Gisenyi","Ruhengeri",
  // Mozambique
  "Maputo","Beira","Nampula","Nacala",
  // Malawi
  "Lilongwe","Blantyre","Mzuzu","Zomba",
  // Botswana
  "Gaborone","Francistown","Maun",
  // Namibia
  "Windhoek","Swakopmund","Walvis Bay",
  // Angola
  "Luanda","Huambo","Lobito","Benguela",
  // DRC
  "Kinshasa","Lubumbashi","Goma","Kisangani","Mbuji-Mayi",
  // Sudan / South Sudan
  "Khartoum","Omdurman","Juba","Wau",
  // Somalia / others
  "Mogadishu","Hargeisa","Mbabane","Maseru",
  // Philippines
  "Manila","Cebu","Davao","Quezon City","Makati","Pasig","Taguig","Zamboanga","Bacolod","Iloilo","General Santos","Cagayan de Oro","Antipolo","Caloocan","Valenzuela",
  // UAE / Gulf
  "Dubai","Abu Dhabi","Sharjah","Ajman","Riyadh","Jeddah","Mecca","Medina","Dammam","Doha","Kuwait City","Manama","Muscat",
  // UK
  "London","Manchester","Birmingham","Leeds","Glasgow","Edinburgh","Liverpool","Bristol","Sheffield","Newcastle","Nottingham","Leicester","Coventry","Bradford","Cardiff","Belfast",
  // USA
  "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","Charlotte","Indianapolis","San Francisco","Seattle","Denver","Nashville","Oklahoma City","El Paso","Washington DC","Las Vegas","Louisville","Memphis","Portland","Baltimore","Milwaukee","Albuquerque","Tucson","Atlanta","Miami","Minneapolis","Boston","Detroit","New Orleans","Tampa","Orlando",
  // Canada
  "Toronto","Vancouver","Montreal","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City","Hamilton","Brampton","Mississauga","Surrey",
  // Australia
  "Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Canberra","Wollongong","Sunshine Coast",
  // New Zealand
  "Auckland","Wellington","Christchurch",
  // Germany
  "Berlin","Munich","Hamburg","Frankfurt","Cologne","Stuttgart","Düsseldorf","Leipzig",
  // France
  "Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Bordeaux",
  // Spain
  "Madrid","Barcelona","Valencia","Seville","Bilbao","Malaga",
  // Italy
  "Rome","Milan","Naples","Turin","Florence",
  // Netherlands / Belgium
  "Amsterdam","Rotterdam","Brussels","Antwerp",
  // Switzerland / Austria
  "Zurich","Geneva","Vienna",
  // Scandinavia
  "Stockholm","Gothenburg","Oslo","Copenhagen","Helsinki",
  // India
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Surat","Jaipur","Lucknow","Kochi","Chandigarh","Goa",
  // Pakistan / Bangladesh
  "Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Dhaka","Chittagong","Sylhet",
  // Sri Lanka / Nepal / Myanmar
  "Colombo","Kandy","Kathmandu","Yangon",
  // Malaysia / Singapore / Indonesia
  "Kuala Lumpur","Penang","Johor Bahru","Kota Kinabalu","Kuching","Singapore","Jakarta","Surabaya","Bandung","Medan","Bali","Makassar","Semarang","Yogyakarta",
  // Thailand / Vietnam
  "Bangkok","Chiang Mai","Phuket","Pattaya","Ho Chi Minh City","Hanoi","Da Nang","Phnom Penh","Vientiane",
  // China / Japan / Korea
  "Beijing","Shanghai","Guangzhou","Shenzhen","Chengdu","Hong Kong","Tokyo","Osaka","Yokohama","Nagoya","Kyoto","Seoul","Busan","Incheon","Taipei",
  // Brazil
  "São Paulo","Rio de Janeiro","Brasília","Fortaleza","Salvador","Manaus","Curitiba","Recife","Porto Alegre","Belém",
  // Mexico
  "Mexico City","Guadalajara","Monterrey","Puebla","Cancún","Tijuana",
  // South America
  "Buenos Aires","Córdoba","Rosario","Bogotá","Medellín","Cali","Santiago","Lima",
  // North Africa
  "Cairo","Alexandria","Casablanca","Marrakech","Rabat","Tunis","Algiers","Oran",
  // Russia / Turkey / Middle East
  "Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Istanbul","Ankara","Izmir","Antalya","Tel Aviv","Jerusalem","Tehran","Baghdad","Erbil","Kabul",
]

const CATEGORY_PREFIXES = [
  "sugar-daddy","sugar-mummy","rich-men","rich-women",
  "wealthy-men","wealthy-women","millionaire-dating",
  "cougar-dating","older-men","luxury-dating",
  // expanded
  "dating-events","find-sponsor","sugar-baby","generous-men","rich-singles",
]

const ETHNICITY_SLUGS = [
  "kamba-ladies-looking-for-rich-men", "kikuyu-ladies-looking-for-rich-men",
  "luo-ladies-looking-for-rich-men", "luhya-ladies-looking-for-rich-men",
  "kalenjin-ladies-looking-for-rich-men", "kisii-ladies-looking-for-rich-men",
  "maasai-dating", "meru-dating", "somali-dating", "swahili-dating",
  "indian-dating", "pakistani-dating", "filipino-dating", "african-dating",
  "asian-dating", "arab-dating", "hispanic-dating", "mixed-heritage-dating",
]

const GENERIC_SLUGS = [
  "sugar-daddy","sugar-mummy","rich-men-dating","rich-women-dating",
  "millionaire-dating","cougar-dating","luxury-dating",
  "seeking-arrangement","wealthy-singles","rich-dating",
  // expanded — app/site pages (high autocomplete volume)
  "sugar-mummy-dating-sites","sugar-mummy-dating-app",
  "sugar-daddy-dating-sites","sugar-daddy-dating-app",
  "rich-men-dating-app","rich-women-dating-app",
  // how-to / intent pages
  "how-to-find-sugar-daddy","how-to-find-sugar-mummy",
  // sponsor / arrangement / local terms
  "sponsor-dating","blesser-dating","dating-events",
  // find rich person
  "find-rich-man","find-rich-woman",
  // South Africa / Kenya terms
  "runs-girls-dating","wealthier-dating",
]

const STATIC_PAGES = ["/","/login","/register","/members","/locations","/terms","/privacy","/contact"]

function toSlug(s: string) {
  return s.toLowerCase().replace(/['']/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function urlTag(loc: string, priority: string, freq: string, mod: string) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

function sitemapDoc(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
}

function sendXml(res: any, xml: string) {
  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=86400")
  res.send(xml)
}

// ── Sitemap Index ─────────────────────────────────────────────────────────────
// Lists: 1 static sitemap + 10 per-category sitemaps + profile sitemaps
router.get("/sitemap-index.xml", async (_req, res) => {
  const mod = today()
  const children = ["sitemap-static.xml", ...CATEGORY_PREFIXES.map(p => `sitemap-${p}.xml`)]

  // Count how many profile + image sitemap pages we need
  let profilePageCount = 1
  let imagePageCount = 1
  try {
    const allPublic = await db
      .select({ id: usersTable.id, photo: usersTable.photo, lastAccess: usersTable.lastAccess })
      .from(usersTable)
      .where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0), isNotNull(usersTable.photo), ne(usersTable.photo, "")))
    const activeCount = allPublic.filter(u => Number(u.lastAccess) >= EIGHTEEN_MONTHS_AGO()).length
    profilePageCount = Math.max(1, Math.ceil(activeCount / PROFILE_PAGE_SIZE))
    imagePageCount = Math.max(1, Math.ceil(allPublic.length / IMAGE_PAGE_SIZE))
  } catch { /* DB unavailable — include at least page 1 */ }

  for (let i = 1; i <= profilePageCount; i++) {
    children.push(`sitemap-profiles-${i}.xml`)
  }
  for (let i = 1; i <= imagePageCount; i++) {
    children.push(`sitemap-images-${i}.xml`)
  }

  const entries = children
    .map(name => `  <sitemap>\n    <loc>${BASE}/${name}</loc>\n    <lastmod>${mod}</lastmod>\n  </sitemap>`)
    .join("\n")
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`
  sendXml(res, xml)
})

// ── Static sitemap ────────────────────────────────────────────────────────────
// Static pages + generic keyword pages (no city suffix)
router.get("/sitemap-static.xml", (_req, res) => {
  const mod = today()
  const urls: string[] = []
  for (const p of STATIC_PAGES) urls.push(urlTag(`${BASE}${p}`, "0.9", "weekly", mod))
  for (const slug of GENERIC_SLUGS) urls.push(urlTag(`${BASE}/${slug}`, "0.7", "monthly", mod))
  for (const slug of ETHNICITY_SLUGS) urls.push(urlTag(`${BASE}/${slug}`, "0.7", "monthly", mod))
  sendXml(res, sitemapDoc(urls))
})

// All unique countries (mirrors uniqueCountries in seoLandingPages.ts)
const COUNTRIES = [
  "Kenya","Nigeria","Uganda","Tanzania","Ghana","South Africa","Zimbabwe","Zambia",
  "Ethiopia","Cameroon","Côte d'Ivoire","Senegal","Rwanda","Mozambique","Malawi",
  "Botswana","Namibia","Angola","DRC","Sudan","South Sudan","Somalia","Eswatini",
  "Lesotho","the Philippines","the UAE","Saudi Arabia","Qatar","Kuwait","Bahrain",
  "Oman","the UK","the USA","Canada","Australia","New Zealand","Germany","France",
  "Spain","Italy","the Netherlands","Belgium","Switzerland","Austria","Sweden",
  "Norway","Denmark","Finland","India","Pakistan","Bangladesh","Sri Lanka","Nepal",
  "Myanmar","Malaysia","Singapore","Indonesia","Thailand","Vietnam","Cambodia",
  "Laos","China","Japan","South Korea","Taiwan","Brazil","Mexico","Argentina",
  "Colombia","Chile","Peru","Egypt","Morocco","Tunisia","Algeria","Russia",
  "Turkey","Israel","Iran","Iraq","Afghanistan",
]

// Keep country-level discovery worldwide. Existing names stay preferred so
// they continue matching imported profile data ("the USA", etc.).
const WORLD_COUNTRIES_EXTRA = [
  "Albania","Andorra","Antigua and Barbuda","Armenia","Azerbaijan","Bahamas",
  "Barbados","Belarus","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Chad","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus",
  "Czechia","Djibouti","Dominica","Dominican Republic","Ecuador","El Salvador",
  "Equatorial Guinea","Eritrea","Estonia","Fiji","Gabon","Gambia","Georgia",
  "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti",
  "Honduras","Hungary","Iceland","Ireland","Jamaica","Jordan","Kazakhstan",
  "Kiribati","Kyrgyzstan","Latvia","Lebanon","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg","Madagascar","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Micronesia","Moldova","Mongolia",
  "Montenegro","Nauru","Nicaragua","Niger","North Korea","North Macedonia",
  "Palau","Panama","Papua New Guinea","Paraguay","Poland","Portugal","Romania",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Serbia","Seychelles",
  "Sierra Leone","Slovakia","Slovenia","Solomon Islands","Suriname","Syria",
  "Tajikistan","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Turkmenistan",
  "Tuvalu","Ukraine","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela",
  "Yemen",
]

function countryKey(country: string) {
  return toSlug(country).replace(/^the-/, "")
    .replace("usa", "united-states")
    .replace("uk", "united-kingdom")
    .replace("uae", "united-arab-emirates")
}

const COUNTRY_PAGE_COUNTRIES = Array.from(new Map(
  [...COUNTRIES, ...WORLD_COUNTRIES_EXTRA].map(country => [countryKey(country), country] as const)
).values())

// ── Per-category sitemaps ─────────────────────────────────────────────────────
// One sitemap per keyword type: country hubs (priority 0.7) + city pages (0.6).
// e.g. /sitemap-sugar-daddy.xml → 81 country hubs + ~479 city pages = ~560 URLs
for (const prefix of CATEGORY_PREFIXES) {
  router.get(`/sitemap-${prefix}.xml`, (_req, res) => {
    const mod = today()
    const urls: string[] = []
    // Country hub pages — higher priority as mid-level hubs
    for (const country of COUNTRY_PAGE_COUNTRIES) {
      urls.push(urlTag(`${BASE}/${prefix}-${toSlug(country)}`, "0.7", "monthly", mod))
    }
    // City-level pages
    // PLACES is a flat compatibility list from the imported location data.
    // De-duplicate raw city URLs so city/country collisions never emit the
    // same URL twice in a sitemap.
    const cityUrls = Array.from(new Set(PLACES.map(place => `${BASE}/${prefix}-${toSlug(place)}`)))
    for (const url of cityUrls) urls.push(urlTag(url, "0.6", "monthly", mod))
    sendXml(res, sitemapDoc(urls))
  })
}

// ── Photo URL resolver (mirrors frontend getPhotoUrl) ────────────────────────
function resolvePhotoAbsUrl(photo: string | null | undefined): string | null {
  if (!photo) return null
  let p = photo
  // Strip same-domain absolute URLs stored by legacy PHP
  if (p.startsWith('http')) {
    const sameOrigins = ['https://richdatingnetwork.com/', 'http://richdatingnetwork.com/',
      'https://www.richdatingnetwork.com/', 'https://test.richdatingnetwork.com/']
    let stripped = false
    for (const o of sameOrigins) {
      if (p.startsWith(o)) { p = p.slice(o.length); stripped = true; break }
    }
    if (!stripped) return p // genuinely external — return as-is
  }
  const prefixes = ['/assets/sources/uploads/', 'assets/sources/uploads/',
    '/uploads/', 'uploads/', '/photos/', 'photos/']
  for (const pfx of prefixes) {
    if (p.startsWith(pfx)) { p = p.slice(pfx.length); break }
  }
  if (p.startsWith('/')) return `https://richdatingnetwork.com${p}`
  return `https://richdatingnetwork.com/api/uploads/${p}`
}

// ── Image sitemap ─────────────────────────────────────────────────────────────
// Lists profile photos for Google Images — extra discovery channel.
// Paginated at 1000 images per file (Google's recommended max per sitemap).
const IMAGE_PAGE_SIZE = 1000

router.get("/sitemap-images-:page.xml", async (req, res) => {
  const page = Math.max(1, parseInt(req.params.page as string) || 1)
  try {
    const rows = await db
      .select({ id: usersTable.id, username: usersTable.username, name: usersTable.name, photo: usersTable.photo })
      .from(usersTable)
      .where(and(eq(usersTable.fake, 0), eq(usersTable.banned, 0), isNotNull(usersTable.photo), ne(usersTable.photo, "")))
      .limit(IMAGE_PAGE_SIZE)
      .offset((page - 1) * IMAGE_PAGE_SIZE)

    const urls = rows.map(u => {
      const imgUrl = resolvePhotoAbsUrl(u.photo)
      if (!imgUrl) return ''
      const profileUrl = u.username
        ? `${BASE}/@${u.username}`
        : `${BASE}/profile/${u.id}`
      const title = u.name ? `${u.name} — Rich Dating Network` : 'Rich Dating Network Member'
      return `  <url>\n    <loc>${profileUrl}</loc>\n    <image:image>\n      <image:loc>${imgUrl}</image:loc>\n      <image:title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</image:title>\n    </image:image>\n  </url>`
    }).filter(Boolean)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>`
    sendXml(res, xml)
  } catch {
    sendXml(res, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`)
  }
})

// ── Profile sitemap ───────────────────────────────────────────────────────────
// Lists individual user profile pages so Google can discover and index them.
// Paginated at 5000 profiles per file. Only real (non-fake), non-banned users
// with a profile photo and at least one login in the last 18 months.
const PROFILE_PAGE_SIZE = 5000
const EIGHTEEN_MONTHS_AGO = () => Math.floor(Date.now() / 1000) - 18 * 30 * 24 * 3600

router.get("/sitemap-profiles-:page.xml", async (req, res) => {
  const page = Math.max(1, parseInt(req.params.page as string) || 1)
  const mod = today()
  try {
    const rows = await db
      .select({ id: usersTable.id, username: usersTable.username, lastAccess: usersTable.lastAccess })
      .from(usersTable)
      .where(
        and(
          eq(usersTable.fake, 0),
          eq(usersTable.banned, 0),
          isNotNull(usersTable.photo),
          ne(usersTable.photo, ""),
          gt(usersTable.lastAccess, String(EIGHTEEN_MONTHS_AGO())),
        )
      )
      .limit(PROFILE_PAGE_SIZE)
      .offset((page - 1) * PROFILE_PAGE_SIZE)

    const urls = rows.map(u => {
      const loc = u.username
        ? `${BASE}/@${u.username}`
        : `${BASE}/profile/${u.id}`
      return urlTag(loc, "0.6", "weekly", mod)
    })
    sendXml(res, sitemapDoc(urls))
  } catch {
    // DB unavailable — return empty sitemap rather than 500
    sendXml(res, sitemapDoc([]))
  }
})

// ── Legacy /sitemap.xml ───────────────────────────────────────────────────────
// Kept for backwards compatibility — redirects crawlers to the index.
router.get("/sitemap.xml", (_req, res) => {
  res.redirect(301, "/sitemap-index.xml")
})

// ── robots.txt ────────────────────────────────────────────────────────────────
router.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", "text/plain")
  res.setHeader("Cache-Control", "public, max-age=86400")
  res.send(
    [
      "User-agent: *",
      "Allow: /",
      "",
      `Sitemap: ${BASE}/sitemap-index.xml`,
    ].join("\n")
  )
})

export default router
