import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useWSEvent } from './useWebSocket'
import toast from 'react-hot-toast'
import { getPhotoUrl } from '../lib/utils'

export function useNotifications() {
  const { user, token } = useAuth()
  const [unread, setUnread] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)

  const fetchCounts = useCallback(() => {
    if (!token) return
    fetch('/api/notifications/count', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setUnread(d.unread || 0)
        setChatUnread(d.chatUnread || 0)
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!user || !token) return
    fetchCounts()
    const interval = setInterval(fetchCounts, 60000)
    return () => clearInterval(interval)
  }, [user, token, fetchCounts])

  // New chat message — show sender toast + increment count
  useWSEvent('new_message', (msg) => {
    setChatUnread(prev => prev + 1)
    if (msg.from) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-blue-100 p-3 flex items-center gap-3 max-w-xs`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-blue-200">
            <img src={getPhotoUrl(msg.from.photo)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">💬 {msg.from.name}</p>
            <p className="text-xs text-gray-500 truncate">{msg.message?.message || 'New message'}</p>
            <a href={`/chat/${msg.from.id}`} className="text-xs text-blue-500 font-medium">Open chat →</a>
          </div>
        </div>
      ), { duration: 5000 })
    }
  })

  // Like or superlike
  useWSEvent('liked', (msg) => {
    setUnread(prev => prev + 1)
    if (msg.fromUser) {
      const isSuperlike = !!msg.superlike
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-pink-100 p-3 flex items-center gap-3 max-w-xs`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-pink-200">
            <img src={getPhotoUrl(msg.fromUser.photo)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {isSuperlike ? '⭐ ' : '❤️ '}{msg.fromUser.name} {isSuperlike ? 'super liked you!' : 'liked you!'}
            </p>
            <a href={`/profile/${msg.fromUser.id}`} className="text-xs text-brand-500 font-medium">View profile</a>
          </div>
        </div>
      ), { duration: 4000 })
    }
  })

  // Profile view
  useWSEvent('profile_viewed', (msg) => {
    setUnread(prev => prev + 1)
    if (msg.visitor) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-gray-100 p-3 flex items-center gap-3 max-w-xs`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200">
            <img src={getPhotoUrl(msg.visitor.photo)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">👀 {msg.visitor.name} viewed your profile</p>
            <a href="/visitors" className="text-xs text-brand-500 font-medium">See all visitors</a>
          </div>
        </div>
      ), { duration: 4000 })
    }
  })

  // Match
  useWSEvent('matched', (msg) => {
    if (msg.otherUser) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-red-100 p-4 flex items-center gap-3 max-w-xs`}>
          <div className="text-3xl">💝</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">It's a Match!</p>
            <p className="text-xs text-gray-500">You and {msg.otherUser.name} liked each other</p>
            <a href={`/chat/${msg.otherUser.id}`} className="text-xs text-brand-500 font-medium">Start chatting</a>
          </div>
        </div>
      ), { duration: 6000 })
    }
  })

  // Gift received
  useWSEvent('gift', (msg) => {
    setUnread(prev => prev + 1)
    if (msg.from) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-amber-100 p-3 flex items-center gap-3 max-w-xs`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-amber-200">
            <img src={getPhotoUrl(msg.from.photo)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{msg.gift?.emoji} {msg.from.name} sent you a {msg.gift?.name}!</p>
            {msg.message && <p className="text-xs text-gray-500 truncate">"{msg.message}"</p>}
            <a href="/gifts" className="text-xs text-amber-600 font-medium">View gifts</a>
          </div>
        </div>
      ), { duration: 5000 })
    }
  })

  // Re-fetch counts on reconnect
  useWSEvent('__connected', fetchCounts)

  return { unread, chatUnread, setUnread, setChatUnread, refresh: fetchCounts }
}
