export interface SeoLandingPage {
  slug: string
  h1: string
  title: string
  description: string
  keywords: string[]
  intro: string
  country?: string
  city?: string
}

interface CityDef {
  city: string
  country: string
}

const SUGAR_DADDY_CITIES: CityDef[] = [
  { city: "Nairobi", country: "Kenya" },
  { city: "Mombasa", country: "Kenya" },
  { city: "Kisumu", country: "Kenya" },
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Port Harcourt", country: "Nigeria" },
  { city: "Accra", country: "Ghana" },
  { city: "Kumasi", country: "Ghana" },
  { city: "Kampala", country: "Uganda" },
  { city: "Dar es Salaam", country: "Tanzania" },
  { city: "Johannesburg", country: "South Africa" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Durban", country: "South Africa" },
  { city: "Manila", country: "Philippines" },
  { city: "Cebu", country: "Philippines" },
  { city: "Dubai", country: "UAE" },
  { city: "London", country: "the UK" },
  { city: "New York", country: "the USA" },
  { city: "Los Angeles", country: "the USA" },
]

const SUGAR_MUMMY_CITIES: CityDef[] = SUGAR_DADDY_CITIES

function slugify(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "")
}

const sugarDaddyPages: SeoLandingPage[] = SUGAR_DADDY_CITIES.map(({ city, country }) => {
  const citySlug = slugify(city)
  return {
    slug: `sugar-daddy-${citySlug}`,
    city,
    country,
    h1: `Find a Sugar Daddy in ${city}`,
    title: `Sugar Daddy ${city} | Meet Rich Sugar Daddies in ${city} — Rich Dating Network`,
    description: `Looking for a sugar daddy in ${city}? Join Rich Dating Network free and meet verified, wealthy sugar daddies in ${city}, ${country} today. Real profiles, real connections, real support.`,
    keywords: [
      `sugar daddy ${city}`, `sugar daddy in ${city}`, `find sugar daddy ${city}`, `rich men ${city}`,
      `wealthy men ${city}`, `sugar daddy website ${city}`, `sugar daddy app ${city}`, `how to find a sugar daddy in ${city}`,
      `sugar daddy for free ${city}`, `genuine sugar daddy ${city}`, `sugar daddy dating site ${city}`,
    ],
    intro: `Thousands of successful, wealthy men in ${city} are ready to meet you on Rich Dating Network. Whether you're searching for a genuine sugar daddy who offers financial support, mentorship, and a comfortable lifestyle, or simply want to meet affluent, ambitious men in ${city}, our platform makes it safe and easy. Create your free profile, get verified, and start chatting with real sugar daddies in ${city} today.`,
  }
})

const sugarMummyPages: SeoLandingPage[] = SUGAR_MUMMY_CITIES.map(({ city, country }) => {
  const citySlug = slugify(city)
  return {
    slug: `sugar-mummy-${citySlug}`,
    city,
    country,
    h1: `Find a Sugar Mummy in ${city}`,
    title: `Sugar Mummy ${city} | Meet Rich Sugar Mummies in ${city} — Rich Dating Network`,
    description: `Looking for a sugar mummy in ${city}? Join Rich Dating Network free and meet verified, wealthy sugar mummies in ${city}, ${country} today. Real profiles, real connections, real support.`,
    keywords: [
      `sugar mummy ${city}`, `sugar mummy in ${city}`, `find sugar mummy ${city}`, `rich women ${city}`,
      `wealthy women ${city}`, `sugar mummy website ${city}`, `sugar mummy app ${city}`, `how to find a sugar mummy in ${city}`,
      `sugar mummy whatsapp ${city}`, `genuine sugar mummy ${city}`, `sugar mummy dating site ${city}`,
      `sugar mummy contacts ${city}`, `sugar mummy hookup ${city}`,
    ],
    intro: `Meet real, verified sugar mummies in ${city} on Rich Dating Network. Our platform connects ambitious singles with successful, wealthy women in ${city}, ${country} who are looking for genuine companionship and are willing to support the right partner. No scams, no fake profiles — just real women in ${city} ready to connect. Sign up free today.`,
  }
})

const genericPages: SeoLandingPage[] = [
  {
    slug: "sugar-daddy",
    h1: "Meet a Sugar Daddy Online",
    title: "Sugar Daddy Dating | Meet Verified Rich Sugar Daddies — Rich Dating Network",
    description: "Find a genuine sugar daddy online. Rich Dating Network connects you with verified, wealthy men worldwide looking for real relationships and to support the right partner. Join free.",
    keywords: ["sugar daddy", "sugar daddy website", "sugar daddy app", "find a sugar daddy", "sugar daddy meaning", "sugar daddy free", "how to get a sugar daddy", "sugar daddy near me", "sugar daddy online", "real sugar daddy", "sugar daddy dating site", "legit sugar daddy site"],
    intro: "A sugar daddy is a successful, financially secure man who offers companionship, mentorship, and financial support to a partner in exchange for a genuine relationship. Rich Dating Network is the trusted way to meet verified sugar daddies worldwide — safely, for free.",
  },
  {
    slug: "sugar-mummy",
    h1: "Meet a Sugar Mummy Online",
    title: "Sugar Mummy Dating | Meet Verified Rich Sugar Mummies — Rich Dating Network",
    description: "Find a genuine sugar mummy online. Rich Dating Network connects you with verified, wealthy women worldwide looking for real relationships and to support the right partner. Join free.",
    keywords: ["sugar mummy", "sugar mummy website", "sugar mummy app", "find a sugar mummy", "sugar mummy meaning", "sugar mummy free", "how to get a sugar mummy", "sugar mummy near me", "sugar mummy online", "real sugar mummy", "sugar mummy dating site", "legit sugar mummy site", "sugar mummy whatsapp group", "sugar mummy contacts"],
    intro: "A sugar mummy is a successful, financially independent woman who offers companionship and financial support to a partner in exchange for a genuine connection. Rich Dating Network is the trusted way to meet verified, real sugar mummies worldwide — safely, for free.",
  },
  {
    slug: "blesser-dating",
    h1: "Find a Blesser or Blessee",
    title: "Blesser Dating South Africa | Meet Blessers & Blessees — Rich Dating Network",
    description: "Looking for a blesser in South Africa? Rich Dating Network connects blessers and blessees with verified profiles across Johannesburg, Cape Town, Durban and beyond.",
    keywords: ["blesser dating", "find a blesser", "blesser South Africa", "blessee dating", "blesser app", "blesser website", "rich blesser", "blesser Johannesburg", "blesser Cape Town", "blesser Durban"],
    intro: "In South Africa, a 'blesser' is a wealthy partner who showers their 'blessee' with gifts, cash, and a luxurious lifestyle. Rich Dating Network is where genuine blessers and blessees connect safely — with verified profiles across Johannesburg, Cape Town, Durban, and Pretoria.",
  },
  {
    slug: "rich-men-dating",
    h1: "Date Rich, Successful Men",
    title: "Rich Men Dating | Meet Wealthy, Successful Men — Rich Dating Network",
    description: "Meet rich, successful, verified men worldwide on Rich Dating Network. Free to join, real profiles, real connections with wealthy men looking for genuine relationships.",
    keywords: ["rich men dating", "date a rich man", "meet rich men", "wealthy men dating site", "rich men near me", "how to date a rich man", "rich single men", "millionaire men dating", "successful men dating site", "rich older men dating"],
    intro: "Dreaming of dating a rich, successful man? Rich Dating Network connects you with verified, wealthy men worldwide who are serious about finding a genuine partner. Browse real profiles and start chatting for free today.",
  },
  {
    slug: "rich-women-dating",
    h1: "Date Rich, Successful Women",
    title: "Rich Women Dating | Meet Wealthy, Successful Women — Rich Dating Network",
    description: "Meet rich, successful, verified women worldwide on Rich Dating Network. Free to join, real profiles, real connections with wealthy women looking for genuine relationships.",
    keywords: ["rich women dating", "date a rich woman", "meet rich women", "wealthy women dating site", "rich women near me", "how to date a rich woman", "rich single women", "millionaire women dating", "successful women dating site", "cougar dating rich women"],
    intro: "Looking to date a rich, successful woman? Rich Dating Network connects you with verified, wealthy women worldwide who are serious about finding a genuine partner. Browse real profiles and start chatting for free today.",
  },
  {
    slug: "sugar-baby",
    h1: "Become a Sugar Baby",
    title: "Sugar Baby Dating | Meet Generous Sugar Daddies & Mummies — Rich Dating Network",
    description: "Ready to become a sugar baby? Join Rich Dating Network free and connect with generous, verified sugar daddies and sugar mummies worldwide.",
    keywords: ["sugar baby", "sugar baby website", "sugar baby app", "how to become a sugar baby", "sugar baby dating site", "sugar baby meaning", "sugar baby free sign up", "sugar baby near me", "runs girl", "toy boy dating"],
    intro: "Becoming a sugar baby means finding a generous, successful partner who supports your lifestyle in exchange for companionship. Rich Dating Network makes it easy and safe to connect with real, verified sugar daddies and sugar mummies for free.",
  },
  {
    slug: "millionaire-dating",
    h1: "Meet Millionaires Online",
    title: "Millionaire Dating Site | Meet Verified Millionaires — Rich Dating Network",
    description: "Join the top millionaire dating site. Meet verified millionaires and billionaires worldwide looking for real relationships on Rich Dating Network. Free to join.",
    keywords: ["millionaire dating", "millionaire dating site", "meet a millionaire", "billionaire dating", "millionaire match", "millionaire dating app", "date a millionaire", "millionaire singles"],
    intro: "Rich Dating Network is the premier millionaire dating site, connecting verified high-net-worth singles worldwide. Whether you're a millionaire looking for genuine love or hoping to meet one, join free today.",
  },
  {
    slug: "seeking-arrangement",
    h1: "Seeking a Mutually Beneficial Arrangement",
    title: "Sugar Dating Arrangement | Mutually Beneficial Relationships — Rich Dating Network",
    description: "Seeking a mutually beneficial arrangement? Rich Dating Network connects generous, wealthy partners with ambitious singles worldwide, free to join.",
    keywords: ["seeking arrangement", "mutually beneficial relationship", "sugar dating arrangement", "financial support dating", "allowance dating", "arrangement dating site", "seeking arrangement alternative"],
    intro: "A mutually beneficial arrangement pairs a generous, successful partner with an ambitious companion — clear expectations, real benefits. Rich Dating Network is a free, verified alternative for finding genuine sugar dating arrangements worldwide.",
  },
  {
    slug: "wealthy-singles",
    h1: "Meet Wealthy Singles Near You",
    title: "Wealthy Singles Dating | Meet Affluent Singles Worldwide — Rich Dating Network",
    description: "Join thousands of wealthy, successful singles on Rich Dating Network. Verified profiles, real connections, free to join, available in 180+ countries.",
    keywords: ["wealthy singles", "wealthy singles dating site", "affluent singles", "elite singles", "luxury dating", "high net worth dating", "premium dating site", "exclusive dating site"],
    intro: "Rich Dating Network brings together wealthy, ambitious, successful singles from over 180 countries. Verified profiles, real connections, and a safe way to meet the affluent partner you've been looking for — free to join.",
  },
]

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  ...genericPages,
  ...sugarDaddyPages,
  ...sugarMummyPages,
]

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find(p => p.slug === slug)
}
