import { useEffect } from 'react'
import { Link } from 'wouter'
import { Heart, Shield, Users, Check, ChevronRight, MapPin, Globe } from 'lucide-react'
import { getSeoLandingPage, SEO_LANDING_PAGES, PLACES_LIST, CATEGORY_PREFIXES, CATEGORY_LABELS } from '../data/seoLandingPages'
import NotFound from './not-found'
import PopularSearches from '../components/common/PopularSearches'
import FeaturedMembers from '../components/seo/FeaturedMembers'

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

function slugify(s: string) {
  return s.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function KeywordLandingPage({ params }: { params: { slug: string } }) {
  const page = getSeoLandingPage(params.slug)

  useEffect(() => {
    if (!page) return
    document.title = page.title
    upsertMeta('description', page.description)
    upsertMeta('keywords', page.keywords.join(', '))
    upsertMeta('robots', 'index, follow, max-image-preview:large')
    upsertMeta('og:title', page.title, true)
    upsertMeta('og:description', page.description, true)
    upsertMeta('og:type', 'website', true)
    upsertMeta('og:site_name', 'Rich Dating Network', true)
    upsertMeta('og:image', '/og-image.jpg', true)
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', page.title)
    upsertMeta('twitter:description', page.description)
    upsertLink('canonical', `https://richdatingnetwork.com/${page.slug}`)

    // JSON-LD breadcrumbs
    const breadcrumbs: { name: string; item: string }[] = [
      { name: 'Home', item: 'https://richdatingnetwork.com/' },
    ]
    // For city pages: Home → Country hub → City page
    if (page.city && page.country && page.category) {
      const countryHubSlug = `${page.category}-${slugify(page.country)}`
      const countryHubPage = getSeoLandingPage(countryHubSlug)
      if (countryHubPage) {
        breadcrumbs.push({ name: countryHubPage.h1, item: `https://richdatingnetwork.com/${countryHubSlug}` })
      }
    }
    breadcrumbs.push({ name: page.h1, item: `https://richdatingnetwork.com/${page.slug}` })

    let ld = document.getElementById('lp-jsonld') as HTMLScriptElement | null
    if (!ld) {
      ld = document.createElement('script')
      ld.type = 'application/ld+json'
      ld.id = 'lp-jsonld'
      document.head.appendChild(ld)
    }
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.h1,
      description: page.description,
      url: `https://richdatingnetwork.com/${page.slug}`,
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem', position: i + 1, name: b.name, item: b.item,
        })),
      },
    })

    return () => { ld?.remove() }
  }, [page])

  if (!page) return <NotFound />

  const isCountryPage = !!page.country && !page.city
  const isCityPage = !!page.city && !!page.country

  // Category prefix — stored in page.category for country/city pages
  const catPrefix = page.category && CATEGORY_PREFIXES.includes(page.category)
    ? page.category
    : CATEGORY_PREFIXES.find(p => page.slug.startsWith(p + '-')) ?? ''

  // Gender filter for FeaturedMembers — comes from the page's category definition
  const pageGender = page.gender

  // Country hub slug for city pages (breadcrumb + related link)
  const countryHubSlug = isCityPage && page.country ? `${catPrefix}-${slugify(page.country)}` : ''
  const countryHubPage = countryHubSlug ? getSeoLandingPage(countryHubSlug) : null

  // For country hub pages: all cities in this country
  const countryCities = isCountryPage && page.country
    ? PLACES_LIST.filter(p => p.country === page.country)
    : []

  // Related pages
  const relatedByCity = isCityPage
    ? SEO_LANDING_PAGES.filter(p => p.city === page.city && p.slug !== page.slug).slice(0, 9)
    : []
  const otherCities = isCityPage
    ? SEO_LANDING_PAGES.filter(p => p.city && p.city !== page.city && p.category === catPrefix).slice(0, 8)
    : []
  const relatedGeneric = !isCityPage && !isCountryPage
    ? SEO_LANDING_PAGES.filter(p => !p.city && !p.country && p.slug !== page.slug).slice(0, 6)
    : []

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#2a0a10] via-[#7a0e18] to-[#FF192C] text-white px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Breadcrumb */}
          {(isCountryPage || isCityPage) && (
            <div className="flex items-center justify-center gap-1.5 text-white/60 text-xs mb-5 flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              {isCityPage && countryHubPage && (
                <>
                  <Link href={`/${countryHubSlug}`} className="hover:text-white transition-colors">
                    {countryHubPage.h1}
                  </Link>
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
              <span className="text-white/90">{page.h1}</span>
            </div>
          )}

          <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Heart className="w-4 h-4 text-yellow-300" />
            {isCountryPage ? (
              <><Globe className="w-4 h-4" /> {page.country} — All Cities</>
            ) : (
              'Exclusive Luxury Dating Platform'
            )}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6">{page.h1}</h1>
          <p className="text-lg text-white/85 max-w-2xl mx-auto mb-8">{page.intro}</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-white text-[#FF192C] font-bold px-8 py-4 rounded-xl text-lg hover:bg-yellow-50 transition-colors">
            Join Free Now <ChevronRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-white/80 flex-wrap">
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-yellow-300" /> 100% Free to Join</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-yellow-300" /> Verified Profiles</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-yellow-300" /> 180+ Countries</span>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 max-w-5xl mx-auto">
        {/* Trust signals */}
        <div className="grid sm:grid-cols-3 gap-6 mb-14">
          <div className="text-center p-6 rounded-2xl bg-gray-50">
            <Shield className="w-8 h-8 text-[#FF192C] mx-auto mb-3" />
            <h3 className="font-bold mb-1">Verified & Safe</h3>
            <p className="text-sm text-gray-600">Every profile is reviewed to keep the community genuine.</p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-gray-50">
            <Users className="w-8 h-8 text-[#FF192C] mx-auto mb-3" />
            <h3 className="font-bold mb-1">Real Members</h3>
            <p className="text-sm text-gray-600">Thousands of active, verified members across 180+ countries.</p>
          </div>
          <div className="text-center p-6 rounded-2xl bg-gray-50">
            <Heart className="w-8 h-8 text-[#FF192C] mx-auto mb-3" />
            <h3 className="font-bold mb-1">Real Connections</h3>
            <p className="text-sm text-gray-600">Meaningful relationships built on trust and mutual respect.</p>
          </div>
        </div>

        {/* ── COUNTRY HUB: city grid ──────────────────────────────────────── */}
        {isCountryPage && countryCities.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#FF192C]" />
              Browse by City in {page.country}
            </h2>
            <p className="text-gray-600 mb-6">
              Choose your city below to find {CATEGORY_LABELS[catPrefix] ?? catPrefix} near you.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {countryCities.map(({ city }) => (
                <Link
                  key={city}
                  href={`/${catPrefix}-${slugify(city)}`}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:border-[#FF192C] hover:bg-red-50 text-gray-700 hover:text-[#FF192C] text-sm font-medium transition-all group"
                >
                  <MapPin className="w-4 h-4 text-gray-400 group-hover:text-[#FF192C] shrink-0" />
                  <span className="truncate">{city}</span>
                </Link>
              ))}
            </div>

            {/* Other categories for this country */}
            <div className="mt-8 pt-8 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Also explore in {page.country}</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_PREFIXES.filter(p => p !== catPrefix).map(p => (
                  <Link
                    key={p}
                    href={`/${p}-${slugify(page.country!)}`}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-[#FF192C] transition-colors border border-gray-200 hover:border-red-200"
                  >
                    {CATEGORY_LABELS[p]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Why join section */}
        <h2 className="text-2xl font-bold mb-4">Why join Rich Dating Network?</h2>
        <p className="text-gray-700 leading-relaxed mb-4">{page.description}</p>
        <p className="text-gray-700 leading-relaxed mb-8">
          Registration takes less than a minute — no hidden fees to sign up. Browse profiles, send likes, and start
          chatting with genuine, verified members today. Rich Dating Network is trusted by members across Kenya,
          Nigeria, Ghana, South Africa, Uganda, Tanzania, the Philippines, the UK, the USA, the UAE and 180+ other
          countries.
        </p>

        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to find your match?</h3>
          <p className="text-gray-600 mb-6">Join free in under a minute — no credit card required.</p>
          <Link href="/register" className="inline-flex items-center gap-2 bg-[#FF192C] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#e01526] transition-colors">
            Create Your Free Account <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {/* ── FEATURED MEMBERS: real profiles from this city/country ─────────── */}
        {/* Shown on city pages (filter by city + country) and country pages (by country) */}
        {(isCityPage || isCountryPage) && (
          <FeaturedMembers
            city={isCityPage ? page.city ?? undefined : undefined}
            country={page.country ?? undefined}
            gender={pageGender}
            heading={
              isCityPage
                ? `Meet ${CATEGORY_LABELS[catPrefix] ?? 'Members'} in ${page.city}`
                : `Meet ${CATEGORY_LABELS[catPrefix] ?? 'Members'} in ${page.country}`
            }
            jsonLdId={page.slug}
          />
        )}

        {/* ── CITY PAGE: related links ──────────────────────────────────────── */}
        {isCityPage && (relatedByCity.length > 0 || otherCities.length > 0 || countryHubPage) && (
          <div className="mt-14 grid sm:grid-cols-2 gap-8">
            {relatedByCity.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Also in {page.city}</h3>
                <div className="flex flex-col gap-2 text-sm">
                  {relatedByCity.map(p => (
                    <Link key={p.slug} href={`/${p.slug}`} className="text-gray-500 hover:text-[#FF192C] transition-colors">
                      {p.h1}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <div>
              {countryHubPage && (
                <div className="mb-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">Browse all cities</h3>
                  <Link href={`/${countryHubSlug}`} className="inline-flex items-center gap-1.5 text-sm text-[#FF192C] hover:underline font-medium">
                    <Globe className="w-4 h-4" /> {countryHubPage.h1}
                  </Link>
                </div>
              )}
              {otherCities.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Other Cities</h3>
                  <div className="flex flex-col gap-2 text-sm">
                    {otherCities.map(p => (
                      <Link key={p.slug} href={`/${p.slug}`} className="text-gray-500 hover:text-[#FF192C] transition-colors">
                        {p.h1}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generic pages: related links */}
        {!isCityPage && !isCountryPage && relatedGeneric.length > 0 && (
          <div className="mt-14">
            <h3 className="text-sm font-bold text-gray-900 mb-3">You Might Also Like</h3>
            <div className="flex flex-col gap-2 text-sm">
              {relatedGeneric.map(p => (
                <Link key={p.slug} href={`/${p.slug}`} className="text-gray-500 hover:text-[#FF192C] transition-colors">
                  {p.h1}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <PopularSearches excludeSlug={page.slug} />
    </div>
  )
}
