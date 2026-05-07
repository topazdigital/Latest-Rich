import { useState, useEffect } from 'react'
import ChatWindow from '../components/chat/ChatWindow'
import { useAuth } from '../hooks/useAuth'

interface Props { params: { id: string } }

export default function ChatPage({ params }: Props) {
  const [other, setOther] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()
  const otherId = parseInt(params.id)

  useEffect(() => {
    if (!token || !otherId) return
    Promise.all([
      fetch(`/api/users/${otherId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/chat/${otherId}/messages`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([otherUser, msgs]) => {
      setOther(otherUser)
      setMessages(Array.isArray(msgs) ? msgs : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [otherId, token])

  if (loading || !other || !user) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
    </div>
  )

  return <ChatWindow me={user} other={other} initialMessages={messages} />
}
