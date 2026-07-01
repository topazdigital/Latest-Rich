import { useEffect } from 'react'
import { Link } from 'wouter'
import { Heart, Shield, Users, Check, ChevronRight } from 'lucide-react'
import { getSeoLandingPage } from '../data/seoLandingPages'
import NotFound from './not-found'

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
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://richdatingnetwork.com/' },
          { '@type': 'ListItem', position: 2, name: page.h1, item: `https://richdatingnetwork.com/${page.slug}` },
        ],
      },
    })

    return () => { ld?.remove() }
  }, [page])

  if (!page) return <NotFound />

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-[#2a0a10] via-[#7a0e18] to-[#FF192C] text-white px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Heart className="w-4 h-4 text-yellow-300" /> Exclusive Luxury Dating Platform
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

      <section className="px-6 py-16 max-w-4xl mx-auto">
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
      </section>
    </div>
  )
}
