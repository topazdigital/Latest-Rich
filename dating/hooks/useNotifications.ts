'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getSocket } from '@/lib/socket-client'

export function useNotifications() {
  const { data: session } = useSession()
  const [unread, setUnread] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    if (!session?.user) return
    const userId = (session.user as any).id

    fetch('/api/notifications/count')
      .then(r => r.json())
      .then(d => { setUnread(d.unread || 0); setChatUnread(d.chatUnread || 0) })
      .catch(() => {})

    const socket = getSocket()
    socket.emit('user:join', userId)

    socket.on('notification:new', () => {
      setUnread(prev => prev + 1)
    })

    socket.on('chat:message', () => {
      setChatUnread(prev => prev + 1)
    })

    return () => {
      socket.off('notification:new')
      socket.off('chat:message')
    }
  }, [session])

  return { unread, chatUnread, setUnread, setChatUnread }
}
