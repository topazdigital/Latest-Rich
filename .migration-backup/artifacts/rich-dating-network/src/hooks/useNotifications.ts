import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { user, token } = useAuth()
  const [unread, setUnread] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)

  useEffect(() => {
    if (!user || !token) return
    fetch('/api/notifications/count', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setUnread(d.unread || 0)
        setChatUnread(d.chatUnread || 0)
      })
      .catch(() => {})

    const interval = setInterval(() => {
      fetch('/api/notifications/count', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => {
          setUnread(d.unread || 0)
          setChatUnread(d.chatUnread || 0)
        })
        .catch(() => {})
    }, 30000)

    return () => clearInterval(interval)
  }, [user, token])

  return { unread, chatUnread, setUnread, setChatUnread }
}
