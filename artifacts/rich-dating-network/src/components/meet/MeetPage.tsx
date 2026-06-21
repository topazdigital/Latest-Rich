import { useState, useRef } from 'react'
import { getPhotoUrl, truncate, htmlDecode } from '../../lib/utils'
import { Heart, X, Star, MapPin, Info, MessageCircle, BadgeCheck, Crown } from 'lucide-react'
import { Link } from 'wouter'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props { userId: number; users: any[]; onRefresh?: () => void }

export default function MeetPage({ userId, users, onRefresh }: Props) {
  const [queue, setQueue] = useState(users)
  const [current, setCurrent] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const [dragX, setDragX] = useState(0)
  const isDragging = useRef(false)
  const { token } = useAuth()

  const user = queue[current]

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    currentX.current = e.touches[0].clientX
    setDragX(currentX.current - startX.current)
  }
  function handleTouchEnd() {
    if (!isDragging.current) return
    isDragging.current = false
    const diff = currentX.current - startX.current
    if (Math.abs(diff) > 80) {
      if (diff > 0) handleLike()
      else handlePass()
    } else {
      setDragX(0)
    }
  }

  async function handleLike() {
    setSwipeDir('right')
    setDragX(0)
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId: user.id }) })
      toast.success('💝 Liked!', { duration: 1500 })
    } catch {}
    setTimeout(() => { setSwipeDir(null); setCurrent(c => c + 1) }, 400)
  }

  async function handlePass() {
    setSwipeDir('left')
    setDragX(0)
    setTimeout(() => { setSwipeDir(null); setCurrent(c => c + 1) }, 400)
  }

  async function handleSuperLike() {
    setSwipeDir('right')
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId: user.id, superlike: true }) })
      toast.success('⭐ Super Liked!', { duration: 2000 })
    } catch {}
    setTimeout(() => { setSwipeDir(null); setCurrent(c => c + 1) }, 400)
  }

  if (!user || current >= queue.length) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">😊</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all caught up!</h2>
        <p className="text-gray-500 mb-6">You've seen everyone in your area. Check back soon for new members.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {onRefresh && (
            <button onClick={onRefresh} className="btn-primary">
              🔄 Load More
            </button>
          )}
          <Link href="/discover" className="btn-secondary">Browse All Members</Link>
        </div>
      </div>
    )
  }

  const rotation = dragX / 15
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 300)

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center px-4 py-4">
      <div className="w-full max-w-sm">
        <div className="relative h-[520px]">
          {queue[current + 1] && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gray-200 scale-95 -z-10">
              <img src={getPhotoUrl(queue[current + 1].photoThumb || queue[current + 1].photo)} alt="" className="w-full h-full object-cover opacity-60" />
            </div>
          )}

          <div
            className={`swipe-card transition-all select-none ${swipeDir === 'right' ? 'translate-x-full rotate-12 opacity-0' : swipeDir === 'left' ? '-translate-x-full -rotate-12 opacity-0' : ''}`}
            style={!swipeDir ? { transform: `translateX(${dragX}px) rotate(${rotation}deg)`, opacity } : {}}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {dragX > 60 && <div className="absolute top-10 left-6 rotate-[-20deg] border-4 border-brand-500 text-brand-500 text-2xl font-black px-4 py-1 rounded-xl bg-white/90">LIKE 💝</div>}
            {dragX < -60 && <div className="absolute top-10 right-6 rotate-[20deg] border-4 border-gray-400 text-gray-600 text-2xl font-black px-4 py-1 rounded-xl bg-white/90">NOPE ✗</div>}

            <div className="absolute top-4 right-4 flex gap-2">
              {user.premium === 1 && <div className="bg-amber-500 text-white rounded-full px-2 py-1 flex items-center gap-1 text-xs"><Crown size={11} /> VIP</div>}
              {user.verified === 1 && <div className="bg-blue-500 text-white rounded-full px-2 py-1 flex items-center gap-1 text-xs"><BadgeCheck size={11} /> Verified</div>}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{user.name}, {user.age}</h2>
                  {user.city && <div className="flex items-center gap-1 text-white/80 text-sm mt-1"><MapPin size={14} />{user.city}, {user.country}</div>}
                </div>
                <button onClick={() => setShowInfo(!showInfo)} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Info size={20} />
                </button>
              </div>
              {showInfo && user.bio && (
                <p className="mt-2 text-sm text-white/90 leading-relaxed">{truncate(htmlDecode(user.bio), 150)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center gap-6 mt-6">
          <button onClick={handlePass} className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100 hover:scale-110 transition-transform active:scale-95">
            <X size={26} className="text-gray-500" />
          </button>
          <button onClick={handleSuperLike} className="w-12 h-12 bg-blue-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
            <Star size={22} className="text-white fill-white" />
          </button>
          <button onClick={handleLike} className="w-14 h-14 bg-brand-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
            <Heart size={26} className="text-white fill-white" />
          </button>
          <Link href={`/chat/${user.id}`} className="w-12 h-12 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95">
            <MessageCircle size={22} className="text-white" />
          </Link>
        </div>

      </div>
    </div>
  )
}
