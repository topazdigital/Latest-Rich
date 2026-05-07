import { useState, useEffect } from 'react'
import SettingsPage from '../components/settings/SettingsPage'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPageWrapper() {
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch('/api/users/me/full', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setUserData(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-6 animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/3" />
      <div className="h-64 bg-gray-200 rounded-2xl" />
    </div>
  )

  return <SettingsPage user={userData} />
}
