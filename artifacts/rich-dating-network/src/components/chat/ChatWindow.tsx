import { useState, useEffect, useRef, useCallback } from 'react'
import { getPhotoUrl, isOnline, timeAgo } from '../../lib/utils'
import { Link } from 'wouter'
import { ArrowLeft, Send, BadgeCheck, Crown, Smile, Gift, Check, CheckCheck, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useWebSocket, useWSEvent } from '../../hooks/useWebSocket'

const QUICK_EMOJIS = ['😊', '❤️', '😍', '😂', '🔥', '👋', '💝', '😘', '🥰', '💕', '✨', '🌹', '😏', '🤩', '💋', '😇']

const CONTACT_INFO_PATTERN = /(\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b|\b\d[\d\s().-]{6,}\d\b|\b(instagram|whatsapp|telegram|snapchat|facebook|twitter|tiktok|wechat|line|viber|signal)\b|@\w{3,}|https?:\/\/|www\.)/i

interface Message {
  id: number
  u1: number
  u2: number
  message: string
  time: number
  read: number
  _sending?: boolean
  _tempId?: string
}

interface Props { me: any; other: any; initialMessages: Message[] }

export default function ChatWindow({ me, other, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(isOnline(other.lastAccess))
  const [credits, setCredits] = useState<number | null>(me.credits ?? null)
  const [creditCost, setCreditCost] = useState(10)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const { token } = useAuth()
  const { connected, send } = useWebSocket()

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, otherTyping])

  // Fetch credit cost
  useEffect(() => {
    fetch('/api/chat/credit-cost', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCreditCost(d.cost || 10)).catch(() => {})
  }, [token])

  // Mark messages as read when opening chat
  useEffect(() => {
    send({ type: 'mark_read', fromUserId: other.id })
  }, [other.id])

  // WS: new message received
  useWSEvent('new_message', (msg) => {
    if (msg.message?.u1 !== other.id) return
    setMessages(prev => {
      if (prev.some(m => m.id === msg.message.id)) return prev
      return [...prev, msg.message]
    })
    // Auto-mark read
    send({ type: 'mark_read', fromUserId: other.id })
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
    if (msg.typing) {
      setTimeout(() => setOtherTyping(false), 4000)
    }
  }, [other.id])

  // WS: messages read
  useWSEvent('messages_read', (msg) => {
    if (msg.byUserId !== other.id) return
    setMessages(prev => prev.map(m => m.u1 === me.id ? { ...m, read: 1 } : m))
  }, [other.id, me.id])

  // WS: user online status
  useWSEvent('user_online', (msg) => {
    if (msg.userId === other.id) setOtherOnline(msg.online)
  }, [other.id])

  // WS: credits updated
  useWSEvent('credits_updated', (msg) => {
    setCredits(msg.credits)
  })

  // WS: error
  useWSEvent('error', (msg) => {
    if (msg.code === 'insufficient_credits') {
      toast.error('Not enough credits! Buy more to continue chatting.')
      // Remove temp message if it was optimistic
      if (msg.tempId) {
        setMessages(prev => prev.filter(m => (m as any)._tempId !== msg.tempId))
      }
    } else if (msg.code === 'contact_info_blocked') {
      // Remove temp message
      if (msg.tempId) {
        setMessages(prev => prev.filter(m => (m as any)._tempId !== msg.tempId))
      }
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm bg-white shadow-xl rounded-2xl border border-amber-200 p-4 flex items-start gap-3`}>
          <div className="text-2xl">👑</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-gray-900 text-sm mb-1">Premium Required</div>
            <p className="text-xs text-gray-500 mb-2">Sharing contact info, social handles, or links is a Premium-only feature.</p>
            <a href="/premium" className="inline-block text-xs font-bold text-white px-3 py-1.5 rounded-lg"
              style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
              Upgrade Now
            </a>
          </div>
        </div>
      ), { duration: 5000 })
    }
  })

  // Fallback polling when WS not connected
  useEffect(() => {
    if (connected) return
    const interval = setInterval(() => {
      fetch(`/api/chat/${other.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (Array.isArray(data) && data.length > messages.length) setMessages(data)
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

  async function sendMessage() {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    // Stop typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    if (isTypingRef.current) {
      isTypingRef.current = false
      send({ type: 'typing_stop', toUserId: other.id })
    }

    const tempId = `temp_${Date.now()}`
    const tempMsg: Message = {
      id: Date.now(),
      u1: me.id,
      u2: other.id,
      message: text,
      time: Math.floor(Date.now() / 1000),
      read: 0,
      _sending: true,
      _tempId: tempId,
    }
    setMessages(prev => [...prev, tempMsg])

    // Try WebSocket first
    if (connected) {
      send({ type: 'chat_message', toUserId: other.id, message: text, tempId })
      setSending(false)
      return
    }

    // Fallback: REST API
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: other.id, message: text }),
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
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  Upgrade Now
                </a>
              </div>
            </div>
          ), { duration: 5000 })
        } else {
          toast.error(data.error || 'Failed to send')
        }
        setMessages(prev => prev.filter(m => (m as any)._tempId !== tempId))
        setInput(text)
      } else {
        const data = await res.json()
        setMessages(prev => prev.map(m => (m as any)._tempId === tempId ? { ...data, read: 0 } : m))
        if (data.credits !== undefined) setCredits(data.credits)
      }
    } catch {
      toast.error('Failed to send message')
      setMessages(prev => prev.filter(m => (m as any)._tempId !== tempId))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem)] max-w-2xl mx-auto bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
        <Link href="/chat" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 flex-shrink-0">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100">
            <img src={getPhotoUrl(other.photoThumb || other.photo)} alt={other.name} className="w-full h-full object-cover" />
          </div>
          {otherOnline && <div className="online-dot absolute bottom-0 right-0" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/profile/${other.id}`} className="font-semibold text-gray-900 hover:text-brand-500 truncate">{other.name}</Link>
            {other.verified === 1 && <BadgeCheck size={14} className="text-blue-500 flex-shrink-0" />}
            {other.premium === 1 && <Crown size={14} className="text-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-gray-400">
            {otherTyping ? (
              <span className="text-brand-500 font-medium">typing...</span>
            ) : otherOnline ? (
              <span className="text-green-500">Online now</span>
            ) : (
              `Last seen ${timeAgo(other.lastAccess)}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {credits !== null && (
            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full text-xs font-semibold">
              <span>💳</span>
              <span>{credits}</span>
            </div>
          )}
          <div title={connected ? 'Real-time connected' : 'Polling mode'}>
            {connected
              ? <Wifi size={14} className="text-green-500" />
              : <WifiOff size={14} className="text-gray-300" />
            }
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-gray-400 text-sm">Say hello to {other.name}!</p>
            {creditCost > 0 && me.fake !== 1 && (
              <p className="text-xs text-gray-400 mt-1">{creditCost} credit per message</p>
            )}
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.u1 === me.id
          const isTemp = (msg as any)._sending
          return (
            <div key={(msg as any)._tempId || msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMine && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                  <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`${isMine ? 'bubble-sent' : 'bubble-received'} ${isTemp ? 'opacity-70' : ''}`}>
                  <p className="text-sm leading-relaxed">{msg.message}</p>
                </div>
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
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bubble-received inline-flex items-center gap-1 py-3 px-4">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false) }}
              className="text-2xl hover:scale-125 transition-transform flex-shrink-0 leading-none p-0.5">
              {e}
            </button>
          ))}
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
          <Link href={`/gifts?toId=${other.id}`}
            className="w-9 h-9 flex-shrink-0 bg-gray-100 text-amber-500 hover:bg-amber-50 rounded-full flex items-center justify-center transition-colors">
            <Gift size={17} />
          </Link>
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${other.name}...`}
              rows={1}
              className="w-full bg-transparent resize-none focus:outline-none text-sm text-gray-900 placeholder-gray-400 max-h-28 leading-relaxed"
            />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-10 h-10 flex-shrink-0 bg-brand-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-brand-600 transition-colors shadow-sm">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
