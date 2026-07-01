import { useState, useMemo } from 'react'
import { Link } from 'wouter'
import { Search, MapPin, ChevronRight } from 'lucide-react'
import { PLACES_LIST, CATEGORY_PREFIXES, CATEGORY_LABELS } from '../data/seoLandingPages'

function slugify(s: string) {
  return s.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

type GroupedCountry = { country: string; places: string[] }

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Color per category for the quick-link chips
const CHIP_COLORS: Record<string, string> = {
  'sugar-daddy':       'bg-amber-600/20 hover:bg-amber-500/40 text-amber-300',
  'sugar-mummy':       'bg-pink-600/20 hover:bg-pink-500/40 text-pink-300',
  'rich-men':          'bg-blue-600/20 hover:bg-blue-500/40 text-blue-300',
  'rich-women':        'bg-purple-600/20 hover:bg-purple-500/40 text-purple-300',
  'wealthy-men':       'bg-cyan-600/20 hover:bg-cyan-500/40 text-cyan-300',
  'wealthy-women':     'bg-fuchsia-600/20 hover:bg-fuchsia-500/40 text-fuchsia-300',
  'millionaire-dating':'bg-yellow-600/20 hover:bg-yellow-500/40 text-yellow-300',
  'cougar-dating':     'bg-rose-600/20 hover:bg-rose-500/40 text-rose-300',
  'older-men':         'bg-teal-600/20 hover:bg-teal-500/40 text-teal-300',
  'luxury-dating':     'bg-indigo-600/20 hover:bg-indigo-500/40 text-indigo-300',
}

export default function LocationsPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('sugar-daddy')

  const grouped = useMemo<GroupedCountry[]>(() => {
    const map = new Map<string, string[]>()
    for (const { city, country } of PLACES_LIST) {
      if (!map.has(country)) map.set(country, [])
      map.get(country)!.push(city)
    }
    return Array.from(map.entries())
      .map(([country, places]) => ({ country, places: places.sort() }))
      .sort((a, b) => a.country.replace(/^the /i, '').localeCompare(b.country.replace(/^the /i, '')))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped
    const q = query.toLowerCase()
    return grouped
      .map(g => ({ ...g, places: g.places.filter(p => p.toLowerCase().includes(q)) }))
      .filter(g => g.places.length > 0 || g.country.toLowerCase().includes(q))
  }, [grouped, query])

  const letterIndex = useMemo(() =>
    new Set(grouped.map(g => g.country.replace(/^the /i, '')[0].toUpperCase()))
  , [grouped])

  const totalPlaces = PLACES_LIST.length
  const totalPages = totalPlaces * CATEGORY_PREFIXES.length

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-red-950/60 to-black border-b border-white/10 px-4 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <MapPin className="text-red-400" size={20} />
          <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Locations Hub</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Find Wealthy Singles Near You
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto mb-2">
          Browse {totalPlaces.toLocaleString()} places across 60+ countries.
          Over <strong className="text-white">{totalPages.toLocaleString()}+</strong> location pages covering every search term.
        </p>
        {/* Search */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Search cities, towns, countries…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-full py-3 pl-11 pr-5 text-white placeholder-white/40 focus:outline-none focus:border-red-400 focus:bg-white/15 transition"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category filter */}
        <div className="mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Browse by category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_PREFIXES.map(prefix => (
              <button
                key={prefix}
                onClick={() => setActiveCategory(prefix)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  activeCategory === prefix
                    ? 'border-white/30 ' + CHIP_COLORS[prefix]
                    : 'border-white/10 bg-white/5 text-white/40 hover:text-white/70'
                }`}
              >
                {CATEGORY_LABELS[prefix]}
              </button>
            ))}
          </div>
        </div>

        {/* A-Z index bar */}
        {!query && (
          <div className="flex flex-wrap gap-1 justify-center mb-8">
            {ALPHABET.map(letter => (
              <a
                key={letter}
                href={`#letter-${letter}`}
                className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition ${
                  letterIndex.has(letter)
                    ? 'bg-red-600/30 hover:bg-red-600 text-white cursor-pointer'
                    : 'text-white/20 cursor-default'
                }`}
                onClick={e => { if (!letterIndex.has(letter)) e.preventDefault() }}
              >
                {letter}
              </a>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center text-white/40 py-16">
            <MapPin size={40} className="mx-auto mb-3 opacity-30" />
            <p>No locations found for "<span className="text-white/60">{query}</span>"</p>
          </div>
        )}

        {/* Country groups */}
        {filtered.map(({ country, places }) => {
          const firstLetter = country.replace(/^the /i, '')[0].toUpperCase()
          return (
            <div key={country} id={`letter-${firstLetter}`} className="mb-10">
              <h2 className="text-lg font-semibold text-white/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-red-600/30 flex items-center justify-center text-xs font-bold text-red-400">
                  {firstLetter}
                </span>
                {country}
                <span className="text-white/30 text-xs font-normal ml-1">({places.length} places)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {places.map(place => {
                  const citySlug = slugify(place)
                  const chipClass = CHIP_COLORS[activeCategory] ?? 'bg-white/10 hover:bg-white/20 text-white/70'
                  return (
                    <div key={place} className="group">
                      {/* Primary link for the active category */}
                      <Link
                        href={`/${activeCategory}-${citySlug}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-600/20 border border-white/5 hover:border-red-500/40 transition text-sm text-white/70 hover:text-white"
                      >
                        <MapPin size={12} className="shrink-0 text-red-400/60 group-hover:text-red-400" />
                        <span className="truncate font-medium">{place}</span>
                      </Link>
                      {/* Quick-access chips for all categories */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {CATEGORY_PREFIXES.map(prefix => (
                          <Link
                            key={prefix}
                            href={`/${prefix}-${citySlug}`}
                            title={`${CATEGORY_LABELS[prefix]} in ${place}`}
                            className={`text-[10px] px-1.5 py-0.5 rounded transition border border-transparent ${CHIP_COLORS[prefix] ?? 'bg-white/5 text-white/40'}`}
                          >
                            {CATEGORY_LABELS[prefix]}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Don't see your city?</h2>
          <p className="text-white/60 mb-6 max-w-md mx-auto">
            We're active in 180+ countries. Sign up free and find verified wealthy singles wherever you are.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            Join Free Today <ChevronRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  )
}
