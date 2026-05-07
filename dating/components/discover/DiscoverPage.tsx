'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { getPhotoUrl, isOnline, truncate } from '@/lib/utils'
import { Heart, MessageCircle, Search, SlidersHorizontal, BadgeCheck, Crown, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { userId: number; users: any[]; me: any }

export default function DiscoverPage({ userId, users, me }: Props) {
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('0')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState(18)
  const [filterAgeMax, setFilterAgeMax] = useState(99)
  const [showFilters, setShowFilters] = useState(false)
  const [likedUsers, setLikedUsers] = useState<Set<number>>(new Set())

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.city?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterGender !== '0' && String(u.gender) !== filterGender) return false
      if (filterCountry && u.country !== filterCountry) return false
      if (u.age < filterAgeMin || u.age > filterAgeMax) return false
      return true
    })
  }, [users, search, filterGender, filterCountry, filterAgeMin, filterAgeMax])

  const countries = useMemo(() => [...new Set(users.map(u => u.country).filter(Boolean))].sort(), [users])

  async function likeUser(targetId: number) {
    const isLiked = likedUsers.has(targetId)
    setLikedUsers(prev => { const s = new Set(prev); isLiked ? s.delete(targetId) : s.add(targetId); return s })
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) })
      if (!isLiked) toast.success('Liked! 💝', { icon: '❤️' })
    } catch { }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or city..."
            className="input-field pl-9 py-2.5"
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${showFilters ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <SlidersHorizontal size={16} /> Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Gender</label>
            <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="input-field py-2 text-sm">
              <option value="0">All</option>
              <option value="1">Men</option>
              <option value="2">Women</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Country</label>
            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="input-field py-2 text-sm">
              <option value="">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Min Age: {filterAgeMin}</label>
            <input type="range" min={18} max={80} value={filterAgeMin} onChange={e => setFilterAgeMin(+e.target.value)} className="w-full accent-brand-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Max Age: {filterAgeMax}</label>
            <input type="range" min={18} max={99} value={filterAgeMax} onChange={e => setFilterAgeMax(+e.target.value)} className="w-full accent-brand-500" />
          </div>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">{filtered.length} members found</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(user => (
          <div key={user.id} className="profile-card group relative">
            <Link href={`/profile/${user.id}`}>
              <div className="relative aspect-[3/4] overflow-hidden">
                <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="gradient-bottom absolute inset-0" />
                {isOnline(user.lastAccess) && (
                  <div className="absolute top-2 right-2 online-dot" />
                )}
                {user.premium === 1 && (
                  <div className="absolute top-2 left-2 bg-gold-500 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <Crown size={10} /> VIP
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-semibold text-sm">{user.name.split(' ')[0]}, {user.age}</span>
                    {user.verified === 1 && <BadgeCheck size={12} className="text-blue-300 fill-blue-300" />}
                  </div>
                  {user.city && (
                    <div className="flex items-center gap-1 text-xs text-white/80">
                      <MapPin size={10} /> {user.city}
                    </div>
                  )}
                </div>
              </div>
            </Link>
            <div className="p-2 flex gap-2">
              <button onClick={() => likeUser(user.id)}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${likedUsers.has(user.id) ? 'bg-brand-500 text-white' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>
                <Heart size={14} className={likedUsers.has(user.id) ? 'fill-white' : ''} />
              </button>
              <Link href={`/chat/${user.id}`}
                className="flex-1 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-all">
                <MessageCircle size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500 text-lg">No members found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          <button onClick={() => { setSearch(''); setFilterGender('0'); setFilterCountry('') }}
            className="btn-outline mt-4 text-sm">Clear Filters</button>
        </div>
      )}
    </div>
  )
}
