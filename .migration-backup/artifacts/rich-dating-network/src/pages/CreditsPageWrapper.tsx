import { useState, useEffect } from 'react'
import CreditsPage from '../components/credits/CreditsPage'
import { useAuth } from '../hooks/useAuth'

const DEFAULT_PACKAGES = [
  { id: 1, credits: 100, price: 4.99, popular: 0, description: 'Starter Pack', discount: 0 },
  { id: 2, credits: 250, price: 9.99, popular: 1, description: 'Popular', discount: 10 },
  { id: 3, credits: 500, price: 17.99, popular: 0, description: 'Value Pack', discount: 20 },
  { id: 4, credits: 1000, price: 29.99, popular: 0, description: 'Best Value', discount: 40 },
]

export default function CreditsPageWrapper() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const [orders, setOrders] = useState<any[]>([])
  const { user, token } = useAuth()

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/credits/packages', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/credits/orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([pkgs, ords]) => {
      if (Array.isArray(pkgs) && pkgs.length > 0) setPackages(pkgs)
      if (Array.isArray(ords)) setOrders(ords)
    }).catch(() => {})
  }, [token])

  return <CreditsPage user={user} packages={packages} orders={orders} />
}
