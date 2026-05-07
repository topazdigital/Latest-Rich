import { useState, useEffect } from 'react'
import { Zap, Clock, TrendingUp, Crown, Loader2, ChevronRight, Star, Users } from 'lucide-react'
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
  const [timeLeftStr, setTimeLeftStr] = useState('')
  const { user } = useAuth()

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
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!status?.boost?.endTime) return
    const tick = () => {
      const diff = status.boost!.endTime - Math.floor(Date.now() / 1000)
      if (diff <= 0) { setTimeLeftStr('Expired'); return }
      const m = Math.floor(diff / 60), s = diff % 60
      setTimeLeftStr(m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [status?.boost?.endTime])

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader2 size={28} color="#FF192C" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const config = status?.config || { credits: 50, duration: 30 }
  const credits = status?.credits || 0
  const canAfford = credits >= config.credits

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '5rem', height: '5rem',
          borderRadius: '1.5rem',
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
          boxShadow: '0 8px 32px rgba(249,115,22,0.35)',
        }}>
          <Zap size={40} color="#fff" fill="#fff" />
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', marginBottom: '0.5rem' }}>Boost Your Profile</h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', maxWidth: '24rem', margin: '0 auto' }}>
          Pin your profile to the top of discovery and get up to 10× more views!
        </p>
      </div>

      {/* Active boost banner */}
      {status?.active && status.boost && (
        <div style={{
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          borderRadius: '1.25rem',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          color: '#fff',
          boxShadow: '0 6px 24px rgba(249,115,22,0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-1.5rem', right: '-1.5rem', width: '8rem', height: '8rem', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '0.75rem', height: '0.75rem', background: '#86efac', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Boost Active!</span>
          </div>
          <p style={{ opacity: 0.85, fontSize: '0.85rem', marginBottom: '1rem' }}>
            Your profile is pinned at the top of discovery. Make it count! 🔥
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(255,255,255,0.2)', borderRadius: '0.875rem', padding: '0.5rem 1rem',
          }}>
            <Clock size={16} color="#fff" />
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{timeLeftStr}</span>
            <span style={{ opacity: 0.75, fontSize: '0.82rem' }}>remaining</span>
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
        </div>
      )}

      {/* Main card */}
      {!status?.active && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          {/* Features grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { icon: TrendingUp, label: 'Top Placement', desc: 'Appear #1 in discovery', color: '#eff6ff', iconColor: '#2563eb' },
              { icon: Users, label: '10× More Views', desc: 'Massive visibility boost', color: '#f0fdf4', iconColor: '#16a34a' },
              { icon: Star, label: '⚡ Badge', desc: 'Special boost indicator', color: '#fff7ed', iconColor: '#ea580c' },
            ].map((f, i) => (
              <div key={i} style={{
                textAlign: 'center',
                padding: '0.875rem 0.5rem',
                borderRadius: '0.875rem',
                background: f.color,
                transition: 'transform 0.2s',
              }}>
                <div style={{
                  width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #FF192C, #ff5f6b)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.5rem',
                }}>
                  <f.icon size={16} color="#fff" />
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.2rem' }}>{f.label}</p>
                <p style={{ fontSize: '0.68rem', color: '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Price display */}
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed, #fff)',
            border: '1.5px solid #fed7aa',
            borderRadius: '1rem',
            padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                <Zap size={16} color="#f97316" />
                <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem' }}>Profile Boost</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{config.duration} minutes of top placement</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{config.credits}</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>credits</p>
            </div>
          </div>

          {/* Credits balance */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f9fafb', borderRadius: '0.875rem', padding: '0.875rem 1rem',
            marginBottom: '1rem',
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280' }}>💳 Your balance</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: canAfford ? '#111827' : '#ef4444' }}>
              {credits} credits
            </span>
          </div>

          {!canAfford && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '0.875rem',
              padding: '0.875rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#dc2626',
              display: 'flex', gap: '0.5rem',
            }}>
              <span>⚠️</span>
              <span>You need {config.credits} credits to boost. <a href="/credits" style={{ fontWeight: 700, color: '#dc2626' }}>Buy credits</a> to continue.</span>
            </div>
          )}

          <button
            onClick={activateBoost}
            disabled={boosting || !canAfford}
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '1rem',
              border: 'none',
              background: canAfford ? 'linear-gradient(135deg, #f97316, #ef4444)' : '#e5e7eb',
              color: canAfford ? '#fff' : '#9ca3af',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: canAfford ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              boxShadow: canAfford ? '0 6px 24px rgba(249,115,22,0.35)' : 'none',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}>
            {boosting ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Activating...</>
            ) : (
              <><Zap size={18} fill={canAfford ? '#fff' : '#9ca3af'} /> Boost for {config.duration} min · {config.credits} credits</>
            )}
          </button>
        </div>
      )}

      {/* How it works */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <p style={{ fontWeight: 800, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
          <Crown size={16} color="#f59e0b" /> How Boost Works
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {[
            { step: '1', text: 'Your profile moves to the very top of the Discover page for everyone', bg: '#3b82f6' },
            { step: '2', text: 'A special ⚡ badge appears on your profile so people notice you', bg: '#f97316' },
            { step: '3', text: 'After the boost period, your profile returns to normal ranking', bg: '#22c55e' },
          ].map((item) => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{
                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                background: item.bg, color: '#fff',
                fontSize: '0.75rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: '0.1rem',
              }}>{item.step}</div>
              <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: '1.6' }}>{item.text}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
          <a href="/credits" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: '0.85rem', color: '#FF192C', fontWeight: 700, textDecoration: 'none',
          }}>
            <span>Need more credits? Get them here</span>
            <ChevronRight size={16} />
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
