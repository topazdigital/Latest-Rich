import { useState } from 'react'
import { Crown, Check, Loader2, MessageCircle, Eye, Star, Heart, Gift, Zap, Phone, Shield, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from 'wouter'

interface Props { user: any; packages: any[] }

export default function PremiumPage({ user, packages }: Props) {
  const [selected, setSelected] = useState(packages.find(p => p.popular === 1) || packages[0])
  const [loading, setLoading] = useState(false)
  const { token } = useAuth()
  const [, setLocation] = useLocation()
  const isPremium = user?.premium === 1
  const premiumExpiry = user?.premiumExpiry ? new Date(user.premiumExpiry * 1000) : null

  const features = [
    { icon: <Phone size={16} />, t: 'Share Contact Details', d: 'Send phone numbers & WhatsApp in chat', premium: true },
    { icon: <MessageCircle size={16} />, t: 'Share Social Handles', d: 'Share Instagram, Telegram & more in chat', premium: true },
    { icon: <Eye size={16} />, t: 'See Profile Visitors', d: 'Know exactly who viewed your profile', premium: true },
    { icon: <Star size={16} />, t: 'Priority Placement', d: 'Appear at the top of search results', premium: true },
    { icon: <Check size={16} />, t: 'Read Receipts', d: 'Know when your messages are read', premium: false },
    { icon: <Heart size={16} />, t: 'Unlimited Likes', d: 'Like as many profiles as you want', premium: false },
    { icon: <Gift size={16} />, t: 'Free Monthly Gift', d: 'One free virtual gift each month', premium: true },
    { icon: <Crown size={16} />, t: 'VIP Badge', d: 'Exclusive gold crown badge on your profile', premium: true },
    { icon: <Zap size={16} />, t: 'Superlike x5/day', d: '5 superlikes daily to stand out', premium: false },
    { icon: <Shield size={16} />, t: 'Priority Support', d: 'Dedicated VIP customer support', premium: true },
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
      else toast.error(data.error || 'Payment gateway not configured. Please contact support.')
    } catch { toast.error('Payment failed. Please try again.') }
    finally { setLoading(false) }
  }

  if (isPremium) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0e, #3d0d1a, #7a1226)' }}>
          <div className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-6">
              <Crown size={40} className="text-yellow-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">You're VIP! 👑</h1>
            <p className="text-white/60 mb-6">You have full premium access with all exclusive features unlocked.</p>
            {premiumExpiry && (
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 mb-6">
                <Shield size={16} className="text-yellow-400" />
                <span className="text-white/80 text-sm">Active until <strong className="text-white">{premiumExpiry.toLocaleDateString()}</strong></span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mt-6">
              {features.filter(f => f.premium).slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white/10 rounded-2xl p-3">
                  <div className="text-yellow-400">{f.icon}</div>
                  <span className="text-white/80 text-sm font-medium">{f.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full mb-4">
          <Crown size={14} /> Exclusive Access
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">Unlock Premium 👑</h1>
        <p className="text-gray-500 max-w-md mx-auto">Share your contact details, see who visited you, and unlock the full dating experience</p>
      </div>

      {/* Key benefit callout */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm mb-1">Why Premium?</div>
          <p className="text-gray-600 text-sm leading-relaxed">
            To protect all members, contact info (phones, social handles, emails, links) can only be shared in chat by <strong>Premium members</strong>. Upgrade to take your connections to the next level.
          </p>
        </div>
      </div>

      {/* Packages */}
      {packages.length > 0 && (
        <div className={`grid gap-3 mb-8 ${packages.length <= 2 ? 'grid-cols-2' : packages.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
          {packages.map((pkg: any) => (
            <button key={pkg.id} onClick={() => setSelected(pkg)}
              className={`relative rounded-2xl p-4 text-center transition-all border-2 ${
                selected?.id === pkg.id
                  ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/10'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
              }`}>
              {pkg.popular === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-brand text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                  Most Popular
                </div>
              )}
              <div className="font-bold text-gray-900 text-sm mb-1 mt-1">{pkg.name}</div>
              <div className="text-2xl font-black text-brand-500 my-2">${pkg.price}</div>
              <div className="text-xs text-gray-400">{pkg.description}</div>
              {selected?.id === pkg.id && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Features grid */}
      <div className="card p-6 mb-6">
        <h3 className="font-bold text-gray-900 mb-5 text-base flex items-center gap-2">
          <Crown size={16} className="text-amber-500" /> Premium Features
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${f.premium ? 'bg-amber-50 text-amber-600' : 'bg-brand-50 text-brand-500'}`}>
                {f.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">{f.t}</span>
                  {f.premium && <Crown size={11} className="text-amber-500" />}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button onClick={subscribe} disabled={loading || !selected}
        className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-brand-500/20"
        style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
        {loading ? <Loader2 size={20} className="animate-spin" /> : <Crown size={20} />}
        {selected ? `Get ${selected.name} — $${selected.price}` : 'Select a plan'}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3">Secure payment · Cancel anytime · Instant activation</p>
    </div>
  )
}
