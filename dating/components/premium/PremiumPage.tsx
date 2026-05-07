'use client'
import { useState } from 'react'
import { Crown, Check, CreditCard, Smartphone, Loader2, Shield, Zap, Eye, MessageCircle, Star, Heart, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { supportsMpesa } from '@/lib/utils'

interface Props { user: any; packages: any[] }

export default function PremiumPage({ user, packages }: Props) {
  const [selected, setSelected] = useState(packages[1] || packages[0])
  const [payMethod, setPayMethod] = useState('stripe')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const showMpesa = supportsMpesa(user?.countryCode || '')
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
      if (payMethod === 'stripe') {
        const res = await fetch('/api/payments/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'premium' }),
        })
        const data = await res.json()
        if (data.url) window.location.href = data.url
        else toast.error(data.error || 'Stripe not configured yet')
      } else if (payMethod === 'paypal') {
        const res = await fetch('/api/payments/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'premium' }),
        })
        const data = await res.json()
        if (data.approvalUrl) window.location.href = data.approvalUrl
        else toast.error(data.error || 'PayPal not configured yet')
      } else if (payMethod === 'mpesa') {
        if (!phone) return toast.error('Enter your M-Pesa phone number')
        const res = await fetch('/api/payments/payhero/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packageId: selected.id, type: 'premium', phone }),
        })
        const data = await res.json()
        if (res.ok) toast.success('Check your phone for M-Pesa prompt!')
        else toast.error(data.error || 'M-Pesa payment failed')
      }
    } catch { toast.error('Payment failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="gradient-brand text-white rounded-2xl p-8 mb-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['👑','💎','✨','💝','🥂'].map((e, i) => (
            <div key={i} className="absolute text-3xl opacity-20" style={{ left: `${10+i*20}%`, top: `${20+i*10}%`, animationDelay: `${i*0.5}s` }}>{e}</div>
          ))}
        </div>
        <Crown size={48} className="mx-auto mb-4 text-yellow-300" />
        <h1 className="text-3xl font-bold mb-2">Rich Dating Premium</h1>
        <p className="text-white/80 text-lg">Unlock the full dating experience</p>
        {isPremium && (
          <div className="mt-4 inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">
            <Check size={16} /> You&apos;re a Premium Member!
          </div>
        )}
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {features.map((f, i) => (
          <div key={i} className="card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 flex-shrink-0">{f.icon}</div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{f.t}</h3>
              <p className="text-gray-500 text-xs">{f.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plans */}
      <h2 className="section-title mb-4">Choose a Plan</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {packages.map(pkg => (
          <button key={pkg.id} onClick={() => setSelected(pkg)}
            className={`card p-4 text-center transition-all relative ${selected?.id === pkg.id ? 'ring-2 ring-brand-500 shadow-md' : 'hover:shadow-md'}`}>
            {pkg.popular === 1 && (
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs px-3 py-0.5 rounded-full">Popular</div>
            )}
            <Crown size={20} className="text-gold-500 mx-auto mb-2" />
            <div className="font-bold text-gray-900">{pkg.name}</div>
            <div className="text-2xl font-bold text-brand-500 my-1">${pkg.price}</div>
            {pkg.description && <div className="text-xs text-green-600 font-medium">{pkg.description}</div>}
          </button>
        ))}
      </div>

      {/* Payment */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Payment Method</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[
            { id: 'stripe', icon: <CreditCard size={18} />, label: 'Credit/Debit Card' },
            { id: 'paypal', icon: <span className="font-bold text-blue-600 text-sm">Pay</span>, label: 'PayPal' },
            ...(showMpesa ? [{ id: 'mpesa', icon: <Smartphone size={18} />, label: 'M-Pesa' }] : []),
          ].map(m => (
            <button key={m.id} onClick={() => setPayMethod(m.id)}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${payMethod === m.id ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600'}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>
        {payMethod === 'mpesa' && (
          <div className="mb-4">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254712345678" className="input-field" />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <Shield size={14} className="text-green-500" /> Secure payment — Cancel anytime
        </div>
        <button onClick={subscribe} disabled={loading || isPremium} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            : isPremium ? '✓ Already Premium' : selected ? `Subscribe for $${selected.price}/${selected.name}` : 'Select a Plan'}
        </button>
      </div>
    </div>
  )
}
