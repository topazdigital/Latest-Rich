import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'wouter'
import { MessageSquare, Lock, Unlock, Send, RefreshCw, LogOut, Shield, Users, Clock, Search, ChevronLeft, Loader2, AlertCircle, Check, Bell, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { getStoredAuth, clearStoredAuth } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

async function subscribeToPush(token: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.error('Push notifications not supported in this browser')
      return false
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      toast.error('Notification permission denied')
      return false
    }

    const vapidRes = await fetch('/api/moderator/push/vapid-key', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!vapidRes.ok) throw new Error('Failed to get VAPID key')
    const { publicKey } = await vapidRes.json()

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const subJson = sub.toJSON()
    const res = await fetch('/api/moderator/push/subscribe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(subJson),
    })
    if (!res.ok) throw new Error('Failed to save subscription')
    return true
  } catch (err: any) {
    console.error('Push subscribe error:', err)
    toast.error(err.message || 'Failed to enable notifications')
    return false
  }
}

async function unsubscribeFromPush(token: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await fetch('/api/moderator/push/unsubscribe', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      })
    }
    return true
  } catch (err) {
    return false
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr
}

function usePushState(token: string | null) {
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription()
    ).then(sub => {
      setPushEnabled(!!sub && Notification.permission === 'granted')
    }).catch(() => {})
  }, [])

  async function togglePush() {
    if (!token) return
    setPushLoading(true)
    if (pushEnabled) {
      const ok = await unsubscribeFromPush(token)
      if (ok) { setPushEnabled(false); toast.success('Notifications disabled') }
    } else {
      const ok = await subscribeToPush(token)
      if (ok) { setPushEnabled(true); toast.success('Notifications enabled! You\'ll be alerted when messages arrive.') }
    }
    setPushLoading(false)
  }

  return { pushEnabled, pushLoading, togglePush }
}

function authFetch(url: string, options: RequestInit = {}) {
  const { token } = getStoredAuth()
  return fetch(url, {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}

interface ConvUser { id: number; name: string; photo: string }
interface ConvLock { moderatorId: number; moderatorName: string; lockedAt: number; expiresAt: number }
interface Conversation {
  key: string
  fakeUser: ConvUser
  realUser: ConvUser
  lastMessage: string
  lastTime: number
  msgCount: number
  lock: ConvLock | null
}
interface Message {
  id: number; u1: number; u2: number; message: string; time: number; read: number
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ photo, name, size = 40 }: { photo: string; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const style = { width: size, height: size, fontSize: size * 0.4 }
  if (photo && !err) {
    return (
      <img src={photo.startsWith('http') ? photo : `/api/uploads/${photo}`}
        alt={name} style={style}
        className="rounded-full object-cover shrink-0 bg-gray-100"
        onError={() => setErr(true)} />
    )
  }
  return (
    <div style={style}
      className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shrink-0">
      {initials}
    </div>
  )
}

function ConvItem({ conv, selected, myUserId, onClick }: {
  conv: Conversation; selected: boolean; myUserId: number; onClick: () => void
}) {
  const isLockedByMe = conv.lock?.moderatorId === myUserId
  const isLockedByOther = conv.lock && conv.lock.moderatorId !== myUserId
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 border-b border-gray-100 transition-colors ${selected ? 'bg-brand-50 border-l-2 border-l-brand-500' : 'hover:bg-gray-50'}`}>
      <div className="relative shrink-0">
        <Avatar photo={conv.fakeUser.photo} name={conv.fakeUser.name} size={38} />
        <div className="absolute -bottom-1 -right-1">
          <Avatar photo={conv.realUser.photo} name={conv.realUser.name} size={22} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-gray-900 truncate">{conv.fakeUser.name} → {conv.realUser.name}</span>
          <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(conv.lastTime)}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage || '—'}</p>
        <div className="flex items-center gap-1 mt-1">
          {isLockedByMe && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
              <Lock size={8} /> Locked by you
            </span>
          )}
          {isLockedByOther && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
              <Lock size={8} /> {conv.lock!.moderatorName}
            </span>
          )}
          <span className="text-[10px] text-gray-400">{conv.msgCount} msgs</span>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ msg, fakeUserId, users }: { msg: Message; fakeUserId: number; users: Record<string, ConvUser> }) {
  const isByFake = msg.u1 === fakeUserId
  const sender = users[String(msg.u1)]
  return (
    <div className={`flex gap-2 ${isByFake ? 'justify-end' : 'justify-start'}`}>
      {!isByFake && <Avatar photo={sender?.photo || ''} name={sender?.name || '?'} size={28} />}
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
        isByFake
          ? 'bg-brand-500 text-white rounded-br-sm'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
      }`}>
        <p>{msg.message}</p>
        <p className={`text-[10px] mt-1 ${isByFake ? 'text-white/60' : 'text-gray-400'}`}>{timeAgo(msg.time)}</p>
      </div>
      {isByFake && <Avatar photo={sender?.photo || ''} name={sender?.name || '?'} size={28} />}
    </div>
  )
}

export default function ModeratorPage() {
  const [, setLocation] = useLocation()
  const { user, token } = useAuth()
  const { pushEnabled, pushLoading, togglePush } = usePushState(token)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgUsers, setMsgUsers] = useState<Record<string, ConvUser>>({})
  const [replyText, setReplyText] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(false)
  const [sendingReply, setSendingReply] = useState(false)
  const [locking, setLocking] = useState(false)
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ activeLocks: 0, totalConversations: 0 })
  const [filter, setFilter] = useState<'all' | 'mine' | 'available'>('all')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const myUserId = user?.id || 0

  const loadConversations = useCallback(async () => {
    try {
      const r = await authFetch('/api/moderator/conversations')
      if (!r.ok) return
      const d = await r.json()
      setConversations(d.conversations || [])
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const r = await authFetch('/api/moderator/stats')
      if (!r.ok) return
      const d = await r.json()
      setStats(d)
    } catch {}
  }, [])

  useEffect(() => {
    async function init() {
      setLoadingConvs(true)
      await Promise.all([loadConversations(), loadStats()])
      setLoadingConvs(false)
    }
    init()
    pollRef.current = setInterval(() => { loadConversations(); loadStats() }, 15000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadConversations, loadStats])

  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const prev = prevMsgCountRef.current
    const curr = messages.length
    // Only auto-scroll to bottom when new messages arrive at the end, not when loading older ones
    if (curr > prev && messages[curr - 1]?.id !== messages[prev > 0 ? prev - 1 : 0]?.id) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMsgCountRef.current = curr
  }, [messages])

  async function loadMessages(conv: Conversation) {
    setLoadingMsgs(true)
    setHasOlder(false)
    try {
      const r = await authFetch(`/api/moderator/conversations/${conv.key}/messages`)
      if (!r.ok) return
      const d = await r.json()
      const msgs: Message[] = d.messages || []
      setMessages(msgs)
      setMsgUsers(d.users || {})
      setHasOlder(msgs.length === 100)
    } catch {}
    finally { setLoadingMsgs(false) }
  }

  async function loadOlderMessages() {
    if (!selectedConv || loadingOlder || !hasOlder || messages.length === 0) return
    const oldestId = messages[0].id
    setLoadingOlder(true)
    try {
      const r = await authFetch(`/api/moderator/conversations/${selectedConv.key}/messages?beforeId=${oldestId}`)
      if (!r.ok) return
      const d = await r.json()
      const older: Message[] = d.messages || []
      if (older.length === 0) { setHasOlder(false); return }
      const container = messagesContainerRef.current
      const prevScrollHeight = container?.scrollHeight ?? 0
      setMessages(prev => [...older, ...prev])
      setHasOlder(older.length === 100)
      // Restore scroll position so the view doesn't jump
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - prevScrollHeight
        }
      })
    } catch {}
    finally { setLoadingOlder(false) }
  }

  function handleMessagesScroll() {
    const container = messagesContainerRef.current
    if (!container) return
    if (container.scrollTop < 80) {
      loadOlderMessages()
    }
  }

  function selectConv(conv: Conversation) {
    setSelectedConv(conv)
    setReplyText('')
    loadMessages(conv)

    if (keepAliveRef.current) clearInterval(keepAliveRef.current)
    if (conv.lock?.moderatorId === myUserId) {
      keepAliveRef.current = setInterval(() => {
        authFetch(`/api/moderator/conversations/${conv.key}/keepalive`, { method: 'POST' }).catch(() => {})
      }, 2 * 60 * 1000)
    }
  }

  useEffect(() => {
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current) }
  }, [])

  async function lockConv() {
    if (!selectedConv) return
    setLocking(true)
    try {
      const r = await authFetch(`/api/moderator/conversations/${selectedConv.key}/lock`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Could not lock'); return }
      toast.success('Conversation locked — you can now reply')
      await loadConversations()
      const updated = conversations.find(c => c.key === selectedConv.key)
      if (updated) setSelectedConv({ ...updated, lock: { moderatorId: myUserId, moderatorName: user?.name || 'You', lockedAt: Date.now() / 1000, expiresAt: d.expiresAt } })
      if (keepAliveRef.current) clearInterval(keepAliveRef.current)
      keepAliveRef.current = setInterval(() => {
        authFetch(`/api/moderator/conversations/${selectedConv.key}/keepalive`, { method: 'POST' }).catch(() => {})
      }, 2 * 60 * 1000)
    } catch { toast.error('Failed to lock') }
    finally { setLocking(false) }
  }

  async function unlockConv() {
    if (!selectedConv) return
    setLocking(true)
    try {
      const r = await authFetch(`/api/moderator/conversations/${selectedConv.key}/unlock`, { method: 'POST' })
      if (!r.ok) { toast.error('Could not unlock'); return }
      toast.success('Conversation unlocked')
      if (keepAliveRef.current) clearInterval(keepAliveRef.current)
      await loadConversations()
      setSelectedConv(c => c ? { ...c, lock: null } : null)
    } catch { toast.error('Failed to unlock') }
    finally { setLocking(false) }
  }

  async function sendReply() {
    if (!selectedConv || !replyText.trim()) return
    if (selectedConv.lock?.moderatorId !== myUserId) {
      toast.error('Lock this conversation first before replying')
      return
    }
    setSendingReply(true)
    try {
      const r = await authFetch(`/api/moderator/conversations/${selectedConv.key}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || 'Failed to send'); return }
      setMessages(prev => [...prev, d.message])
      setReplyText('')
      await loadConversations()
    } catch { toast.error('Failed to send') }
    finally { setSendingReply(false) }
  }

  function handleLogout() {
    clearStoredAuth()
    setLocation('/login')
  }

  const fakeUserId = selectedConv
    ? (msgUsers[String(selectedConv.fakeUser.id)]?.id ?? selectedConv.fakeUser.id)
    : 0

  const isLockedByMe = selectedConv?.lock?.moderatorId === myUserId
  const isLockedByOther = selectedConv?.lock && selectedConv.lock.moderatorId !== myUserId

  const filteredConvs = conversations.filter(c => {
    const matchesSearch = search === '' ||
      c.fakeUser.name.toLowerCase().includes(search.toLowerCase()) ||
      c.realUser.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage?.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'mine') return c.lock?.moderatorId === myUserId
    if (filter === 'available') return !c.lock
    return true
  })

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left sidebar — full screen on mobile when no conv selected, hidden when conv open */}
      <div className={`${selectedConv ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 bg-white border-r border-gray-200 flex-col shrink-0`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">Moderator Panel</h1>
                <p className="text-xs text-gray-400">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(user?.admin ?? 0) >= 2 && (
                <a href="/admin" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Admin Panel">
                  <Users size={15} />
                </a>
              )}
              <button
                onClick={togglePush}
                disabled={pushLoading}
                title={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
                className={`p-1.5 rounded-lg transition-colors ${pushEnabled ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                {pushLoading ? <Loader2 size={15} className="animate-spin" /> : pushEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
              <button onClick={() => { loadConversations(); loadStats() }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw size={15} />
              </button>
              <button onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-gray-900">{stats.totalConversations}</div>
              <div className="text-[10px] text-gray-500">Total Chats</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-2 text-center">
              <div className="text-lg font-bold text-orange-600">{stats.activeLocks}</div>
              <div className="text-[10px] text-orange-500">Active Locks</div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'mine', 'available'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg capitalize transition-colors ${filter === f ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f === 'mine' ? 'My Locks' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-brand-500" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare size={32} className="text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">{search ? 'No matches found' : 'No conversations yet'}</p>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConvItem key={conv.key} conv={conv} selected={selectedConv?.key === conv.key}
                myUserId={myUserId} onClick={() => selectConv(conv)} />
            ))
          )}
        </div>
      </div>

      {/* Main area — full screen on mobile when conv selected, hidden otherwise */}
      <div className={`${selectedConv ? 'flex' : 'hidden lg:flex'} flex-1 flex-col overflow-hidden`}>
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Select a conversation</h2>
            <p className="text-sm text-gray-400 max-w-xs">Choose a conversation from the left to start moderating. Lock it to reply as the fake user.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <button onClick={() => setSelectedConv(null)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative shrink-0">
                  <Avatar photo={selectedConv.fakeUser.photo} name={selectedConv.fakeUser.name} size={36} />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-pink-400 flex items-center justify-center text-[8px] text-white font-bold">F</div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{selectedConv.fakeUser.name}</p>
                  <p className="text-xs text-gray-400">chatting with <strong className="text-gray-600">{selectedConv.realUser.name}</strong></p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Lock status indicator */}
                {isLockedByMe && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    <Lock size={11} /> Your lock
                  </span>
                )}
                {isLockedByOther && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-1 rounded-full">
                    <Lock size={11} /> {selectedConv.lock!.moderatorName}
                  </span>
                )}
                {!selectedConv.lock && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                    <Unlock size={11} /> Available
                  </span>
                )}

                {/* Lock/Unlock button */}
                {isLockedByMe ? (
                  <button onClick={unlockConv} disabled={locking}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
                    {locking ? <Loader2 size={11} className="animate-spin" /> : <Unlock size={11} />}
                    Release
                  </button>
                ) : !selectedConv.lock ? (
                  <button onClick={lockConv} disabled={locking}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600 transition-colors">
                    {locking ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
                    Lock & Reply
                  </button>
                ) : null}

                <button onClick={() => loadMessages(selectedConv)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* Lock expiry bar */}
            {isLockedByMe && selectedConv.lock && (
              <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2">
                <Clock size={12} className="text-green-500" />
                <span className="text-xs text-green-700">
                  Lock expires: {new Date(selectedConv.lock.expiresAt * 1000).toLocaleTimeString()} — auto-extends when you reply
                </span>
              </div>
            )}

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
            >
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-brand-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare size={28} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No messages yet in this conversation</p>
                </div>
              ) : (
                <>
                  {loadingOlder && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 size={16} className="animate-spin text-brand-500" />
                    </div>
                  )}
                  {!loadingOlder && hasOlder && (
                    <div className="flex justify-center">
                      <button
                        onClick={loadOlderMessages}
                        className="text-xs text-brand-500 hover:text-brand-600 py-1 px-3 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Load older messages
                      </button>
                    </div>
                  )}
                  {messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} fakeUserId={selectedConv.fakeUser.id} users={msgUsers} />
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply box */}
            <div className="bg-white border-t border-gray-200 p-3">
              {!isLockedByMe && (
                <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle size={13} className="text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-700">
                    {isLockedByOther
                      ? `Locked by ${selectedConv.lock!.moderatorName}. You cannot reply.`
                      : 'Lock this conversation first to reply as the fake user.'}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-2.5 flex items-center gap-1.5">
                    <Avatar photo={selectedConv.fakeUser.photo} name={selectedConv.fakeUser.name} size={18} />
                    <span className="text-xs text-gray-400 font-medium">as {selectedConv.fakeUser.name}</span>
                  </div>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    disabled={!isLockedByMe || sendingReply}
                    placeholder={isLockedByMe ? 'Type a reply as the fake user… (Enter to send)' : 'Lock this conversation to reply'}
                    rows={2}
                    className="w-full pt-8 pb-2 px-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                  />
                </div>
                <button onClick={sendReply}
                  disabled={!isLockedByMe || !replyText.trim() || sendingReply}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
