import { useState, useMemo, useEffect } from 'react'
import { Link } from 'wouter'
import { getPhotoUrl, isOnline, truncate } from '../../lib/utils'
import { Heart, MessageCircle, Search, SlidersHorizontal, BadgeCheck, Crown, MapPin, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import LocationAutocomplete from '../ui/LocationAutocomplete'
import { authFetch } from '../../lib/auth'

interface Props { userId: number; myCity?: string; myCountry?: string }

export default function DiscoverPage({ userId, myCity, myCountry }: Props) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterGender, setFilterGender] = useState('0')
  const [filterCity, setFilterCity] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(18)
  const [filterAgeMax, setFilterAgeMax] = useState(60)
  const [filterOnline, setFilterOnline] = useState(false)
  const [filterPremium, setFilterPremium] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [likedUsers, setLikedUsers] = useState<Set<number>>(new Set())
  const { token } = useAuth()

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

  useEffect(() => {
    fetchUsers()
  }, [filterGender, filterCity, filterCountry, filterAgeMin, filterAgeMax, filterOnline, filterPremium])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 400)
    return () => clearTimeout(timer)
  }, [search])

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filterPremium && u.premium !== 1) return false
      return true
    })
  }, [users, filterPremium])

  const hasActiveFilters = filterGender !== '0' || filterCity || filterCountry || filterAgeMin > 18 || filterAgeMax < 60 || filterOnline || filterPremium

  async function likeUser(targetId: number) {
    const isLiked = likedUsers.has(targetId)
    setLikedUsers(prev => { const s = new Set(prev); isLiked ? s.delete(targetId) : s.add(targetId); return s })
    try {
      await authFetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) })
      if (!isLiked) toast.success('Liked! 💝', { icon: '❤️' })
    } catch { }
  }

  function clearFilters() {
    setFilterGender('0')
    setFilterCity('')
    setFilterCountry('')
    setFilterAgeMin(18)
    setFilterAgeMax(60)
    setFilterOnline(false)
    setFilterPremium(false)
    setSearch('')
  }

  const nearbyCount = filtered.filter(u => u.city === myCity || u.country === myCountry).length

  return (
    <div className="page-container">
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
        <div className="card p-4 mb-5 border border-gray-100">
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
                onChange={(city, country) => {
                  setFilterCity(city)
                  setFilterCountry(country)
                }}
                placeholder="Any city..."
                className="py-2 text-sm"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block uppercase tracking-wide">Age Range: {filterAgeMin} – {filterAgeMax}</label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input type="range" min={18} max={80} value={filterAgeMin}
                    onChange={e => setFilterAgeMin(+e.target.value)}
                    className="w-full accent-brand-500" />
                </div>
                <span className="text-gray-400 text-xs">–</span>
                <div className="flex-1">
                  <input type="range" min={18} max={80} value={filterAgeMax}
                    onChange={e => setFilterAgeMax(+e.target.value)}
                    className="w-full accent-brand-500" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterOnline} onChange={e => setFilterOnline(e.target.checked)}
                  className="rounded w-3.5 h-3.5 accent-brand-500" />
                <span className="text-xs text-gray-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Online now
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterPremium} onChange={e => setFilterPremium(e.target.checked)}
                  className="rounded w-3.5 h-3.5 accent-brand-500" />
                <span className="text-xs text-gray-600">👑 VIP only</span>
              </label>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-brand-500 font-medium hover:text-brand-600 transition-colors">
                <X size={13} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Location context */}
      {myCity && nearbyCount > 0 && !filterCity && (
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-brand-500" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-brand-500">{nearbyCount}</span> members near <span className="font-medium">{myCity}</span> shown first
          </span>
        </div>
      )}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((u: any) => {
              const isNearby = u.city === myCity || u.country === myCountry
              return (
                <div key={u.id} className="profile-card group relative">
                  {isNearby && !filterCity && (
                    <div className="absolute top-2 right-2 z-10 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <MapPin size={8} /> Near
                    </div>
                  )}
                  <div className="relative aspect-[3/4]">
                    <img src={getPhotoUrl(u.photoThumb || u.photo)} alt={u.name}
                      className="w-full h-full object-cover"
                      loading="lazy" />
                    <div className="gradient-bottom absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isOnline(u.lastAccess) && (
                      <div className="absolute top-2 left-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                    )}
                    {u.premium === 1 && !isNearby && (
                      <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-sm text-white rounded-full p-1">
                        <Crown size={9} />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 flex gap-1.5">
                      <button onClick={() => likeUser(u.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${likedUsers.has(u.id) ? 'bg-brand-500 text-white' : 'bg-white/90 text-brand-500 hover:bg-brand-500 hover:text-white'}`}>
                        <Heart size={11} className={likedUsers.has(u.id) ? 'fill-white' : ''} /> Like
                      </button>
                      <Link href={`/chat/${u.id}`}
                        className="flex items-center justify-center px-2 bg-white/90 hover:bg-blue-500 hover:text-white text-blue-500 rounded-lg transition-colors">
                        <MessageCircle size={13} />
                      </Link>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1">
                      <Link href={`/profile/${u.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-500 truncate">{u.name}</Link>
                      {u.verified === 1 && <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" />}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <span>{u.age}y</span>
                      {u.city && <><span>·</span><MapPin size={8} className="flex-shrink-0" /><span className="truncate">{u.city}</span></>}
                    </div>
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
                <button onClick={clearFilters} className="btn-primary text-sm py-2 px-5">
                  Clear all filters
                </button>
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
    </div>
  )
}
