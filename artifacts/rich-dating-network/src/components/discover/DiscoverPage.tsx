import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'wouter'
import { getPhotoUrl, isOnline, truncate, profileUrl } from '../../lib/utils'
import { Heart, MessageCircle, Search, SlidersHorizontal, BadgeCheck, Crown, MapPin, X, Loader2, Zap, Percent, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useWSEvent } from '../../hooks/useWebSocket'
import LocationAutocomplete from '../ui/LocationAutocomplete'
import { authFetch } from '../../lib/auth'

interface Props {
  userId: number;
  myCity?: string;
  myCountry?: string;
  myInterests?: string[];
  myLooking?: number;
}

function calcCompatibility(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests.length || !theirInterests.length) return 0
  const their = (() => { try { return JSON.parse(theirInterests as any) } catch { return theirInterests } })()
  const shared = myInterests.filter(i => their.includes(i)).length
  const union = new Set([...myInterests, ...their]).size
  return union === 0 ? 0 : Math.round((shared / union) * 100)
}

export default function DiscoverPage({ userId, myCity, myCountry, myInterests = [], myLooking }: Props) {
  const [, setLocation] = useLocation()
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGender, setFilterGender] = useState('0')
  const [genderInitialized, setGenderInitialized] = useState(false)

  // Sync filterGender with user's "looking for" preference once it loads
  useEffect(() => {
    if (!genderInitialized && myLooking) {
      setFilterGender(String(myLooking))
      setGenderInitialized(true)
    }
  }, [myLooking, genderInitialized])
  const [filterCity, setFilterCity] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(18)
  const [filterAgeMax, setFilterAgeMax] = useState(99)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterPremium, setFilterPremium] = useState(false)
  const [filterCompatible, setFilterCompatible] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [likedUsers, setLikedUsers] = useState<Set<number>>(new Set())
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Real-time online status updates from WebSocket
  useWSEvent('user_online', (msg) => {
    setOnlineUserIds(prev => {
      const next = new Set(prev)
      if (msg.online) next.add(msg.userId as number)
      else next.delete(msg.userId as number)
      return next
    })
  })

  function fetchUsers() {
    setLoading(true)
    const params = new URLSearchParams({
      q: search,
      city: filterCity,
      country: filterCountry,
      ageMin: String(filterAgeMin),
      ageMax: String(filterAgeMax),
      gender: filterGender,
      online: filterOnline ? '1' : '0',
    })
    authFetch(`/api/users/search?${params}`)
      .then(r => r.json())
      .then(data => {
        setUsers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [filterGender, filterCity, filterCountry, filterAgeMin, filterAgeMax, filterOnline, filterPremium])
  useEffect(() => { const t = setTimeout(fetchUsers, 400); return () => clearTimeout(t) }, [search])

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterPremium && u.premium !== 1) return false
      if (filterCompatible && myInterests.length > 0) {
        const their: string[] = (() => { try { return JSON.parse(u.userExtended?.interests || '[]') } catch { return [] } })()
        const score = calcCompatibility(myInterests, their)
        if (score < 20) return false
      }
      return true
    }).map(u => {
      const their: string[] = (() => { try { return JSON.parse(u.userExtended?.interests || '[]') } catch { return [] } })()
      return { ...u, _compat: myInterests.length > 0 ? calcCompatibility(myInterests, their) : 0 }
    }).sort((a, b) => {
      // Boosted first, then by compatibility
      if (a.isBoosted && !b.isBoosted) return -1
      if (!a.isBoosted && b.isBoosted) return 1
      return b._compat - a._compat
    })
  }, [users, filterPremium, filterCompatible, myInterests])

  const hasActiveFilters = filterGender !== '0' || filterCity || filterCountry || filterAgeMin > 18 || filterAgeMax < 99 || filterOnline || filterPremium || filterCompatible

  async function likeUser(targetId: number) {
    const isLiked = likedUsers.has(targetId)
    setLikedUsers(prev => { const s = new Set(prev); isLiked ? s.delete(targetId) : s.add(targetId); return s })
    try {
      await authFetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) })
      if (!isLiked) toast.success('Liked! 💝', { icon: '❤️' })
    } catch { }
  }

  function clearFilters() {
    setFilterGender('0'); setFilterCity(''); setFilterCountry('')
    setFilterAgeMin(18); setFilterAgeMax(60); setFilterOnline(false); setFilterPremium(false); setFilterCompatible(false); setSearch('')
  }

  const nearbyCount = filtered.filter(u => u.city === myCity || u.country === myCountry).length
  const boostedCount = filtered.filter(u => u.isBoosted).length

  return (
    <div className="page-container">
      {/* Boost promo banner */}
      {boostedCount === 0 && (
        <Link href="/boost" className="flex items-center gap-3 p-3 rounded-2xl mb-4 cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Boost your profile!</p>
            <p className="text-white/70 text-xs">Appear at the top of discovery for 10x more views</p>
          </div>
          <span className="text-white/80 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-lg">Try it →</span>
        </Link>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="input-field pl-9 py-2.5" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 font-medium text-sm transition-all flex-shrink-0 relative ${showFilters || hasActiveFilters ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <SlidersHorizontal size={16} />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 rounded-full text-white text-[10px] flex items-center justify-center">!</span>}
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-4 mb-5 border border-gray-100 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Gender</label>
              <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="input-field py-2 text-sm">
                <option value="0">All Genders</option>
                <option value="1">Men</option>
                <option value="2">Women</option>
                <option value="3">Non-binary</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Location</label>
              <LocationAutocomplete
                value={filterCity}
                onChange={(city, country) => { setFilterCity(city); setFilterCountry(country) }}
                placeholder="Any city..."
                className="py-2 text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Age Range: {filterAgeMin} – {filterAgeMax}</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input type="range" min={18} max={80} value={filterAgeMin} onChange={e => setFilterAgeMin(+e.target.value)} className="w-full accent-brand-500" />
                </div>
                <span className="text-gray-400 text-xs">–</span>
                <div className="flex-1">
                  <input type="range" min={18} max={80} value={filterAgeMax} onChange={e => setFilterAgeMax(+e.target.value)} className="w-full accent-brand-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterOnline} onChange={e => setFilterOnline(e.target.checked)} className="rounded w-3.5 h-3.5 accent-brand-500" />
                <span className="text-xs text-gray-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Online now
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterPremium} onChange={e => setFilterPremium(e.target.checked)} className="rounded w-3.5 h-3.5 accent-brand-500" />
                <span className="text-xs text-gray-600">👑 VIP only</span>
              </label>
              {myInterests.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterCompatible} onChange={e => setFilterCompatible(e.target.checked)} className="rounded w-3.5 h-3.5 accent-brand-500" />
                  <span className="text-xs text-gray-600 flex items-center gap-1">💞 Compatible only</span>
                </label>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:text-brand-600 transition-colors">
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Context banners */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {myCity && nearbyCount > 0 && !filterCity && (
          <div className="flex items-center gap-1.5 bg-brand-50 text-brand-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <MapPin size={12} /> <span><strong>{nearbyCount}</strong> near {myCity}</span>
          </div>
        )}
        {boostedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 text-xs font-medium px-3 py-1.5 rounded-full">
            <Zap size={12} className="fill-orange-500" /> <span><strong>{boostedCount}</strong> boosted profile{boostedCount > 1 ? 's' : ''}</span>
          </div>
        )}
        {myInterests.length > 0 && (
          <div className="flex items-center gap-1.5 bg-purple-50 text-purple-600 text-xs font-medium px-3 py-1.5 rounded-full">
            💞 Sorted by compatibility
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-brand-500" />
            <span className="text-sm text-gray-400">Finding members...</span>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {filtered.map((u: any) => {
              const isNearby = u.city === myCity || u.country === myCountry
              const isBoosted = !!u.isBoosted
              const compat = u._compat as number
              const showCompat = compat > 0 && !isOwnCard(u.id, userId)
              return (
                /* Card IS the aspect-ratio box — nothing can cause grey space below */
                <div key={u.id}
                  className={`group relative rounded-2xl overflow-hidden bg-gray-200 cursor-pointer ${isBoosted ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
                  style={{ aspectRatio: '3/4' }}
                  onClick={e => { if (!(e.target as Element).closest('button,a')) setLocation(profileUrl(u)) }}>
                  {/* Photo — use large first, fall back to thumb; object-center centers the crop */}
                  <img src={getPhotoUrl(u.photo || u.photoThumb)} alt={u.name}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
                  {/* Dark gradient at bottom */}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />
                  {/* Top-left badge */}
                  {isBoosted && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                      <Zap size={8} className="fill-white" /> BOOST
                    </div>
                  )}
                  {!isBoosted && showCompat && (
                    <div className={`absolute top-2 left-2 z-10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow ${compat >= 70 ? 'bg-green-500' : compat >= 40 ? 'bg-brand-500' : 'bg-gray-500'}`}>
                      {compat}%
                    </div>
                  )}
                  {!isBoosted && !showCompat && isNearby && !filterCity && (
                    <div className="absolute top-2 left-2 z-10 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <MapPin size={8} /> Near
                    </div>
                  )}
                  {/* Top-right badges */}
                  {(onlineUserIds.has(u.id) || isOnline(u.lastAccess)) && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                  )}
                  {u.premium === 1 && !(onlineUserIds.has(u.id) || isOnline(u.lastAccess)) && (
                    <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-sm text-white rounded-full p-1">
                      <Crown size={9} />
                    </div>
                  )}
                  {/* Name overlay — pinned to bottom of card */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 z-10">
                    <div className="flex items-center gap-0.5">
                      <span className="text-white text-xs font-bold truncate leading-tight drop-shadow-sm">{u.name}</span>
                      {u.verified === 1 && <BadgeCheck size={10} className="text-blue-300 flex-shrink-0" />}
                    </div>
                    <div className="text-white/75 text-[10px] flex items-center gap-0.5 mt-0.5 truncate">
                      <span>{u.age}y</span>
                      {u.city && <><span>·</span><span className="truncate">{u.city}</span></>}
                    </div>
                  </div>
                  {/* Hover buttons */}
                  <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-all z-20 flex gap-1.5 bg-gradient-to-t from-black/60 to-transparent pt-8">
                    <button onClick={e => { e.stopPropagation(); likeUser(u.id) }}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${likedUsers.has(u.id) ? 'bg-brand-500 text-white' : 'bg-white/90 text-brand-500 hover:bg-brand-500 hover:text-white'}`}>
                      <Heart size={11} className={likedUsers.has(u.id) ? 'fill-white' : ''} /> Like
                    </button>
                    <Link href={`/chat/${u.id}`} onClick={e => e.stopPropagation()}
                      className="flex items-center justify-center px-2.5 bg-white/90 hover:bg-blue-500 hover:text-white text-blue-500 rounded-lg transition-colors">
                      <MessageCircle size={13} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No members found</h2>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn-primary text-sm py-2 px-5">Clear all filters</button>
              )}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-center text-sm text-gray-400 mt-8">
              Showing <span className="font-medium text-gray-600">{filtered.length}</span> members
            </p>
          )}
        </>
      )}

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-all"
          aria-label="Scroll to top"
        >
          <ChevronUp size={18} />
        </button>
      )}
    </div>
  )
}

function isOwnCard(cardUserId: number, myUserId: number) {
  return cardUserId === myUserId
}


