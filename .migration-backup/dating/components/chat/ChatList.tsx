'use client'
import { getPhotoUrl, isOnline, timeAgo, truncate } from '@/lib/utils'
import Link from 'next/link'
import { BadgeCheck, Crown, MessageCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getSocket } from '@/lib/socket-client'
import { useSession } from 'next-auth/react'

interface Props { userId: number; conversations: any[] }

export default function ChatList({ userId, conversations: initial }: Props) {
  const [convos, setConvos] = useState(initial)
  const { data: session } = useSession()

  useEffect(() => {
    const socket = getSocket()
    socket.emit('user:join', userId)
    socket.on('chat:message', (msg: any) => {
      setConvos(prev => {
        const existing = prev.findIndex(c => c.otherId === msg.u1 || c.otherId === msg.u2)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], lastMsg: msg.message, lastTime: msg.time, unread: (parseInt(updated[existing].unread) || 0) + 1 }
          updated.sort((a, b) => b.lastTime - a.lastTime)
          return updated
        }
        return prev
      })
    })
    return () => { socket.off('chat:message') }
  }, [userId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-title">Messages</h1>
        <Link href="/discover" className="text-sm text-brand-500 hover:text-brand-600 font-medium">New Chat</Link>
      </div>

      {convos.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No conversations yet</h2>
          <p className="text-gray-500 mb-6">Start by discovering new people</p>
          <Link href="/discover" className="btn-primary">Browse Members</Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {convos.map((c) => (
            <Link key={c.otherId} href={`/chat/${c.otherId}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src={getPhotoUrl(c.photoThumb || c.photo)} alt={c.name} className="w-full h-full object-cover" />
                </div>
                {isOnline(c.lastAccess) && <div className="online-dot absolute bottom-0 right-0" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-semibold text-gray-900">{c.name}</span>
                  {c.verified === 1 && <BadgeCheck size={14} className="text-blue-500 fill-blue-500" />}
                  {c.premium === 1 && <Crown size={14} className="text-gold-500" />}
                </div>
                <p className={`text-sm truncate ${parseInt(c.unread) > 0 ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                  {c.lastMsg ? truncate(c.lastMsg?.replace(/<[^>]*>/g, ''), 45) : 'Say hello! 👋'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-xs text-gray-400">{timeAgo(c.lastTime)}</span>
                {parseInt(c.unread) > 0 && (
                  <span className="w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">
                    {parseInt(c.unread) > 9 ? '9+' : c.unread}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
