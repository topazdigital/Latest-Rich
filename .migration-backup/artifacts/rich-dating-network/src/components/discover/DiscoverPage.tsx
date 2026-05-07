import { useState, useMemo } from 'react'
import { Link } from 'wouter'
import { getPhotoUrl, isOnline, truncate } from '../../lib/utils'
import { Heart, MessageCircle, Search, SlidersHorizontal, BadgeCheck, Crown, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props { userId: number; users: any[]; }

export default function DiscoverPage({ userId, users }: Props) {
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('0')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(18)
  const [filterAgeMax, setFilterAgeMax] = useState(99)
  const [showFilters, setShowFilters] = useState(false)
  const [likedUsers, setLikedUsers] = useState<Set<number>>(new Set())
  const { token } = useAuth()

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.city?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterGender !== '0' && String(u.gender) !== filterGender) return false
      if (filterCountry && u.country !== filterCountry) return false
      if (u.age < filterAgeMin || u.age > filterAgeMax) return false
      return true
    })
  }, [users, search, filterGender, filterCountry, filterAgeMin, filterAgeMax])

  const countries = useMemo(() => [...new Set(users.map((u: any) => u.country).filter(Boolean))].sort(), [users])

  async function likeUser(targetId: number) {
    const isLiked = likedUsers.has(targetId)
    setLikedUsers(prev => { const s = new Set(prev); isLiked ? s.delete(targetId) : s.add(targetId); return s })
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId }) })
      if (!isLiked) toast.success('Liked! 💝', { icon: '❤️' })
    } catch { }
  }

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="input-field pl-9 py-2.5" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${showFilters ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Gender</label>
              <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="input-field py-2 text-sm">
                <option value="0">All</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
                <option value="3">Non-binary</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Country</label>
              <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="input-field py-2 text-sm">
                <option value="">All</option>
                {countries.map((c: any) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min Age: {filterAgeMin}</label>
              <input type="range" min={18} max={80} value={filterAgeMin} onChange={e => setFilterAgeMin(+e.target.value)} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Max Age: {filterAgeMax}</label>
              <input type="range" min={18} max={99} value={filterAgeMax} onChange={e => setFilterAgeMax(+e.target.value)} className="w-full" />
            </div>
          </div>
          {(filterGender !== '0' || filterCountry || filterAgeMin > 18 || filterAgeMax < 99) && (
            <button onClick={() => { setFilterGender('0'); setFilterCountry(''); setFilterAgeMin(18); setFilterAgeMax(99) }}
              className="flex items-center gap-1 text-sm text-brand-500 mt-3">
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((u: any) => (
          <div key={u.id} className="profile-card group">
            <div className="relative aspect-[3/4]">
              <img src={getPhotoUrl(u.photoThumb || u.photo)} alt={u.name} className="w-full h-full object-cover" />
              <div className="gradient-bottom absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              {isOnline(u.lastAccess) && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" />
              )}
              {u.premium === 1 && (
                <div className="absolute top-2 left-2 bg-amber-500 text-white rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                  <Crown size={9} />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button onClick={() => likeUser(u.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium ${likedUsers.has(u.id) ? 'bg-brand-500 text-white' : 'bg-white/90 text-brand-500'}`}>
                  <Heart size={12} className={likedUsers.has(u.id) ? 'fill-white' : ''} /> Like
                </button>
                <Link href={`/chat/${u.id}`}
                  className="flex items-center justify-center p-1.5 bg-white/90 rounded-lg">
                  <MessageCircle size={14} className="text-blue-500" />
                </Link>
              </div>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1">
                <Link href={`/profile/${u.id}`} className="text-sm font-semibold text-gray-900 hover:text-brand-500 truncate">{u.name}</Link>
                {u.verified === 1 && <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" />}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span>{u.age}y</span>
                {u.city && <><span>·</span><MapPin size={9} /><span className="truncate">{u.city}</span></>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No members found</h2>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      )}
    </div>
  )
}
