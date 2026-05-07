import { useState, useEffect } from 'react'
import PremiumPage from '../components/premium/PremiumPage'
import { useAuth } from '../hooks/useAuth'

const DEFAULT_PACKAGES = [
  { id: 1, name: '1 Month', days: 30, price: 9.99, popular: 0, description: 'Flexible monthly plan' },
  { id: 2, name: '3 Months', days: 90, price: 24.99, popular: 1, description: 'Save 17%' },
  { id: 3, name: '6 Months', days: 180, price: 39.99, popular: 0, description: 'Save 33%' },
  { id: 4, name: '1 Year', days: 365, price: 59.99, popular: 0, description: 'Best value — Save 50%' },
]

export default function PremiumPageWrapper() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const { user, token } = useAuth()

  useEffect(() => {
    if (!token) return
    fetch('/api/premium/packages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setPackages(data) })
      .catch(() => {})
  }, [token])

  return <PremiumPage user={user} packages={packages} />
}
