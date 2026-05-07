'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { getPhotoUrl, isOnline, timeAgo } from '@/lib/utils'
import { getSocket } from '@/lib/socket-client'
import Link from 'next/link'
import { ArrowLeft, Send, Image, Gift, Video, MoreVertical, Smile, Phone, BadgeCheck, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { me: any; other: any; initialMessages: any[]; fakeMessages: any[] }

export default function ChatWindow({ me, other, initialMessages, fakeMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimer = useRef<NodeJS.Timeout>()
  const socket = useRef(getSocket())

  useEffect(() => {
    const s = socket.current
    s.emit('user:join', me.id)

    s.on('chat:message', (msg: any) => {
      if (msg.u1 === other.id || msg.u2 === other.id) {
        setMessages(prev => [...prev, msg])
        // Mark read
        fetch(`/api/chat/${other.id}/read`, { method: 'POST' }).catch(() => {})
      }
    })

    s.on('chat:typing', ({ fromUserId, typing: t }: any) => {
      if (fromUserId === other.id) setTyping(t)
    })

    return () => { s.off('chat:message'); s.off('chat:typing') }
  }, [me.id, other.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // AI fake auto-reply for fake users
  useEffect(() => {
    if (!other.fake || fakeMessages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.u1 !== me.id) return
    const delay = 3000 + Math.random() * 7000
    const timer = setTimeout(() => {
      const fakeMsg = fakeMessages[Math.floor(Math.random() * fakeMessages.length)]
      const reply = { id: Date.now(), u1: other.id, u2: me.id, message: fakeMsg.message, time: Math.floor(Date.now()/1000), read: 1 }
      setMessages(prev => [...prev, reply])
    }, delay)
    return () => clearTimeout(timer)
  }, [messages, other.fake, me.id, other.id, fakeMessages])

  function handleTyping() {
    socket.current.emit('chat:typing', { toUserId: other.id, fromUserId: me.id, typing: true })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      socket.current.emit('chat:typing', { toUserId: other.id, fromUserId: me.id, typing: false })
    }, 2000)
  }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: other.id, message: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send')
        setMessages(prev => prev.filter(m => m.id !== msg.id))
      } else {
        socket.current.emit('chat:message', { toUserId: other.id, message: data.message })
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/chat" className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <Link href={`/profile/${other.id}`} className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={getPhotoUrl(other.photoThumb || other.photo)} alt={other.name} className="w-full h-full object-cover" />
          </div>
          {isOnline(other.lastAccess) && <div className="online-dot absolute bottom-0 right-0" />}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Link href={`/profile/${other.id}`} className="font-semibold text-gray-900 hover:text-brand-500 transition-colors">{other.name}</Link>
            {other.verified === 1 && <BadgeCheck size={14} className="text-blue-500 fill-blue-500" />}
            {other.premium === 1 && <Crown size={14} className="text-gold-500" />}
          </div>
          <p className="text-xs text-gray-400">
            {typing ? <span className="text-brand-500 animate-pulse">typing...</span>
              : isOnline(other.lastAccess) ? 'Online now' : `Last seen ${timeAgo(other.lastAccess)}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/videocall/${other.id}`} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <Video size={18} />
          </Link>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((msg, i) => {
          const isMine = msg.u1 === me.id
          return (
            <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
              {!isMine && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-1">
                  <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <div className={isMine ? 'bubble-sent' : 'bubble-received'} dangerouslySetInnerHTML={{ __html: msg.message?.replace(/<[^>]*>/g, '') || '' }} />
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isMine ? 'text-right' : 'text-left'}`}>{timeAgo(msg.time)}{isMine && msg.read === 1 ? ' · Read' : ''}</p>
              </div>
            </div>
          )
        })}
        {typing && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
              <img src={getPhotoUrl(other.photoThumb || other.photo)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="bubble-received flex items-center gap-1 py-3">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-100 p-3 pb-safe">
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><Smile size={20} /></button>
            <Link href={`/gifts/${other.id}`} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><Gift size={20} /></Link>
          </div>
          <div className="flex-1 flex items-end bg-gray-100 rounded-2xl px-4 py-2">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); handleTyping() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={`Message ${other.name}...`}
              rows={1}
              className="flex-1 bg-transparent resize-none focus:outline-none text-gray-900 text-sm max-h-32 overflow-y-auto"
              style={{ lineHeight: '1.5' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center shadow-md disabled:opacity-50 hover:shadow-lg transition-all flex-shrink-0">
            <Send size={18} className="text-white -translate-x-px" />
          </button>
        </div>
      </div>
    </div>
  )
}
