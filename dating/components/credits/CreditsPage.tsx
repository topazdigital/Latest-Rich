'use client'
import { useState } from 'react'
import { Coins, CreditCard, Smartphone, Crown, Zap, Shield, Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { currencySymbol, supportsMpesa } from '@/lib/utils'
import { loadStripe } from '@stripe/stripe-js'
import Link from 'next/link'

interface Props { user: any; packages: any[]; orders: any[] }

export default function CreditsPage({ user, packages, orders }: Props) {
  const [selected, setSelected] = useState<any>(null)
  const [payMethod, setPayMethod] = useState('stripe')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const showMpesa = supportsMpesa(user?.countryCode || '')

  async function buyCredits() {
    if (!selected) return toast.error('Select a package first')
    setLoading(true)
    try {
      if (payMethod === 'stripe') {
        const res = await fetch('/api/payments/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'credits' }),
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else toast.error(data.error || 'Stripe not configured')
      } else if (payMethod === 'paypal') {
        const res = await fetch('/api/payments/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'credits' }),
        })
        const data = await res.json()
        if (data.approvalUrl) window.location.href = data.approvalUrl
        else toast.error(data.error || 'PayPal not configured')
      } else if (payMethod === 'mpesa') {
        if (!phone) return toast.error('Enter your M-Pesa phone number')
        const res = await fetch('/api/payments/payhero/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'credits', phone }),
        })
        const data = await res.json()
        if (res.ok) toast.success('Check your phone for M-Pesa prompt!')
        else toast.error(data.error || 'M-Pesa failed')
      }
    } catch { toast.error('Payment failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Balance */}
      <div className="gradient-brand text-white rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-6 -translate-x-6" />
        <div className="relative">
          <p className="text-white/70 text-sm mb-1">Your Balance</p>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-5xl font-bold">{user?.credits || 0}</span>
            <span className="text-white/80 mb-1">credits</span>
          </div>
          <p className="text-white/70 text-xs">Use credits to chat, send gifts, and unlock premium features</p>
        </div>
      </div>

      {/* Packages */}
      <h2 className="section-title mb-4">Buy Credits</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {packages.map(pkg => (
          <button key={pkg.id} onClick={() => setSelected(pkg)}
            className={`card p-4 text-center transition-all relative ${selected?.id === pkg.id ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md'}`}>
            {pkg.popular === 1 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs px-3 py-0.5 rounded-full">Popular</div>
            )}
            {pkg.discount > 0 && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">-{pkg.discount}%</div>
            )}
            <div className="text-3xl font-bold text-brand-500 mb-1">{pkg.credits}</div>
            <div className="text-xs text-gray-500 mb-2">credits</div>
            <div className="text-lg font-bold text-gray-900">${pkg.price}</div>
            {pkg.description && <div className="text-xs text-gray-400 mt-1">{pkg.description}</div>}
          </button>
        ))}
      </div>

      {/* Payment method */}
      <div className="card p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[
            { id: 'stripe', icon: <CreditCard size={20} />, label: 'Card (Stripe)' },
            { id: 'paypal', icon: <span className="font-bold text-blue-600 text-sm">Pay</span>, label: 'PayPal' },
            ...(showMpesa ? [{ id: 'mpesa', icon: <Smartphone size={20} />, label: 'M-Pesa' }] : []),
          ].map(m => (
            <button key={m.id} onClick={() => setPayMethod(m.id)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${payMethod === m.id ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {payMethod === 'mpesa' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">M-Pesa Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+254712345678" className="input-field" />
            <p className="text-xs text-gray-400 mt-1">Format: +254XXXXXXXXX</p>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 mb-4">
          <Shield size={16} className="text-green-500 flex-shrink-0" />
          <span>All payments are secure and encrypted. You'll receive your credits instantly.</span>
        </div>

        <button onClick={buyCredits} disabled={!selected || loading}
          className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            : selected ? `Buy ${selected.credits} Credits for $${selected.price}` : 'Select a Package'}
        </button>
      </div>

      {/* Premium upgrade */}
      <div className="gradient-brand text-white rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Crown size={24} />
          <h3 className="text-xl font-bold">Go Premium</h3>
        </div>
        <ul className="space-y-2 mb-4 text-sm text-white/90">
          {['Unlimited messages', 'See who viewed your profile', 'Priority in search results', 'Read receipts', 'No ads'].map(f => (
            <li key={f} className="flex items-center gap-2"><Check size={14} /> {f}</li>
          ))}
        </ul>
        <Link href="/premium" className="block text-center bg-white text-brand-500 font-bold py-3 rounded-xl hover:bg-white/90 transition-colors">
          Upgrade to Premium
        </Link>
      </div>

      {/* Orders history */}
      {orders.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Transaction History</h3>
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{order.type} — {order.credits} credits</p>
                  <p className="text-xs text-gray-400">{order.gateway} · {new Date(order.time * 1000).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">${order.amount}</p>
                  <span className={`badge text-xs ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
