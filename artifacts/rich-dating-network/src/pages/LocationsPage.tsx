import { useState, useMemo } from 'react'
import { Link } from 'wouter'
import { Search, MapPin, ChevronRight } from 'lucide-react'
import { PLACES_LIST } from '../data/seoLandingPages'

function slugify(s: string) {
  return s.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

type GroupedCountry = {
  country: string
  places: string[]
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function LocationsPage() {
  const [query, setQuery] = useState('')

  const grouped = useMemo<GroupedCountry[]>(() => {
    const map = new Map<string, string[]>()
    for (const { city, country } of PLACES_LIST) {
      const key = country
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(city)
    }
    return Array.from(map.entries())
      .map(([country, places]) => ({ country, places: places.sort() }))
      .sort((a, b) => a.country.replace(/^the /i, '').localeCompare(b.country.replace(/^the /i, '')))
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped
    const q = query.toLowerCase()
    return grouped
      .map(g => ({
        ...g,
        places: g.places.filter(p => p.toLowerCase().includes(q)),
      }))
      .filter(g => g.places.length > 0 || g.country.toLowerCase().includes(q))
  }, [grouped, query])

  const letterIndex = useMemo(() => {
    const set = new Set(
      grouped.map(g => g.country.replace(/^the /i, '')[0].toUpperCase())
    )
    return set
  }, [grouped])

  const totalPlaces = PLACES_LIST.length

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="bg-gradient-to-b from-red-950/60 to-black border-b border-white/10 px-4 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <MapPin className="text-red-400" size={20} />
          <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Locations</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Find Sugar Daddies & Sugar Mummies Near You
        </h1>
        <p className="text-white/60 text-base max-w-xl mx-auto mb-6">
          Browse {totalPlaces.toLocaleString()}+ places worldwide. Click any location to see verified members near you.
        </p>
        {/* Search */}
        <div className="relative max-w-md mx-auto">
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

      <div className="max-w-6xl mx-auto px-4 py-8">
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
                onClick={e => {
                  if (!letterIndex.has(letter)) e.preventDefault()
                }}
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
            <div
              key={country}
              id={`letter-${firstLetter}`}
              className="mb-8"
            >
              <h2 className="text-lg font-semibold text-white/80 border-b border-white/10 pb-2 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded bg-red-600/30 flex items-center justify-center text-xs font-bold text-red-400">
                  {firstLetter}
                </span>
                {country}
                <span className="text-white/30 text-xs font-normal ml-1">({places.length} places)</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {places.map(place => (
                  <div key={place} className="group">
                    <Link
                      href={`/sugar-daddy-${slugify(place)}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-600/20 border border-white/5 hover:border-red-500/40 transition text-sm text-white/70 hover:text-white"
                    >
                      <MapPin size={12} className="shrink-0 text-red-400/60 group-hover:text-red-400" />
                      <span className="truncate">{place}</span>
                    </Link>
                    <div className="flex gap-1 mt-1">
                      <Link
                        href={`/sugar-daddy-${slugify(place)}`}
                        className="flex-1 text-center text-[10px] px-1 py-0.5 rounded bg-white/5 hover:bg-red-600/20 text-white/40 hover:text-white/70 transition"
                      >
                        Sugar Daddy
                      </Link>
                      <Link
                        href={`/sugar-mummy-${slugify(place)}`}
                        className="flex-1 text-center text-[10px] px-1 py-0.5 rounded bg-white/5 hover:bg-pink-600/20 text-white/40 hover:text-white/70 transition"
                      >
                        Sugar Mummy
                      </Link>
                    </div>
                  </div>
                ))}
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
