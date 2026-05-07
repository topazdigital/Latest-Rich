'use client'
import { useState, useRef } from 'react'
import { getPhotoUrl, truncate } from '@/lib/utils'
import { Heart, X, Star, MapPin, Info, MessageCircle, BadgeCheck, Crown } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props { userId: number; users: any[] }

export default function MeetPage({ userId, users }: Props) {
  const [queue, setQueue] = useState(users)
  const [current, setCurrent] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const startX = useRef(0)
  const currentX = useRef(0)
  const [dragX, setDragX] = useState(0)
  const isDragging = useRef(false)

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
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: user.id }) })
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
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: user.id, superlike: true }) })
      toast.success('⭐ Super Liked!', { duration: 2000 })
    } catch {}
    setTimeout(() => { setSwipeDir(null); setCurrent(c => c + 1) }, 400)
  }

  if (!user || current >= queue.length) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">😊</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all caught up!</h2>
        <p className="text-gray-500 mb-6">Check back later for more matches</p>
        <Link href="/discover" className="btn-primary">Browse All Members</Link>
      </div>
    )
  }

  const rotation = dragX / 15
  const opacity = Math.max(0, 1 - Math.abs(dragX) / 300)

  return (
    <div className="min-h-[calc(100vh-7rem)] flex flex-col items-center justify-center px-4 py-4">
      <div className="w-full max-w-sm">
        {/* Card stack */}
        <div className="relative h-[520px]">
          {/* Background cards */}
          {queue[current + 1] && (
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gray-200 scale-95 -z-10">
              <img src={getPhotoUrl(queue[current + 1].photoThumb || queue[current + 1].photo)} alt="" className="w-full h-full object-cover opacity-60" />
            </div>
          )}

          {/* Main card */}
          <div
            className={`swipe-card transition-all select-none ${swipeDir === 'right' ? 'translate-x-full rotate-12 opacity-0' : swipeDir === 'left' ? '-translate-x-full -rotate-12 opacity-0' : ''}`}
            style={!swipeDir ? { transform: `translateX(${dragX}px) rotate(${rotation}deg)`, opacity } : {}}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
            <div className="gradient-bottom absolute inset-0" />

            {/* Like / Nope indicators */}
            {dragX > 30 && <div className="absolute top-8 left-8 border-4 border-green-400 text-green-400 text-3xl font-black px-3 py-1 rounded-xl rotate-[-15deg] opacity-90">LIKE</div>}
            {dragX < -30 && <div className="absolute top-8 right-8 border-4 border-red-400 text-red-400 text-3xl font-black px-3 py-1 rounded-xl rotate-[15deg] opacity-90">NOPE</div>}

            {/* User info */}
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold">{user.name.split(' ')[0]}, {user.age}</h2>
                    {user.verified === 1 && <BadgeCheck className="text-blue-300 fill-blue-300" size={20} />}
                    {user.premium === 1 && <Crown className="text-gold-400" size={18} />}
                  </div>
                  {user.city && (
                    <div className="flex items-center gap-1 text-white/80 text-sm">
                      <MapPin size={12} /> {user.city}{user.country ? `, ${user.country}` : ''}
                    </div>
                  )}
                  {!showInfo && user.bio && <p className="text-white/70 text-sm mt-1 line-clamp-2">{truncate(user.bio?.replace(/<[^>]*>/g, ''), 80)}</p>}
                </div>
                <button onClick={() => setShowInfo(!showInfo)} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Info size={18} />
                </button>
              </div>
              {showInfo && user.bio && (
                <p className="text-white/90 text-sm mt-3 leading-relaxed">{user.bio?.replace(/<[^>]*>/g, '').substring(0, 200)}</p>
              )}
            </div>
          </div>

          {/* Remaining count */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
            {queue.length - current} left
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button onClick={handlePass}
            className="w-14 h-14 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all text-gray-400 hover:text-red-400">
            <X size={26} />
          </button>
          <button onClick={handleSuperLike}
            className="w-12 h-12 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all text-gray-400 hover:text-blue-500">
            <Star size={20} />
          </button>
          <button onClick={handleLike}
            className="w-14 h-14 rounded-full gradient-brand shadow-md flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all text-white">
            <Heart size={26} className="fill-white" />
          </button>
          <Link href={`/chat/${user.id}`}
            className="w-12 h-12 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center hover:scale-110 hover:shadow-lg transition-all text-gray-400 hover:text-brand-500">
            <MessageCircle size={20} />
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Swipe right to like · Swipe left to pass</p>
      </div>
    </div>
  )
}
