import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useWSEvent } from './useWebSocket'
import { useLocation } from 'wouter'
import toast from 'react-hot-toast'
import { getPhotoUrl, profileUrl } from '../lib/utils'

// ── Sound engine using Web Audio API ──────────────────────────────────────────
function playChime(type: 'message' | 'like' | 'match' | 'visit' = 'message') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    const schedule: Array<{ freq: number; t: number; dur: number }> = {
      message: [
        { freq: 880, t: 0, dur: 0.15 },
        { freq: 1320, t: 0.12, dur: 0.18 },
      ],
      like: [
        { freq: 660, t: 0, dur: 0.1 },
        { freq: 880, t: 0.09, dur: 0.1 },
        { freq: 1100, t: 0.18, dur: 0.2 },
      ],
      match: [
        { freq: 523, t: 0, dur: 0.12 },
        { freq: 659, t: 0.11, dur: 0.12 },
        { freq: 784, t: 0.22, dur: 0.12 },
        { freq: 1047, t: 0.33, dur: 0.25 },
      ],
      visit: [
        { freq: 700, t: 0, dur: 0.1 },
        { freq: 900, t: 0.09, dur: 0.15 },
      ],
    }[type]

    schedule.forEach(({ freq, t, dur }) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + t)
      g.gain.setValueAtTime(0.22, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur)
      osc.connect(g)
      g.connect(ctx.destination)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + dur)
    })

    setTimeout(() => ctx.close(), 2000)
  } catch {}
}

// ── Browser push notification ──────────────────────────────────────────────────
function showPushNotification(title: string, body: string, url?: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'rdn-notification',
    })
    if (url) n.onclick = () => { window.focus(); window.location.href = url; n.close() }
  } catch {}
}

export function requestNotificationPermission() {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
}

// ── Main hook ──────────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user, token } = useAuth()
  const [location] = useLocation()
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
    // Request notification permission after a brief delay
    setTimeout(requestNotificationPermission, 3000)
    const interval = setInterval(fetchCounts, 60000)
    return () => clearInterval(interval)
  }, [user, token, fetchCounts])

  // Clear chat badge instantly when user navigates to any chat page
  useEffect(() => {
    if (location.startsWith('/chat')) {
      setChatUnread(0)
    }
  }, [location])

  // New chat message — sound + push notification + toast + badge
  useWSEvent('new_message', (msg) => {
    // Don't increment badge if user is already on a chat page
    if (!window.location.pathname.startsWith('/chat')) {
      setChatUnread(prev => prev + 1)
    }
    playChime('message')
    if (msg.from) {
      showPushNotification(
        `💬 ${msg.from.name}`,
        msg.message?.message || 'New message',
        `/chat/${msg.from.id}`
      )
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
    playChime('like')
    if (msg.fromUser) {
      const isSuperlike = !!msg.superlike
      showPushNotification(
        isSuperlike ? `⭐ ${msg.fromUser.name} super liked you!` : `❤️ ${msg.fromUser.name} liked you!`,
        'View their profile',
        profileUrl(msg.fromUser)
      )
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} bg-white shadow-xl rounded-2xl border border-pink-100 p-3 flex items-center gap-3 max-w-xs`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-pink-200">
            <img src={getPhotoUrl(msg.fromUser.photo)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/images/default-avatar.svg' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">
              {isSuperlike ? '⭐ ' : '❤️ '}{msg.fromUser.name} {isSuperlike ? 'super liked you!' : 'liked you!'}
            </p>
            <a href={profileUrl(msg.fromUser)} className="text-xs text-brand-500 font-medium">View profile</a>
          </div>
        </div>
      ), { duration: 4000 })
    }
  })

  // Profile view
  useWSEvent('profile_viewed', (msg) => {
    setUnread(prev => prev + 1)
    playChime('visit')
    if (msg.visitor) {
      showPushNotification(`👀 ${msg.visitor.name} viewed your profile`, 'See all visitors', '/visitors')
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
    playChime('match')
    if (msg.otherUser) {
      showPushNotification(`💝 It's a Match with ${msg.otherUser.name}!`, 'Start chatting now', `/chat/${msg.otherUser.id}`)
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
      showPushNotification(`${msg.gift?.emoji || '🎁'} ${msg.from.name} sent you a ${msg.gift?.name || 'gift'}!`, msg.message || '', '/gifts')
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
