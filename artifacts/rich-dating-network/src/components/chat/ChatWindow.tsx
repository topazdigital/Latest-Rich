import { useState, useEffect, useRef } from 'react'
import { getPhotoUrl, isOnline, timeAgo } from '../../lib/utils'
import { Link } from 'wouter'
import { ArrowLeft, Send, BadgeCheck, Crown, Smile, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const QUICK_EMOJIS = ['😊', '❤️', '😍', '😂', '🔥', '👋', '💝', '😘', '🥰', '💕', '✨', '🌹']

interface Props { me: any; other: any; initialMessages: any[] }

export default function ChatWindow({ me, other, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { token } = useAuth()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/chat/${other.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > messages.length) {
            setMessages(data)
          }
        })
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [other.id, token, messages.length])

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    const msg = { id: Date.now(), u1: me.id, u2: other.id, message: text, time: Math.floor(Date.now()/1000), read: 0 }
    setMessages(prev => [...prev, msg])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: other.id, message: text }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed to send')
        setMessages(prev => prev.filter(m => m.id !== msg.id))
        setInput(text)
      }
    } catch {
      toast.error('Failed to send')
      setMessages(prev => prev.filter(m => m.id !== msg.id))
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-2xl mx-auto">
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <Link href="/chat" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={getPhotoUrl(other.photoThumb || other.photo)} alt={other.name} className="w-full h-full object-cover" />
          </div>
          {isOnline(other.lastAccess) && <div className="online-dot absolute bottom-0 right-0" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/profile/${other.id}`} className="font-semibold text-gray-900 hover:text-brand-500">{other.name}</Link>
            {other.verified === 1 && <BadgeCheck size={14} className="text-blue-500" />}
            {other.premium === 1 && <Crown size={14} className="text-amber-500" />}
          </div>
          <p className="text-xs text-gray-500">{isOnline(other.lastAccess) ? 'Online now' : `Last seen ${timeAgo(other.lastAccess)}`}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.map((msg: any) => {
          const isMine = msg.u1 === me.id || msg.from === me.id
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2">
                  <img src={getPhotoUrl(other.photoThumb)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className={`${isMine ? 'bubble-sent' : 'bubble-received'}`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>{timeAgo(msg.time)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {showEmoji && (
        <div className="px-4 pt-2 pb-1 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_EMOJIS.map(e => (
            <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false) }}
              className="text-2xl hover:scale-125 transition-transform flex-shrink-0 leading-none">{e}</button>
          ))}
        </div>
      )}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2 items-end">
          <button onClick={() => setShowEmoji(!showEmoji)}
            className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${showEmoji ? 'bg-brand-100 text-brand-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <Smile size={18} />
          </button>
          <Link href={`/gifts?toId=${other.id}`}
            className="w-9 h-9 flex-shrink-0 bg-gray-100 text-amber-500 hover:bg-amber-50 rounded-full flex items-center justify-center transition-colors" title="Send a gift">
            <Gift size={17} />
          </Link>
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-transparent resize-none focus:outline-none text-sm text-gray-900 placeholder-gray-400 max-h-24"
            />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="w-11 h-11 flex-shrink-0 bg-brand-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-brand-600 transition-colors">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
