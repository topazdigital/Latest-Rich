import { useState, useEffect } from 'react'
import DiscoverPageComp from '../components/discover/DiscoverPage'
import { useAuth } from '../hooks/useAuth'

export default function DiscoverPage() {
  const { user, token } = useAuth()
  const [myInterests, setMyInterests] = useState<string[]>([])

  useEffect(() => {
    if (!token) return
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(me => {
        try { setMyInterests(JSON.parse(me?.userExtended?.interests || '[]')) } catch { }
      })
      .catch(() => {})
  }, [token])

  return (
    <DiscoverPageComp
      userId={user?.id || 0}
      myCity={user?.city}
      myCountry={user?.country}
      myInterests={myInterests}
    />
  )
}
