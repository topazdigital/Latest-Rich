import { useState, useEffect, useCallback } from 'react'
import { Link, useSearch, useLocation } from 'wouter'
import { getPhotoUrl, isOnline } from '../lib/utils'
import { BadgeCheck, Crown, Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'

const GENDERS = [
  { value: '', label: 'All' },
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
]

const POPULAR_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Kenya',
  'Nigeria', 'South Africa', 'UAE', 'Germany', 'France',
]

function MemberCard({ member }: { member: any }) {
  const href = member.username ? `/@${member.username}` : `/profile/${member.id}`
  const online = isOnline(member.lastAccess)
  return (
    <Link href={href} className="group block">
      <div className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-gray-900 aspect-[3/4]">
        <img
          src={getPhotoUrl(member.photoThumb || member.photo)}
          alt={`${member.name}, ${member.age}, ${member.city}`}
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.85) 100%)' }} />

        {/* Online badge */}
        {online && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
          </div>
        )}

        {/* VIP badge */}
        {member.premium === 1 && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            <Crown size={9} /> VIP
          </div>
        )}

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-sm leading-tight truncate">
              {member.name}{member.age ? `, ${member.age}` : ''}
            </span>
            {member.verified === 1 && <BadgeCheck size={13} className="text-blue-400 flex-shrink-0" />}
          </div>
          {member.city && (
            <p className="text-white/70 text-[11px] truncate mt-0.5">📍 {member.city}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

function buildSeoTitle(gender: string, country: string, city: string): string {
  const who = gender === 'male' ? 'Wealthy Men' : gender === 'female' ? 'Affluent Women' : 'Wealthy Singles'
  const where = city || country
  if (where) return `${who} in ${where} | Rich Dating Network`
  return `${who} Worldwide | Rich Dating Network`
}

function buildSeoDescription(gender: string, country: string, city: string): string {
  const who = gender === 'male' ? 'wealthy men and successful bachelors' : gender === 'female' ? 'affluent women and successful ladies' : 'wealthy singles, sugar daddies, sugar mummies, and affluent partners'
  const where = city || country
  if (where) return `Browse verified profiles of ${who} in ${where} on Rich Dating Network. Find your perfect match today — 100% free to join.`
  return `Browse verified profiles of ${who} worldwide on Rich Dating Network. The #1 luxury dating platform for successful, ambitious singles. Join free today.`
}

export default function MembersPage() {
  const search = useSearch()
  const [, setLocation] = useLocation()
  const params = new URLSearchParams(search)

  const [gender, setGender] = useState(params.get('gender') || '')
  const [country, setCountry] = useState(params.get('country') || '')
  const [city, setCity] = useState(params.get('city') || '')
  const [cityInput, setCityInput] = useState(params.get('city') || '')
  const [page, setPage] = useState(parseInt(params.get('page') || '1'))
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams()
    if (gender) p.set('gender', gender)
    if (country) p.set('country', country)
    if (cityInput) p.set('city', cityInput)
    p.set('page', '1')
    setCity(cityInput)
    setPage(1)
    setLocation(`/members?${p.toString()}`)
  }, [gender, country, cityInput, setLocation])

  useEffect(() => {
    const p = new URLSearchParams(search)
    const g = p.get('gender') || ''
    const c = p.get('country') || ''
    const ci = p.get('city') || ''
    const pg = parseInt(p.get('page') || '1')
    setGender(g); setCountry(c); setCity(ci); setCityInput(ci); setPage(pg)

    setLoading(true)
    const qs = new URLSearchParams()
    if (g) qs.set('gender', g)
    if (c) qs.set('country', c)
    if (ci) qs.set('city', ci)
    qs.set('page', String(pg))

    fetch(`/api/users/public/members?${qs.toString()}`)
      .then(r => r.json())
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [search])

  // Set page SEO
  useEffect(() => {
    const title = buildSeoTitle(gender, country, city)
    const description = buildSeoDescription(gender, country, city)
    document.title = title
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', description)
    setMeta('og:title', title, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)

    const canonicalBase = 'https://richdatingnetwork.com/members'
    const cp = new URLSearchParams()
    if (gender) cp.set('gender', gender)
    if (country) cp.set('country', country)
    if (city) cp.set('city', city)
    const canonicalUrl = cp.toString() ? `${canonicalBase}?${cp.toString()}` : canonicalBase
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    link.href = canonicalUrl
  }, [gender, country, city])

  const changePage = (next: number) => {
    const p = new URLSearchParams(search)
    p.set('page', String(next))
    setLocation(`/members?${p.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageTitle = buildSeoTitle(gender, country, city).split(' | ')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl">❤️</span>
            <span className="font-bold text-gray-900 hidden sm:block"><span className="text-brand-500">Rich</span> Dating Network</span>
          </Link>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(p => !p)}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-brand-500 border border-gray-200 rounded-xl px-3 py-2 transition-colors">
            <SlidersHorizontal size={15} /> Filters
            {(gender || country || city) && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-brand-500 px-3 py-2 hidden sm:block">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm px-4 py-2">Join Free</Link>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <div className="max-w-6xl mx-auto flex flex-wrap gap-3 items-end">
              {/* Gender */}
              <div className="flex-shrink-0">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Looking for</label>
                <div className="flex gap-1">
                  {GENDERS.map(g => (
                    <button key={g.value}
                      onClick={() => setGender(g.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${gender === g.value ? 'bg-brand-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country */}
              <div className="flex-shrink-0 min-w-36">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Country</label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 outline-none focus:border-brand-400">
                  <option value="">All countries</option>
                  {POPULAR_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* City */}
              <div className="flex-shrink-0">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">City</label>
                <div className="flex gap-1">
                  <input type="text" value={cityInput} onChange={e => setCityInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && applyFilters()}
                    placeholder="e.g. Orlando"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-400 w-32" />
                </div>
              </div>

              <button onClick={applyFilters}
                className="flex items-center gap-1.5 bg-brand-500 text-white rounded-lg px-4 py-1.5 text-sm font-semibold hover:bg-brand-600 transition-colors">
                <Search size={13} /> Search
              </button>

              {(gender || country || city) && (
                <button onClick={() => { setGender(''); setCountry(''); setCityInput(''); setLocation('/members') }}
                  className="text-sm text-gray-400 hover:text-gray-600 underline">Clear filters</button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* SEO-rich heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{pageTitle}</h1>
          <p className="text-gray-500 text-sm">{buildSeoDescription(gender, country, city)}</p>
        </div>

        {/* Quick filter pills */}
        <div className="flex gap-2 flex-wrap mb-6">
          {['United States', 'United Kingdom', 'Kenya', 'Nigeria', 'UAE'].map(c => (
            <button key={c} onClick={() => { setCountry(c); setLocation(`/members?country=${encodeURIComponent(c)}`) }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${country === c ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'}`}>
              {c}
            </button>
          ))}
          <button onClick={() => { setGender('male'); setLocation(`/members?gender=male`) }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${gender === 'male' && !country ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'}`}>
            Wealthy Men
          </button>
          <button onClick={() => { setGender('female'); setLocation(`/members?gender=female`) }}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${gender === 'female' && !country ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'}`}>
            Affluent Women
          </button>
        </div>

        {/* Member grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No members found</h2>
            <p className="text-gray-500 text-sm mb-6">Try different filters or browse all members.</p>
            <button onClick={() => setLocation('/members')} className="btn-primary">Browse All Members</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {members.map(m => <MemberCard key={m.id} member={m} />)}
          </div>
        )}

        {/* Pagination */}
        {!loading && members.length === 24 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            {page > 1 && (
              <button onClick={() => changePage(page - 1)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600 bg-white">
                <ChevronLeft size={15} /> Previous
              </button>
            )}
            <span className="text-sm text-gray-500 font-medium">Page {page}</span>
            <button onClick={() => changePage(page + 1)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600 bg-white">
              Next <ChevronRight size={15} />
            </button>
          </div>
        )}

        {/* SEO content block + CTA */}
        <div className="mt-12 bg-gradient-to-br from-brand-600 to-pink-600 rounded-3xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">
            Ready to meet {gender === 'male' ? 'wealthy men' : gender === 'female' ? 'affluent women' : 'wealthy singles'}
            {city ? ` in ${city}` : country ? ` in ${country}` : ''}?
          </h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto text-sm leading-relaxed">
            Join thousands of verified wealthy singles on Rich Dating Network. Create your free profile in 30 seconds and start connecting with successful, ambitious people near you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-white text-brand-600 font-bold px-8 py-3 rounded-2xl hover:bg-gray-50 transition-colors">
              Join Free — Start Chatting
            </Link>
            <Link href="/login" className="border border-white/40 text-white font-medium px-8 py-3 rounded-2xl hover:bg-white/10 transition-colors">
              Sign In
            </Link>
          </div>
        </div>

        {/* SEO keyword text */}
        <div className="mt-10 prose prose-sm max-w-none text-gray-400 text-xs leading-relaxed">
          <p>
            Rich Dating Network is the leading luxury dating platform connecting verified wealthy singles worldwide.
            Whether you're looking for a successful partner{city ? ` in ${city}` : country ? ` in ${country}` : ''},
            a high-net-worth companion, or a meaningful relationship with an affluent individual,
            our platform offers a curated community of genuine, ambitious people.
            Browse {gender === 'male' ? 'wealthy men' : gender === 'female' ? 'affluent women' : 'successful men and women'},
            view their full profiles, and connect — completely free to join.
          </p>
        </div>
      </div>
    </div>
  )
}
