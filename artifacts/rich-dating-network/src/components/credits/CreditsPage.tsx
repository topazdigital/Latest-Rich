import { useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { currencySymbol } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

interface Props { user: any; packages: any[]; orders: any[] }

export default function CreditsPage({ user, packages, orders }: Props) {
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()

  async function buyCredits() {
    if (!selected) { toast.error('Select a package first'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/payments/paystack/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: selected.id, type: 'credits' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || 'Payment gateway not configured. Please contact support.')
    } catch { toast.error('Payment failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="gradient-brand text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-6 -translate-x-6" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Coins size={32} className="text-yellow-300" />
            <div>
              <div className="text-4xl font-black">{user?.credits || 0}</div>
              <div className="text-white/80 text-sm">Available Credits</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Buy Credits</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {packages.map((pkg: any) => (
          <button key={pkg.id} onClick={() => setSelected(pkg)}
            className={`card p-4 text-center transition-all relative ${selected?.id === pkg.id ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:shadow-md'}`}>
            {pkg.popular === 1 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">Popular</div>
            )}
            <div className="text-2xl font-black text-brand-500">{pkg.credits}</div>
            <div className="text-xs text-gray-500">credits</div>
            <div className="font-bold text-gray-900 mt-1">${pkg.price}</div>
            {pkg.discount > 0 && <div className="text-xs text-green-500">Save {pkg.discount}%</div>}
          </button>
        ))}
      </div>

      <button onClick={buyCredits} disabled={loading || !selected}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50 mb-8">
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Coins size={20} />}
        {selected ? `Buy ${selected.credits} credits — $${selected.price}` : 'Select a package'}
      </button>

      {orders.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>
          <div className="card divide-y divide-gray-50">
            {orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{o.description || 'Credit Purchase'}</div>
                  <div className="text-xs text-gray-400">{new Date(o.time * 1000).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${o.amount}</div>
                  <div className={`text-xs ${o.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>{o.status}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
