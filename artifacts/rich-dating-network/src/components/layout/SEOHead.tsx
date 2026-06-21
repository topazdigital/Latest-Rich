import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { useAuth } from '../../hooks/useAuth'

const COUNTRY_SEO: Record<string, {
  siteTitle: string
  keywords: string[]
  description: string
  ageGroups: string[]
  cities?: string[]
}> = {
  KE: {
    siteTitle: 'Rich Dating Network Kenya',
    keywords: ['rich sugar daddy Kenya', 'rich sugar mummy Kenya', 'wealthy singles Kenya', 'sugar mummies Nairobi', 'rich men Nairobi', 'sugar mummies Kenya', 'rich women Kenya', 'millionaire dating Kenya', 'sugar daddy Nairobi', 'wealthy men Mombasa', 'rich singles Kenya', 'sugar mummies 2024 Kenya', 'dating in Nairobi', 'dating in Mombasa', 'luxury dating Kenya'],
    description: 'Meet wealthy, verified singles in Kenya. Find rich sugar daddies, sugar mummies, and affluent partners in Nairobi, Mombasa, Kisumu, and across Kenya.',
    ageGroups: ['rich sugar mummies over 40 Kenya', 'young rich men Kenya', 'rich older women Kenya', 'sugar daddies 50s Kenya'],
    cities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
  },
  NG: {
    siteTitle: 'Rich Dating Network Nigeria',
    keywords: ['rich sugar mummy Nigeria', 'wealthy men Nigeria', 'sugar mummies Lagos', 'rich singles Abuja', 'sugar daddy Nigeria', 'millionaire dating Nigeria', 'rich women Lagos', 'wealthy singles Nigeria', 'sugar mummies Abuja', 'rich men dating Nigeria', 'dating in Lagos', 'dating in Abuja'],
    description: 'Connect with wealthy, verified singles in Nigeria. Sugar mummies, rich men, and affluent women in Lagos, Abuja, Port Harcourt, and across Nigeria.',
    ageGroups: ['sugar mummies over 40 Nigeria', 'rich older women Lagos', 'wealthy men Abuja', 'sugar daddy Lagos'],
    cities: ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'],
  },
  GH: {
    siteTitle: 'Rich Dating Network Ghana',
    keywords: ['rich sugar mummy Ghana', 'wealthy men Accra', 'sugar daddy Ghana', 'rich singles Ghana', 'sugar mummies Accra', 'millionaire dating Ghana', 'wealthy women Ghana', 'rich men Kumasi', 'dating in Accra'],
    description: 'Find wealthy singles in Ghana. Rich sugar daddies, sugar mummies, and affluent partners in Accra, Kumasi, and across Ghana.',
    ageGroups: ['sugar mummies over 40 Ghana', 'rich older women Accra', 'wealthy men Ghana'],
    cities: ['Accra', 'Kumasi', 'Tamale'],
  },
  PH: {
    siteTitle: 'Rich Dating Network Philippines',
    keywords: ['rich foreigners Philippines', 'wealthy men Philippines', 'sugar daddy Philippines', 'rich singles Manila', 'sugar mummy Philippines', 'millionaire dating Philippines', 'wealthy expats Philippines', 'rich men Cebu', 'sugar daddy Manila', 'dating rich men Philippines'],
    description: 'Meet wealthy, verified singles in the Philippines. Find rich foreigners, expats, and affluent Filipinos in Manila, Cebu, and across the Philippines.',
    ageGroups: ['older rich men Philippines', 'wealthy expats Manila', 'sugar daddy Cebu'],
    cities: ['Manila', 'Cebu', 'Davao', 'Quezon City'],
  },
  ZA: {
    siteTitle: 'Rich Dating Network South Africa',
    keywords: ['rich sugar daddy South Africa', 'wealthy singles Johannesburg', 'sugar mummy Cape Town', 'rich men dating South Africa', 'millionaire dating SA', 'affluent singles South Africa', 'sugar mummies Durban', 'dating in Johannesburg'],
    description: 'Connect with wealthy singles in South Africa. Rich partners in Johannesburg, Cape Town, Durban, and across South Africa.',
    ageGroups: ['sugar mummies over 40 South Africa', 'rich older men Cape Town', 'wealthy women Johannesburg'],
    cities: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  },
  UG: {
    siteTitle: 'Rich Dating Network Uganda',
    keywords: ['rich sugar mummy Uganda', 'wealthy men Kampala', 'sugar daddy Uganda', 'millionaire dating Uganda', 'rich singles Kampala', 'affluent women Uganda', 'dating in Kampala'],
    description: 'Meet wealthy verified singles in Uganda. Rich sugar daddies and mummies in Kampala and across Uganda.',
    ageGroups: ['sugar mummies Uganda', 'rich men Kampala', 'wealthy older women Uganda'],
    cities: ['Kampala', 'Entebbe', 'Jinja'],
  },
  TZ: {
    siteTitle: 'Rich Dating Network Tanzania',
    keywords: ['rich sugar daddy Tanzania', 'wealthy men Dar es Salaam', 'sugar mummy Tanzania', 'millionaire dating Tanzania', 'rich singles Tanzania', 'dating in Dar es Salaam'],
    description: 'Find wealthy singles in Tanzania. Affluent partners in Dar es Salaam, Arusha, and across Tanzania.',
    ageGroups: ['sugar mummies Tanzania', 'rich men Dar es Salaam'],
    cities: ['Dar es Salaam', 'Arusha', 'Mwanza'],
  },
  US: {
    siteTitle: 'Rich Dating Network USA',
    keywords: ['luxury dating USA', 'millionaire dating America', 'wealthy singles USA', 'elite dating America', 'affluent singles New York', 'rich dating site USA', 'luxury matchmaking', 'high net worth dating', 'wealthy men USA', 'successful singles America', 'dating in New York', 'dating in Los Angeles', 'dating in Miami'],
    description: 'The premier luxury dating network for successful, affluent singles in the USA. Find your ideal wealthy partner in New York, Los Angeles, Miami, Chicago, and beyond.',
    ageGroups: ['wealthy men over 50 USA', 'affluent women 40s America', 'successful singles 30s USA'],
    cities: ['New York', 'Los Angeles', 'Miami', 'Chicago', 'Houston', 'Las Vegas'],
  },
  GB: {
    siteTitle: 'Rich Dating Network UK',
    keywords: ['millionaire dating UK', 'luxury singles London', 'wealthy dating UK', 'elite dating Britain', 'affluent singles Manchester', 'rich men dating UK', 'luxury matchmaking UK', 'successful singles London', 'dating in London'],
    description: 'Meet wealthy verified singles in the UK. Affluent partners in London, Manchester, Birmingham, and across Britain.',
    ageGroups: ['wealthy men over 50 UK', 'affluent women London', 'successful singles UK'],
    cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
  },
  CA: {
    siteTitle: 'Rich Dating Network Canada',
    keywords: ['millionaire dating Canada', 'wealthy singles Toronto', 'luxury dating Vancouver', 'affluent singles Canada', 'rich men dating Canada', 'successful singles Calgary', 'dating in Toronto'],
    description: 'Connect with wealthy verified singles across Canada. Rich partners in Toronto, Vancouver, Montreal, Calgary, and beyond.',
    ageGroups: ['affluent singles 40s Canada', 'wealthy men Toronto', 'rich women Vancouver'],
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  },
  AU: {
    siteTitle: 'Rich Dating Network Australia',
    keywords: ['millionaire dating Australia', 'wealthy singles Sydney', 'luxury dating Melbourne', 'affluent singles Australia', 'rich men dating Australia', 'successful singles Brisbane', 'dating in Sydney'],
    description: 'Find wealthy verified singles in Australia. Affluent partners in Sydney, Melbourne, Brisbane, Perth, and across Australia.',
    ageGroups: ['wealthy men 50s Australia', 'affluent women Sydney', 'successful singles Melbourne'],
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  },
  AE: {
    siteTitle: 'Rich Dating Network UAE',
    keywords: ['wealthy singles Dubai', 'millionaire dating UAE', 'rich men Dubai', 'luxury dating Dubai', 'affluent singles Abu Dhabi', 'expat dating Dubai', 'elite dating UAE', 'dating in Dubai'],
    description: 'Meet wealthy elite singles in the UAE. Affluent partners and successful expats in Dubai, Abu Dhabi, and across the Emirates.',
    ageGroups: ['wealthy expats Dubai', 'rich men UAE', 'affluent women Dubai'],
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah'],
  },
  DEFAULT: {
    siteTitle: 'Rich Dating Network',
    keywords: ['rich dating', 'wealthy singles', 'luxury dating', 'millionaire dating', 'elite dating', 'affluent singles', 'sugar daddy', 'sugar mummy', 'successful singles', 'rich men', 'wealthy women', 'premium dating site'],
    description: 'Rich Dating Network — the exclusive luxury dating platform connecting wealthy, successful singles worldwide. Verified profiles, real connections.',
    ageGroups: ['wealthy singles over 40', 'rich older men', 'affluent mature women'],
  },
}

const COUNTRY_NAMES: Record<string, string> = {
  KE: 'Kenya', NG: 'Nigeria', GH: 'Ghana', PH: 'Philippines', ZA: 'South Africa',
  UG: 'Uganda', TZ: 'Tanzania', US: 'the United States', GB: 'the United Kingdom',
  CA: 'Canada', AU: 'Australia', AE: 'UAE', DE: 'Germany', FR: 'France',
  SG: 'Singapore', JP: 'Japan', EG: 'Egypt', ET: 'Ethiopia', RW: 'Rwanda',
  MX: 'Mexico', BR: 'Brazil', IN: 'India', ZW: 'Zimbabwe', ZM: 'Zambia',
}

function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

function upsertMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
}

function buildTitle(path: string, countryCode: string, city: string): string {
  const c = countryCode && countryCode !== 'DEFAULT' ? countryCode : ''
  const countryName = c ? getCountryName(c) : ''
  const siteTitle = COUNTRY_SEO[countryCode]?.siteTitle || COUNTRY_SEO.DEFAULT.siteTitle
  const loc = city || countryName

  if (path === '/') return `${siteTitle} | Find Rich Singles${loc ? ` in ${loc}` : ''}`
  if (path === '/discover') return `Discover Wealthy Singles${loc ? ` in ${loc}` : ' Worldwide'} | Rich Dating Network`
  if (path === '/meet') return `Meet Affluent Singles${loc ? ` in ${loc}` : ''} | Rich Dating Network`
  if (path === '/likes') return `Your Likes & Matches${loc ? ` in ${loc}` : ''} | Rich Dating Network`
  if (path === '/chat') return `Messages | Rich Dating Network`
  if (path.startsWith('/chat/')) return `Chat | Rich Dating Network`
  if (path === '/visitors') return `Profile Visitors | Rich Dating Network`
  if (path === '/gifts') return `Gifts | Rich Dating Network`
  if (path === '/login') return `Sign In | Rich Dating Network`
  if (path === '/register') return `Join Free${loc ? ` — Meet Rich Singles in ${loc}` : ''} | Rich Dating Network`
  if (path === '/premium') return `VIP Premium Membership | Rich Dating Network`
  if (path === '/credits') return `Credits & Payments | Rich Dating Network`
  if (path === '/boost') return `Boost Your Profile | Rich Dating Network`
  if (path === '/home') return `Your Matches${loc ? ` in ${loc}` : ''} | Rich Dating Network`
  if (path === '/settings') return `Settings | Rich Dating Network`
  if (path === '/referrals') return `Referrals | Rich Dating Network`
  if (path === '/contact') return `Contact Us | Rich Dating Network`
  if (path === '/terms') return `Terms of Service | Rich Dating Network`
  if (path === '/privacy') return `Privacy Policy | Rich Dating Network`
  if (path.startsWith('/profile/') || path.startsWith('/@')) return `Profile | Rich Dating Network`
  return `${siteTitle}${loc ? ` — ${loc}` : ''}`
}

function buildDescription(countryCode: string, city: string): string {
  const seoData = COUNTRY_SEO[countryCode] || COUNTRY_SEO.DEFAULT
  if (city) {
    return seoData.description.replace(
      /in [A-Z][a-z]+/g,
      `in ${city}`
    )
  }
  return seoData.description
}

export default function SEOHead() {
  const [location] = useLocation()
  const { user } = useAuth()
  const countryCode = user?.countryCode?.toUpperCase() || 'DEFAULT'
  const userCity = user?.city || ''
  const seoData = COUNTRY_SEO[countryCode] || COUNTRY_SEO.DEFAULT

  useEffect(() => {
    const title = buildTitle(location, countryCode, userCity)
    document.title = title

    const description = buildDescription(countryCode, userCity)
    const allKeywords = [
      ...seoData.keywords,
      ...seoData.ageGroups,
      ...(userCity ? [`dating in ${userCity}`, `singles in ${userCity}`, `wealthy singles ${userCity}`] : []),
    ].join(', ')

    upsertMeta('description', description)
    upsertMeta('keywords', allKeywords)
    upsertMeta('robots', 'index, follow')
    upsertMeta('author', 'Rich Dating Network')
    upsertMeta('geo.region', countryCode !== 'DEFAULT' ? countryCode : '')
    if (userCity) upsertMeta('geo.placename', userCity)

    // Open Graph
    upsertMeta('og:title', title, true)
    upsertMeta('og:description', description, true)
    upsertMeta('og:type', 'website', true)
    upsertMeta('og:site_name', 'Rich Dating Network', true)
    upsertMeta('og:image', '/og-image.jpg', true)
    if (userCity) upsertMeta('og:locale', countryCode !== 'DEFAULT' ? `en_${countryCode}` : 'en_US', true)

    // Twitter Card
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', title)
    upsertMeta('twitter:description', description)
    upsertMeta('twitter:image', '/og-image.jpg')

    // Canonical
    upsertLink('canonical', `https://richdatingnetwork.com${location}`)
  }, [location, countryCode, userCity, seoData])

  return null
}

export { COUNTRY_SEO, COUNTRY_NAMES, getCountryName }
