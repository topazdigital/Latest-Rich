import { useState, useEffect } from 'react'
import MeetPage from '../components/meet/MeetPage'
import { useAuth } from '../hooks/useAuth'

export default function MeetPageWrapper() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch('/api/users/meet', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="animate-pulse w-full max-w-sm h-[520px] bg-gray-200 rounded-3xl" />
    </div>
  )

  return <MeetPage userId={user?.id || 0} users={users} />
}
