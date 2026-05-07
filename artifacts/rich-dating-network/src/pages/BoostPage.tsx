import { useState, useEffect } from 'react'
import { Zap, Clock, Coins, TrendingUp, Crown, Loader2, ChevronRight, Star, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { authFetch } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

interface BoostStatus {
  active: boolean
  boost: { startTime: number; endTime: number; creditsSpent: number } | null
  config: { credits: number; duration: number }
  credits: number
}

export default function BoostPage() {
  const [status, setStatus] = useState<BoostStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [boosting, setBoosting] = useState(false)
  const { user } = useAuth()

  function timeLeft(endTime: number): string {
    const diff = endTime - Math.floor(Date.now() / 1000)
    if (diff <= 0) return 'Expired'
    const m = Math.floor(diff / 60)
    const s = diff % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  async function fetchStatus() {
    try {
      const res = await authFetch('/api/boost/status')
      const data = await res.json()
      setStatus(data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  async function activateBoost() {
    setBoosting(true)
    try {
      const res = await authFetch('/api/boost/activate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to activate boost'); return }
      toast.success(`🚀 Profile boosted for ${data.duration} minutes!`)
      fetchStatus()
    } catch {
      toast.error('Something went wrong')
    } finally { setBoosting(false) }
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    )
  }

  const boost = status?.boost
  const config = status?.config || { credits: 50, duration: 30 }
  const credits = status?.credits || 0
  const canAfford = credits >= config.credits

  return (
    <div className="page-container max-w-2xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-2xl shadow-orange-500/30"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
          <Zap className="w-10 h-10 text-white fill-white" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Boost Profile</h1>
        <p className="text-gray-500 text-base max-w-sm mx-auto">
          Pin your profile to the top of discovery. Get up to 10x more profile views!
        </p>
      </div>

      {/* Active boost banner */}
      {status?.active && boost && (
        <div className="rounded-3xl p-6 mb-6 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-10 translate-x-10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse shadow-lg shadow-green-300/50" />
              <span className="font-bold text-lg">Boost Active!</span>
            </div>
            <p className="text-white/80 text-sm mb-4">Your profile is pinned at the top of discovery. Making the most of it! 🔥</p>
            <div className="flex items-center gap-2 bg-white/20 rounded-2xl px-4 py-3 w-fit">
              <Clock size={16} />
              <span className="font-bold text-lg">{timeLeft(boost.endTime)}</span>
              <span className="text-white/70 text-sm">remaining</span>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      {!status?.active && (
        <div className="card p-8 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { icon: TrendingUp, label: 'Top Placement', desc: 'Appear first in discovery' },
              { icon: Users, label: 'More Views', desc: 'Up to 10x more profile visits' },
              { icon: Star, label: 'Premium Badge', desc: 'Special boost indicator' },
            ].map((f, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-gray-50 hover:bg-brand-50 transition-colors group">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md">
                  <f.icon size={18} />
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1">{f.label}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={18} className="text-orange-500" />
                  <span className="font-bold text-gray-900">Profile Boost</span>
                </div>
                <div className="text-sm text-gray-500">{config.duration} minutes of top placement</div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <Coins size={18} className="text-amber-500" />
                  <span className="text-2xl font-black text-gray-900">{config.credits}</span>
                </div>
                <div className="text-xs text-gray-400">credits</div>
              </div>
            </div>
          </div>

          {/* Credits display */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
              <Coins size={16} className="text-amber-500" />
              Your credits
            </div>
            <div className={`font-bold text-lg ${canAfford ? 'text-gray-900' : 'text-red-500'}`}>
              {credits} credits
            </div>
          </div>

          {!canAfford && (
            <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-2">
              <span>⚠️</span>
              <span>You need {config.credits} credits to boost. You have {credits}. <a href="/credits" className="font-bold underline">Buy credits</a> to boost your profile.</span>
            </div>
          )}

          <button
            onClick={activateBoost}
            disabled={boosting || !canAfford}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            style={{ background: canAfford ? 'linear-gradient(135deg, #f97316, #ef4444)' : '#d1d5db', boxShadow: canAfford ? '0 8px 32px rgba(249,115,22,0.35)' : 'none' }}>
            {boosting ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} className="fill-white" />}
            {boosting ? 'Activating Boost...' : `Boost for ${config.duration} min · ${config.credits} credits`}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="card p-6">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Crown size={16} className="text-amber-500" /> How Boost Works
        </h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Your profile moves to the very top of the Discover page for everyone', color: 'bg-blue-500' },
            { step: '2', text: 'A special ⚡ badge appears on your profile so people notice you', color: 'bg-orange-500' },
            { step: '3', text: 'After the boost period, your profile returns to normal ranking', color: 'bg-green-500' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>
                {item.step}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <a href="/credits" className="flex items-center justify-between text-sm text-brand-500 font-semibold hover:text-brand-600 transition-colors">
            <span>Need more credits? Get them here</span>
            <ChevronRight size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
