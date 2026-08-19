import { useState, useEffect, useRef, useCallback } from 'react'
import { getPhotoUrl, isOnline, timeAgo, profileUrl } from '../../lib/utils'
import { Link } from 'wouter'
import { ArrowLeft, Send, BadgeCheck, Crown, Smile, Gift, Check, CheckCheck, Wifi, WifiOff, Paperclip, X, Volume2, ChevronDown, Video } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket, useWSEvent } from '../../hooks/useWebSocket'
import FeedbackPrompt from '../engagement/FeedbackPrompt'
import PaidVideoCallModal from '../common/PaidVideoCallModal'

const QUICK_EMOJIS = ['😊', '❤️', '😍', '😂', '🔥', '👋', '💝', '😘', '🥰', '💕', '✨', '🌹', '😏', '🤩', '💋', '😇']

const CONTACT_INFO_PATTERN = /(\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d[\d\s().-]{6,}\d\b|\b(instagram|whatsapp|telegram|snapchat|facebook|twitter|tiktok|wechat|line|viber|signal)\b|@\w{3,}|https?:\/\/|www\.)/i

interface Message {
  id: number
  u1: number
  u2: number
  message: string
  time: number
  read: number
  mediaUrl?: string
  mediaType?: string
  _sending?: boolean
  _tempId?: string
  _localPreview?: string
}

interface Reaction {
  id: number
  fromId: number
  toId: number
  type: string
  time: number
  read: number
  _isReaction: true
  _sending?: boolean
  _tempId?: string
}

type ChatItem = Message | Reaction

function isReaction(item: ChatItem): item is Reaction {
  return (item as Reaction)._isReaction === true
}

interface Props { me: any; other: any; initialMessages: Message[] }

function MediaBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  const src = msg._localPreview || msg.mediaUrl || ""
  if (!src) return null
  if (msg.mediaType === "image") {
    return (
      <a href={msg.mediaUrl || src} target="_blank" rel="noopener noreferrer" className="block">
        <img src={src} alt="Photo" className="max-w-[240px] max-h-[320px] rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity" />
      </a>
    )
  }
  if (msg.mediaType === "video") {
    return (
      <video src={src} controls className="max-w-[240px] max-h-[320px] rounded-2xl bg-black" preload="metadata" />
    )
  }
  if (msg.mediaType === "audio") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${isMine ? 'bg-brand-500' : 'bg-white border border-gray-200'}`}>
        <Volume2 size={16} className={isMine ? 'text-white' : 'text-brand-500'} />
        <audio src={src} controls className="h-8 max-w-[180px]" preload="metadata" style={{ filter: isMine ? 'invert(1) brightness(2)' : 'none' }} />
      </div>
    )
  }
  return null
}

const REACTION_EMOJI: Record<string, string> = { wink: '😉', rose: '🌹', heart: '❤️' }

export default function ChatWindow({ me, other, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(isOnline(other.lastAccess))
  const [otherLastSeen, setOtherLastSeen] = useState(other.lastAccess)
  const [credits, setCredits] = useState<number | null>(me.credits ?? null)
  const [creditCost, setCreditCost] = useState(10)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [pendingMedia, setPendingMedia] = useState<{ file: File; preview: string; type: string } | null>(null)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [icebreakers, setIcebreakers] = useState<string[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [activeCall, setActiveCall] = useState<{ sessionId: number; peer: any } | null>(null)
  const [startingCall, setStartingCall] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { token } = useAuth()
  const { connected, send } = useWebSocket()

  // Scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    if (distFromBottom < 200) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherTyping])

  // Show "scroll to bottom" button when user scrolls up in chat
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      setShowScrollBottom(distFromBottom > 150)
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // Fetch credit cost
  useEffect(() => {
    fetch('/api/chat/credit-cost', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCreditCost(d.cost || 10)).catch(() => {})
  }, [token])

  async function startVideoCall() {
    if (startingCall || me.fake === 1) return
    setStartingCall(true)
    try {
      const response = await fetch("/api/video-calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: other.id }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || "Could not start video call")
        return
      }
      setActiveCall({ sessionId: data.sessionId, peer: data.peer })
    } catch {
      toast.error("Could not start video call")
    } finally {
      setStartingCall(false)
    }
  }

  useEffect(() => {
    fetch(`/api/engagement/icebreakers/${other.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setIcebreakers(Array.isArray(d.prompts) ? d.prompts : [])).catch(() => {})
  }, [other.id, token])

  // Fetch reactions between the two users
  useEffect(() => {
    fetch(`/api/engagement/reactions/${other.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReactions(data.map((r: any) => ({ ...r, _isReaction: true as const })))
        }
      })
      .catch(() => {})
  }, [other.id, token])

  // Mark messages as read when opening chat
  useEffect(() => {
    send({ type: 'mark_read', fromUserId: other.id })
    // Mark any reactions from the other user as read
    fetch('/api/engagement/reactions/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fromId: other.id }),
    }).then(r => r.ok && setReactions(prev => prev.map(rx => rx.fromId === other.id ? { ...rx, read: 1 } : rx))).catch(() => {})
  }, [other.id])

  // WS: new message received
  useWSEvent('new_message', (msg) => {
    if (msg.message?.u1 !== other.id) return
    setMessages(prev => {
      if (prev.some(m => m.id === msg.message.id)) return prev
      return [...prev, msg.message]
    })
    send({ type: 'mark_read', fromUserId: other.id })
    // Update the other user's lastSeen so the header stays fresh
    const msgTime = msg.message?.time
    setOtherLastSeen(msgTime ? String(msgTime) : String(Math.floor(Date.now() / 1000)))
    setOtherOnline(true)
  }, [other.id])

  // WS: message sent confirmed (replace temp)
  useWSEvent('message_sent', (msg) => {
    setMessages(prev => prev.map(m =>
      (m as any)._tempId === msg.tempId ? { ...msg.message, read: 0 } : m
    ))
  })

  // WS: typing indicator
  useWSEvent('typing', (msg) => {
    if (msg.fromUserId !== other.id) return
    setOtherTyping(msg.typing)
    if (msg.typing) setTimeout(() => setOtherTyping(false), 4000)
  }, [other.id])

  // WS: messages read
  useWSEvent('messages_read', (msg) => {
    if (msg.byUserId !== other.id) return
    setMessages(prev => prev.map(m => m.u1 === me.id ? { ...m, read: 1 } : m))
  }, [other.id, me.id])

  // WS: incoming reaction (recipient sees it live)
  useWSEvent('reaction_received', (msg) => {
    if (msg.reaction?.fromId !== other.id) return
    setReactions(prev => {
      if (prev.some(r => r.id === msg.reaction.id)) return prev
      return [...prev, { ...msg.reaction, _isReaction: true as const }]
    })
    // Mark it read immediately since chat is open
    fetch('/api/engagement/reactions/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ fromId: other.id }),
    }).catch(() => {})
  }, [other.id, token])

  // WS: sender learns their reaction was seen
  useWSEvent('reaction_read', (msg) => {
    if (msg.byUserId !== other.id) return
    setReactions(prev => prev.map(r => r.fromId === me.id && r.toId === other.id ? { ...r, read: 1 } : r))
  }, [other.id, me.id])

  // WS: user online status
  useWSEvent('user_online', (msg) => {
    if (msg.userId === other.id) setOtherOnline(msg.online)
  }, [other.id])

  // WS: credits updated
  useWSEvent('credits_updated', (msg) => { setCredits(msg.credits) })

  // WS: error
  useWSEvent('error', (msg) => {
    if (msg.code === 'insufficient_credits') {
      toast.error('Not enough credits! Buy more to continue chatting.')
      if (msg.tempId) setMessages(prev => prev.filter(m => (m as any)._tempId !== msg.tempId))
    } else if (msg.code === 'contact_info_blocked') {
      if (msg.tempId) setMessages(prev => prev.filter(m => (m as any)._tempId !== msg.tempId))
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm bg-white shadow-xl rounded-2xl border border-amber-200 p-4 flex items-start gap-3`}>
          <div className="text-2xl">👑</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm mb-1">Premium Required</div>
            <p className="text-xs text-gray-500 mb-2">Sharing contact info, social handles, or links is a Premium-only feature.</p>
            <a href="/premium" className="inline-block text-xs font-bold text-white px-3 py-1.5 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>Upgrade Now</a>
          </div>
        </div>
      ), { duration: 5000 })
    }
  })

  // Fallback polling when WS not connected
  useEffect(() => {
    if (connected) return
    const interval = setInterval(() => {
      fetch(`/api/chat/${other.id}/messages`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (Array.isArray(data) && data.length > messages.length) setMessages(data)
        }).catch(() => {})
      // Also poll reactions so incoming reactions and read-status update without WS
      fetch(`/api/engagement/reactions/${other.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (Array.isArray(data)) {
            setReactions(data.map((r: any) => ({ ...r, _isReaction: true as const })))
          }
        }).catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [connected, other.id, token, messages.length])

  function handleTyping() {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      send({ type: 'typing_start', toUserId: other.id })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      send({ type: 'typing_stop', toUserId: other.id })
    }, 2000)
  }

  // ── Media file selection ──────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!e.target) return
    ;(e.target as HTMLInputElement).value = ""
    if (!file) return
    const mime = file.type
    const typeMap: Record<string, string> = {}
    if (mime.startsWith("image/")) typeMap[mime] = "image"
    else if (mime.startsWith("video/")) typeMap[mime] = "video"
    else if (mime.startsWith("audio/")) typeMap[mime] = "audio"
    const mediaType = typeMap[mime] || (mime.startsWith("image") ? "image" : mime.startsWith("video") ? "video" : "audio")
    if (!["image", "video", "audio"].includes(mediaType)) {
      toast.error("Unsupported file type. Please choose an image, video, or audio file.")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File too large. Maximum 50 MB allowed.")
      return
    }
    const preview = URL.createObjectURL(file)
    setPendingMedia({ file, preview, type: mediaType })
  }

  async function sendMessage(overrideText?: string) {
    const text = overrideText ?? input.trim()
    if ((!text && !pendingMedia) || sending || uploadingMedia) return
    setSending(true)

    // Stop typing
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) { isTypingRef.current = false; send({ type: 'typing_stop', toUserId: other.id }) }

    const tempId = `temp_${Date.now()}`
    let resolvedMediaUrl = ""
    let resolvedMediaType = ""

    // Upload media first if pending
    if (pendingMedia) {
      setUploadingMedia(true)
      const localPreview = pendingMedia.preview
      const localType = pendingMedia.type
      setPendingMedia(null)
      try {
        const formData = new FormData()
        formData.append("media", pendingMedia.file)
        const upRes = await fetch("/api/chat/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const upData = await upRes.json()
        if (!upRes.ok) throw new Error(upData.error || "Upload failed")
        resolvedMediaUrl = upData.url
        resolvedMediaType = upData.type
        // Optimistic message with local preview
        const tempMsg: Message = {
          id: Date.now(), u1: me.id, u2: other.id,
          message: text, time: Math.floor(Date.now() / 1000), read: 0,
          mediaUrl: resolvedMediaUrl, mediaType: resolvedMediaType,
          _localPreview: localPreview, _sending: true, _tempId: tempId,
        }
        setMessages(prev => [...prev, tempMsg])
      } catch (err: any) {
        setUploadingMedia(false)
        setSending(false)
        toast.error(err.message || "Upload failed")
        return
      }
      setUploadingMedia(false)
    } else {
      // Text-only optimistic message
      const tempMsg: Message = {
        id: Date.now(), u1: me.id, u2: other.id,
        message: text, time: Math.floor(Date.now() / 1000), read: 0,
        _sending: true, _tempId: tempId,
      }
      setMessages(prev => [...prev, tempMsg])
    }

    if (!overrideText) setInput('')

    // Try WebSocket first (text-only for now; media always uses REST)
    if (connected && !resolvedMediaUrl) {
      send({ type: 'chat_message', toUserId: other.id, message: text, tempId })
      setSending(false)
      return
    }

    // REST API
    try {
      const body: any = { toUserId: other.id, message: text }
      if (resolvedMediaUrl) { body.mediaUrl = resolvedMediaUrl; body.mediaType = resolvedMediaType }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        if (data.creditsNeeded) {
          toast.error(`Need ${data.creditsNeeded} credits. You have ${data.creditsHave}.`, { duration: 4000 })
        } else if (data.error === 'premium_required' || data.code === 'contact_info_blocked') {
          toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm bg-white shadow-xl rounded-2xl border border-amber-200 p-4 flex items-start gap-3`}>
              <div className="text-2xl">👑</div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-sm mb-1">Premium Required</div>
                <p className="text-xs text-gray-500 mb-2">Sharing contact info is a Premium feature.</p>
                <a href="/premium" className="inline-block text-xs font-bold text-white px-3 py-1.5 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>Upgrade Now</a>
              </div>
            </div>
          ), { duration: 5000 })
        } else {
          toast.error(data.error || 'Failed to send')
        }
        setMessages(prev => prev.filter(m => (m as any)._tempId !== tempId))
        if (!resolvedMediaUrl) setInput(text)
      } else {
        const data = await res.json()
        setMessages(prev => prev.map(m => (m as any)._tempId === tempId ? { ...data, read: 0 } : m))
        if (data.credits !== undefined) setCredits(data.credits)
        const myMessageCount = messages.filter(message => message.u1 === me.id).length + 1
        if (myMessageCount >= 5) {
          // rdn_feedback_done = permanent (rated or "never show again")
          if (!localStorage.getItem('rdn_feedback_done')) {
            const snoozed = parseInt(localStorage.getItem('rdn_feedback_snoozed') || '0', 10)
            const sevenDays = 7 * 24 * 60 * 60 * 1000
            if (!snoozed || Date.now() - snoozed > sevenDays) {
              setShowFeedback(true)
            }
          }
        }
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => (m as any)._tempId !== tempId))
      if (!resolvedMediaUrl) setInput(text)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-7.75rem)] md:h-[calc(100dvh-3.5rem)] max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
        <Link href="/chat" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="relative flex-shrink-0">
          <Link
            href={profileUrl(other)}
            className="block w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100 hover:ring-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-shadow"
            aria-label={`View ${other.name}'s profile`}
            title={`View ${other.name}'s profile`}
          >
            <img src={getPhotoUrl(other.photoThumb || other.photo)} alt={other.name} className="w-full h-full object-cover" />
          </Link>
          {otherOnline && <div className="online-dot absolute bottom-0 right-0" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={profileUrl(other)} className="font-semibold text-gray-900 hover:text-brand-500 truncate">{other.name}</Link>
            {other.verified === 1 && <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" />}
            {other.premium === 1 && <Crown size={14} className="text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400">
            {otherTyping ? <span className="text-brand-500 font-medium">typing...</span>
              : otherOnline ? <span className="text-green-500">Online now</span>
              : `Last seen ${timeAgo(otherLastSeen)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {me.fake !== 1 && (
            <button
              onClick={startVideoCall}
              disabled={startingCall}
              title="Start video call"
              aria-label={`Start video call with ${other.name}`}
              className="flex h-8 items-center gap-1.5 rounded-full bg-brand-50 px-2.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50"
            >
              {startingCall ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> : <Video size={15} />}
              <span className="hidden sm:inline">Call</span>
            </button>
          )}
          {credits !== null && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-xs font-semibold">
              <span>💳</span><span>{credits}</span>
            </div>
          )}
          <div title={connected ? 'Real-time connected' : 'Polling mode'}>
            {connected ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-gray-300" />}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50 relative">
        {messages.length === 0 && reactions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-400 text-sm">Say hello to {other.name}!</p>
            {creditCost > 0 && me.fake !== 1 && (
              <p className="text-xs text-gray-400 mt-1">{creditCost} credit per message</p>
            )}
          </div>
        )}

        {[
          ...messages.map(m => ({ ...m, _kind: 'message' as const, _sortTime: m.time })),
          ...reactions.map(r => ({ ...r, _kind: 'reaction' as const, _sortTime: r.time })),
        ].sort((a, b) => a._sortTime - b._sortTime).map((item) => {
          if (item._kind === 'reaction') {
            const rx = item as Reaction & { _kind: 'reaction'; _sortTime: number }
            const isMine = rx.fromId === me.id
            const isTemp = !!rx._sending
            const emoji = REACTION_EMOJI[rx.type] || '💝'
            const label = rx.type.charAt(0).toUpperCase() + rx.type.slice(1)
            return (
              <div key={rx._tempId || `rx_${rx.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!isMine && (
                  <Link href={profileUrl(other)} className="block w-7 h-7 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-brand-300 transition-shadow" aria-label={`View ${other.name}'s profile`}>
                    <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
                  </Link>
                )}
                <div className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-sm font-medium ${isTemp ? 'opacity-60' : ''} ${isMine ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-gray-200 text-gray-700'}`}>
                    <span className="text-lg leading-none">{emoji}</span>
                    <span>{isMine ? `You sent a ${label}` : `${other.name} sent you a ${label}`}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${isMine ? 'text-gray-400 justify-end' : 'text-gray-400'}`}>
                    <span>{timeAgo(rx.time)}</span>
                    {isMine && (
                      isTemp ? <Check size={10} className="text-gray-300" />
                      : rx.read === 1 ? <CheckCheck size={10} className="text-brand-500" title="Seen" />
                      : <CheckCheck size={10} className="text-gray-400" title="Delivered" />
                    )}
                  </div>
                </div>
              </div>
            )
          }

          const msg = item as Message & { _kind: 'message'; _sortTime: number }
          const isMine = msg.u1 === me.id
          const isTemp = (msg as any)._sending
          const hasMedia = !!(msg.mediaType && (msg.mediaUrl || msg._localPreview))
          return (
            <div key={(msg as any)._tempId || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMine && (
                <Link
                  href={profileUrl(other)}
                  className="block w-7 h-7 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-shadow"
                  aria-label={`View ${other.name}'s profile`}
                  title={`View ${other.name}'s profile`}
                >
                  <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
                </Link>
              )}
              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {/* Media bubble */}
                {hasMedia && (
                  <div className={`${isTemp ? 'opacity-70' : ''}`}>
                    <MediaBubble msg={msg} isMine={isMine} />
                  </div>
                )}
                {/* Text bubble (only shown if there's text, or no media) */}
                {(msg.message || !hasMedia) && (
                  <div className={`${isMine ? 'bubble-sent' : 'bubble-received'} ${isTemp ? 'opacity-70' : ''}`}>
                    <p className="text-sm leading-relaxed">{msg.message || (hasMedia ? '' : '—')}</p>
                  </div>
                )}
                <div className={`flex items-center gap-1 text-[10px] ${isMine ? 'text-gray-400 justify-end' : 'text-gray-400'}`}>
                  <span>{timeAgo(msg.time)}</span>
                  {isMine && (
                    isTemp ? <Check size={10} className="text-gray-300" />
                    : msg.read === 1 ? <CheckCheck size={10} className="text-brand-500" />
                    : <Check size={10} className="text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex items-end gap-2">
            <Link
              href={profileUrl(other)}
              className="block w-7 h-7 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 transition-shadow"
              aria-label={`View ${other.name}'s profile`}
              title={`View ${other.name}'s profile`}
            >
              <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
            </Link>
            <div className="bubble-received inline-flex items-center gap-1 py-3 px-4">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
        {showScrollBottom && (
          <button
            onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="sticky bottom-4 ml-auto mr-2 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-brand-500 hover:border-brand-300 transition-all z-10"
            aria-label="Scroll to latest"
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false) }}
              className="text-2xl hover:scale-125 transition-transform flex-shrink-0 leading-none p-0.5">{e}</button>
          ))}
        </div>
      )}

      {messages.length === 0 && icebreakers.length > 0 && (
        <div className="border-t border-gray-100 bg-white px-3 py-2">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Try an icebreaker</p>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {icebreakers.map(prompt => (
              <button key={prompt} onClick={() => setInput(prompt)}
                className="flex-shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-2">
        <span className="text-[11px] font-semibold text-gray-400">Free:</span>
        {[
          { type: 'wink', label: '😉 Wink' },
          { type: 'rose', label: '🌹 Rose' },
          { type: 'heart', label: '❤️ Heart' },
        ].map(reaction => (
          <button key={reaction.type}
            onClick={async () => {
              const tempId = `rx_temp_${Date.now()}`
              const tempRx: Reaction = {
                id: Date.now(), fromId: me.id, toId: other.id,
                type: reaction.type, time: Math.floor(Date.now() / 1000),
                read: 0, _isReaction: true, _sending: true, _tempId: tempId,
              }
              setReactions(prev => [...prev, tempRx])
              try {
                const res = await fetch('/api/engagement/reactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ toId: other.id, type: reaction.type }),
                })
                if (res.ok) {
                  const data = await res.json()
                  setReactions(prev => prev.map(rx =>
                    rx._tempId === tempId ? { ...data.reaction, _isReaction: true as const } : rx
                  ))
                  toast.success(`${reaction.label} sent`)
                } else {
                  setReactions(prev => prev.filter(rx => rx._tempId !== tempId))
                  toast.error('Could not send reaction')
                }
              } catch {
                setReactions(prev => prev.filter(rx => rx._tempId !== tempId))
                toast.error('Could not send reaction')
              }
            }}
            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-rose-200 hover:bg-rose-50">
            {reaction.label}
          </button>
        ))}
      </div>

      {/* Pending media preview */}
      {pendingMedia && (
        <div className="px-3 py-2 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="relative inline-block">
            {pendingMedia.type === "image" && (
              <img src={pendingMedia.preview} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-gray-200" />
            )}
            {pendingMedia.type === "video" && (
              <video src={pendingMedia.preview} className="h-20 w-20 object-cover rounded-xl border border-gray-200 bg-black" />
            )}
            {pendingMedia.type === "audio" && (
              <div className="h-10 flex items-center gap-2 bg-gray-100 rounded-xl px-3 text-xs text-gray-600">
                <Volume2 size={14} /><span>Audio ready to send</span>
              </div>
            )}
            <button onClick={() => { URL.revokeObjectURL(pendingMedia.preview); setPendingMedia(null) }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors">
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        {creditCost > 0 && me.fake !== 1 && credits !== null && credits < creditCost * 3 && (
          <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <span className="text-xs text-amber-700">💳 {credits} credits left • {creditCost}/message</span>
            <Link href="/credits" className="text-xs font-semibold text-brand-500 hover:underline">Buy more</Link>
          </div>
        )}
        {me.premium !== 1 && CONTACT_INFO_PATTERN.test(input) && (
          <div className="mb-2 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
            <span className="text-xs text-amber-700">👑 Contact info requires Premium to send</span>
            <Link href="/premium" className="text-xs font-bold text-brand-500 hover:underline">Upgrade</Link>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button onClick={() => setShowEmoji(!showEmoji)}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-brand-100 text-brand-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Smile size={18} />
          </button>

          {/* Media attachment button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 flex-shrink-0 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            title="Send photo, video, or audio"
          >
            <Paperclip size={17} />
          </button>

          <Link href={`/gifts?toId=${other.id}`}
            className="w-9 h-9 flex-shrink-0 bg-gray-100 text-amber-500 hover:bg-amber-50 rounded-full flex items-center justify-center transition-colors">
            <Gift size={17} />
          </Link>
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              placeholder={pendingMedia ? `Add a caption...` : `Message ${other.name}...`}
              rows={1}
              className="w-full bg-transparent resize-none focus:outline-none text-sm text-gray-900 placeholder-gray-400 max-h-28 leading-relaxed"
            />
          </div>
          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !pendingMedia) || sending || uploadingMedia}
            className="w-10 h-10 flex-shrink-0 bg-brand-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-colors shadow-sm"
          >
            {uploadingMedia ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={17} />
            )}
          </button>
        </div>
      </div>
      {showFeedback && <FeedbackPrompt onClose={() => setShowFeedback(false)} trigger="fifth_message" />}
      {activeCall && (
        <PaidVideoCallModal
          sessionId={activeCall.sessionId}
          peer={activeCall.peer}
          isCaller
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  )
}
