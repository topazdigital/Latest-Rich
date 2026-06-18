import { useState, useEffect } from 'react'
import ChatWindow from '../components/chat/ChatWindow'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'wouter'

interface Props { params: { id: string } }

export default function ChatPage({ params }: Props) {
  const [other, setOther] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const { user, token } = useAuth()
  const otherId = parseInt(params.id)

  useEffect(() => {
    if (!token || !otherId) return
    setLoading(true)
    setOther(null)
    setMessages([])
    setError(false)
    Promise.all([
      fetch(`/api/users/${otherId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/chat/${otherId}/messages`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([otherUser, msgs]) => {
      if (!otherUser?.id) { setError(true); return }
      setOther(otherUser)
      setMessages(Array.isArray(msgs) ? msgs : [])
    }).catch(() => setError(true)).finally(() => setLoading(false))
  }, [otherId, token])

  if (loading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
    </div>
  )

  if (error || !other?.id || !user) return (
    <div className="flex flex-col items-center justify-center h-[80vh] gap-4 text-center px-4">
      <div className="text-5xl">💬</div>
      <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
      <p className="text-gray-500 text-sm">This conversation could not be loaded.</p>
      <Link href="/chat" className="btn-primary">Back to Messages</Link>
    </div>
  )

  return <ChatWindow me={user} other={other} initialMessages={messages} />
}
