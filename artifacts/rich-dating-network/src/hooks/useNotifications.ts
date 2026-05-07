import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useWSEvent, sendWS } from './useWebSocket'

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

  // Real-time: increment chat unread on new message
  useWSEvent('new_message', () => {
    setChatUnread(prev => prev + 1)
  })

  // Real-time: user connected = refresh counts
  useWSEvent('__connected', fetchCounts)

  return { unread, chatUnread, setUnread, setChatUnread, refresh: fetchCounts }
}
