import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { getPhotoUrl, timeAgo, isOnline } from '../lib/utils'
import { Heart, Star, MessageCircle, BadgeCheck, Crown, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const TABS = ['Matches', 'Liked Me', 'I Liked']

export default function LikesPage() {
  const [tab, setTab] = useState('Matches')
  const [data, setData] = useState<{ likedMe: any[]; iLiked: any[]; matches: any[] }>({ likedMe: [], iLiked: [], matches: [] })
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch('/api/likes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  const list = tab === 'Matches' ? data.matches : tab === 'Liked Me' ? data.likedMe : data.iLiked

  const tabCounts = {
    Matches: data.matches.length,
    'Liked Me': data.likedMe.length,
    'I Liked': data.iLiked.length,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="section-title mb-6">Likes & Matches</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all relative ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {tabCounts[t as keyof typeof tabCounts] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === t ? 'bg-brand-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                {tabCounts[t as keyof typeof tabCounts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[3/4] bg-gray-200 rounded-2xl mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20">
          {tab === 'Matches' ? (
            <>
              <div className="text-6xl mb-4">💝</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No matches yet</h2>
              <p className="text-gray-500 mb-6">When someone likes you back, they'll appear here</p>
              <Link href="/meet" className="btn-primary">Start Swiping</Link>
            </>
          ) : tab === 'Liked Me' ? (
            <>
              <div className="text-6xl mb-4">💕</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No likes yet</h2>
              <p className="text-gray-500">Complete your profile to attract more likes</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">❤️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">You haven't liked anyone yet</h2>
              <Link href="/discover" className="btn-primary">Browse Members</Link>
            </>
          )}
        </div>
      ) : (
        <>
          {tab === 'Matches' && (
            <p className="text-sm text-gray-500 mb-4">You have {data.matches.length} mutual match{data.matches.length !== 1 ? 'es' : ''}! Start a conversation 💬</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {list.map((item: any, i: number) => (
              <MatchCard key={i} item={item} tab={tab} token={token!} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MatchCard({ item, tab, token }: { item: any; tab: string; token: string }) {
  const user = item.user
  if (!user) return null

  return (
    <div className="card overflow-hidden group">
      <div className="relative aspect-[3/4]">
        <Link href={`/profile/${user.id}`}>
          <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {isOnline(user.lastAccess) && (
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
        )}
        {item.superlike === 1 && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-xs">
            <Star size={10} className="fill-white" /> Super
          </div>
        )}
        {tab === 'Matches' && (
          <div className="absolute top-2 left-2 bg-brand-500 text-white rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1">
            <Heart size={10} className="fill-white" /> Match
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="font-semibold text-sm truncate">{user.name}</p>
            {user.verified === 1 && <BadgeCheck size={13} className="text-blue-300 flex-shrink-0" />}
          </div>
          <p className="text-white/70 text-xs">{user.age}y · {user.city || user.country}</p>
        </div>
      </div>
      <div className="p-2 flex gap-2">
        <Link href={`/profile/${user.id}`}
          className="flex-1 text-center text-xs font-medium py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          Profile
        </Link>
        {tab === 'Matches' && (
          <Link href={`/chat/${user.id}`}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors">
            <MessageCircle size={13} /> Chat
          </Link>
        )}
      </div>
    </div>
  )
}
