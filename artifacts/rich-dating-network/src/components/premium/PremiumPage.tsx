import { useState } from 'react'
import { Crown, Check, Loader2, MessageCircle, Eye, Star, Heart, Gift, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props { user: any; packages: any[] }

export default function PremiumPage({ user, packages }: Props) {
  const [selected, setSelected] = useState(packages[1] || packages[0])
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()
  const isPremium = user?.premium === 1

  const features = [
    { icon: <MessageCircle size={18} />, t: 'Unlimited Messaging', d: 'Send unlimited messages to any member' },
    { icon: <Eye size={18} />, t: 'Profile Visitors', d: 'See exactly who viewed your profile' },
    { icon: <Star size={18} />, t: 'Priority Placement', d: 'Appear at the top of search results' },
    { icon: <Check size={18} />, t: 'Read Receipts', d: 'Know when your messages are read' },
    { icon: <Heart size={18} />, t: 'Unlimited Likes', d: 'Like as many profiles as you want' },
    { icon: <Gift size={18} />, t: 'Free Monthly Gift', d: 'One free virtual gift every month' },
    { icon: <Crown size={18} />, t: 'VIP Badge', d: 'Stand out with an exclusive gold badge' },
    { icon: <Zap size={18} />, t: 'Superlike x3/day', d: '3 superlikes daily to stand out' },
  ]

  async function subscribe() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch('/api/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: selected.id, type: 'premium' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || 'Payment not configured yet')
    } catch { toast.error('Payment failed') }
    finally { setLoading(false) }
  }

  if (isPremium) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Crown size={64} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You're VIP! 👑</h1>
        <p className="text-gray-500">You already have full premium access.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-8">
        <Crown size={48} className="text-amber-500 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-gray-900">Go Premium 👑</h1>
        <p className="text-gray-500 mt-2">Unlock the full experience and find your match faster</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {packages.map((pkg: any) => (
          <button key={pkg.id} onClick={() => setSelected(pkg)}
            className={`card p-4 text-center transition-all relative ${selected?.id === pkg.id ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:shadow-md'}`}>
            {pkg.popular === 1 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">Popular</div>
            )}
            <div className="font-bold text-gray-900 text-sm">{pkg.name}</div>
            <div className="text-2xl font-black text-brand-500 my-1">${pkg.price}</div>
            <div className="text-xs text-gray-400">{pkg.description}</div>
          </button>
        ))}
      </div>

      <div className="card p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">What's Included</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 flex-shrink-0">{f.icon}</div>
              <div>
                <div className="text-sm font-medium text-gray-900">{f.t}</div>
                <div className="text-xs text-gray-500">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={subscribe} disabled={loading || !selected}
        className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Crown size={20} />}
        {selected ? `Get ${selected.name} — $${selected.price}` : 'Select a plan'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">Cancel anytime. Secure payment.</p>
    </div>
  )
}
