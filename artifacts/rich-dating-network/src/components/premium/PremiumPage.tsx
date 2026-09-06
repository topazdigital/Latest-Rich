import { useState } from 'react'
import { Crown, Check, Loader2, MessageCircle, Eye, Star, Heart, Gift, Zap, Phone, Shield, Lock, Upload } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLocation } from 'wouter'

interface Props {
  user: any
  packages: any[]
  paymentMethod?: any
  providerInfo?: any
  customGateways?: any[]
  hasManualGateways?: boolean
  activeTab?: 'auto' | 'manual'
  setActiveTab?: (t: 'auto' | 'manual') => void
  selectedGateway?: any
  setSelectedGateway?: (g: any) => void
  selectedPkg?: any
  setSelectedPkg?: (p: any) => void
  proof?: string
  setProof?: (p: string) => void
  submitting?: boolean
  loading?: boolean
  formatLocalPrice?: (price: number, provider: string, country: string) => string
  handleBuy?: (pkg: any) => void
  handleCustomSubmit?: () => void
  hasLocalMethod?: boolean
  useCard?: boolean
  setUseCard?: (v: boolean) => void
  originalProviderInfo?: any
  effectiveProvider?: string
}

export default function PremiumPage({
  user, packages,
  paymentMethod, providerInfo, customGateways = [], hasManualGateways = false,
  activeTab = 'auto', setActiveTab, selectedGateway, setSelectedGateway,
  selectedPkg, setSelectedPkg, proof = '', setProof, submitting = false, loading = false,
  formatLocalPrice, handleBuy, handleCustomSubmit,
  hasLocalMethod = false, useCard = false, setUseCard, originalProviderInfo, effectiveProvider,
}: Props) {
  const [localSelected, setLocalSelected] = useState(packages.find(p => p.popular === 1) || packages[0])
  const { token } = useAuth()
  const [, setLocation] = useLocation()
  const [localLoading, setLocalLoading] = useState(false)
  const isPremium = user?.premium === 1
  const premiumExpiry = user?.premiumExpiry ? new Date(user.premiumExpiry * 1000) : null
  const premiumPriority = Math.max(1, user?.premiumPriority || 1)
  const tierBenefits = premiumPriority >= 4
    ? ['Top discovery placement', '5 daily Superlikes', 'Free monthly gift', 'Priority support']
    : premiumPriority >= 3
      ? ['Enhanced discovery placement', '3 daily Superlikes', 'Free monthly gift']
      : premiumPriority >= 2
        ? ['Priority discovery placement', '2 daily Superlikes']
        : ['Standard premium access']

  const provider = paymentMethod?.provider || 'paystack'
  const country = paymentMethod?.country || ''

  const features = [
    { icon: <Phone size={16} />, t: 'Contact Sharing (Priority 2+)', d: 'Send phone numbers & WhatsApp in chat', premium: true },
    { icon: <MessageCircle size={16} />, t: 'Social Sharing (Priority 2+)', d: 'Share Instagram, Telegram & more in chat', premium: true },
    { icon: <Eye size={16} />, t: 'See Profile Visitors', d: 'Know exactly who viewed your profile', premium: true },
    { icon: <Star size={16} />, t: 'Priority Placement', d: 'Appear at the top of search results', premium: true },
    { icon: <Check size={16} />, t: 'Read Receipts', d: 'Know when your messages are read', premium: false },
    { icon: <Heart size={16} />, t: 'Unlimited Likes', d: 'Like as many profiles as you want', premium: false },
    { icon: <Gift size={16} />, t: 'Free Monthly Gift', d: 'One free virtual gift each month', premium: true },
    { icon: <Crown size={16} />, t: 'VIP Badge', d: 'Exclusive gold crown badge on your profile', premium: true },
    { icon: <Zap size={16} />, t: 'Superlike x5/day', d: '5 superlikes daily to stand out', premium: false },
    { icon: <Shield size={16} />, t: 'Priority Support', d: 'Dedicated VIP customer support', premium: true },
  ]

  // Fallback subscribe via Paystack (when wrapper hasn't supplied handleBuy)
  async function fallbackSubscribe(pkg: any) {
    setLocalLoading(true)
    try {
      const res = await fetch('/api/payments/paystack/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ packageId: pkg.id, type: 'premium' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Payment gateway not configured. Please contact support.')
    } catch { alert('Payment failed. Please try again.') }
    finally { setLocalLoading(false) }
  }

  function onSelectPkg(pkg: any) {
    setLocalSelected(pkg)
    if (setSelectedPkg) setSelectedPkg(pkg)
  }

  function onBuy(pkg: any) {
    if (handleBuy) handleBuy(pkg)
    else fallbackSubscribe(pkg)
  }

  const displaySelected = selectedPkg || localSelected
  const displayLoading = loading || localLoading

  if (isPremium) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0a0e, #3d0d1a, #7a1226)' }}>
          <div className="p-8 md:p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto mb-6">
              <Crown size={40} className="text-yellow-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">You're VIP! 👑</h1>
            <p className="text-white/60 mb-3">You have premium access with your plan&apos;s benefits unlocked.</p>
            <div className="inline-flex items-center gap-2 bg-amber-400/15 border border-amber-300/30 rounded-full px-4 py-2 mb-5">
              <Star size={14} className="text-yellow-400" />
              <span className="text-yellow-200 text-sm font-semibold">Priority level {premiumPriority}</span>
            </div>
            {premiumExpiry && (
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 mb-6">
                <Shield size={16} className="text-yellow-400" />
                <span className="text-white/80 text-sm">Active until <strong className="text-white">{premiumExpiry.toLocaleDateString()}</strong></span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {tierBenefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 bg-white/10 rounded-2xl p-3 text-left">
                  <Check size={15} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-white/80 text-xs font-medium">{benefit}</span>
                </div>
              ))}
            </div>
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

      {/* Why Premium callout */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
          <Lock size={18} className="text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm mb-1">Why Premium?</div>
          <p className="text-gray-600 text-sm leading-relaxed">
            To protect all members, contact info (phones, social handles, emails, links) can only be shared in chat by <strong>Priority 2 Premium members or higher</strong>. Choose at least the 2-week plan to unlock contact sharing.
          </p>
        </div>
      </div>

      {/* Payment method tabs */}
      {hasManualGateways && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#f9fafb', borderRadius: '0.875rem', padding: '0.3rem' }}>
          <button onClick={() => setActiveTab?.('auto')} style={{
            flex: 1, padding: '0.6rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: activeTab === 'auto' ? '#fff' : 'transparent',
            color: activeTab === 'auto' ? '#111827' : '#6b7280',
            fontWeight: 700, fontSize: '0.82rem',
            boxShadow: activeTab === 'auto' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {providerInfo?.icon || '💳'} {providerInfo?.name || 'Card'}
          </button>
          <button onClick={() => setActiveTab?.('manual')} style={{
            flex: 1, padding: '0.6rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: activeTab === 'manual' ? '#fff' : 'transparent',
            color: activeTab === 'manual' ? '#111827' : '#6b7280',
            fontWeight: 700, fontSize: '0.82rem',
            boxShadow: activeTab === 'manual' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            🏦 Manual Transfer
          </button>
        </div>
      )}

      {/* Auto payment — package grid */}
      {(activeTab === 'auto' || !hasManualGateways) && (
        <>
          {/* Method switcher: M-Pesa/GCash users can choose Card instead */}
          {hasLocalMethod && setUseCard && originalProviderInfo && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#f9fafb', borderRadius: '0.875rem', padding: '0.3rem' }}>
              <button onClick={() => setUseCard(false)} style={{
                flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: !useCard ? '#fff' : 'transparent', color: !useCard ? '#111827' : '#6b7280',
                fontWeight: 700, fontSize: '0.82rem', boxShadow: !useCard ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
              }}>
                {originalProviderInfo.icon} {originalProviderInfo.name}
              </button>
              <button onClick={() => setUseCard(true)} style={{
                flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: useCard ? '#fff' : 'transparent', color: useCard ? '#111827' : '#6b7280',
                fontWeight: 700, fontSize: '0.82rem', boxShadow: useCard ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s',
              }}>
                💳 Pay by Card
              </button>
            </div>
          )}
          {providerInfo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.4rem 0.875rem', fontSize: '0.82rem', fontWeight: 600 }}>
              <span>{providerInfo.icon}</span>
              <span style={{ color: providerInfo.color }}>Paying with {providerInfo.name}</span>
              {paymentMethod?.country && !useCard && <span style={{ color: '#6b7280' }}>({paymentMethod.country})</span>}
            </div>
          )}

          {packages.length > 0 && (
            <div className={`grid gap-3 mb-6 ${packages.length <= 2 ? 'grid-cols-2' : packages.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
              {packages.map((pkg: any) => (
                <button key={pkg.id} onClick={() => onSelectPkg(pkg)}
                  className={`relative rounded-2xl p-4 text-center transition-all border-2 ${
                    displaySelected?.id === pkg.id
                      ? 'border-brand-500 bg-brand-50 shadow-lg shadow-brand-500/10'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                  }`}>
                  {pkg.popular === 1 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-brand text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <div className="font-bold text-gray-900 text-sm mb-1 mt-1">{pkg.name}</div>
                  <div className="text-2xl font-black text-brand-500 my-2">
                    {useCard ? `$${pkg.price}` : formatLocalPrice ? formatLocalPrice(pkg.price, effectiveProvider || provider, country) : `$${pkg.price}`}
                  </div>
                  <div className="text-xs font-semibold text-amber-600">Priority level {pkg.priority || pkg.id}</div>
                  {formatLocalPrice && country && !useCard && (
                    <div className="text-xs text-gray-400">≈ ${pkg.price}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">{pkg.description}</div>
                  {displaySelected?.id === pkg.id && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => displaySelected && onBuy(displaySelected)}
            disabled={displayLoading || !displaySelected}
            className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-brand-500/20 mb-3"
            style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
            {displayLoading ? <Loader2 size={20} className="animate-spin" /> : <Crown size={20} />}
            {displaySelected ? `Get ${displaySelected.name} — ${useCard ? `$${displaySelected.price}` : formatLocalPrice ? formatLocalPrice(displaySelected.price, effectiveProvider || provider, country) : `$${displaySelected.price}`}` : 'Select a plan'}
          </button>
          <p className="text-center text-xs text-gray-400 mb-8">Secure payment · Instant activation</p>
        </>
      )}

      {/* Manual transfer tab */}
      {activeTab === 'manual' && hasManualGateways && (
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Select Payment Method:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {customGateways.map((g: any) => (
              <div key={g.id} onClick={() => setSelectedGateway?.(g)} style={{
                padding: '1rem', borderRadius: '0.875rem', cursor: 'pointer',
                border: `2px solid ${selectedGateway?.id === g.id ? '#FF192C' : '#e5e7eb'}`,
                background: selectedGateway?.id === g.id ? '#fff0f1' : '#fff',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '1rem',
              }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                  {g.logo || '💳'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{g.name}</p>
                  {g.description && <p style={{ color: '#4b5563', fontSize: '0.78rem', marginTop: '0.15rem' }}>{g.description}</p>}
                  <p style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '0.2rem' }}>⏱ Up to {g.reviewTime}h review</p>
                </div>
                {selectedGateway?.id === g.id && <span style={{ color: '#FF192C', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>}
              </div>
            ))}
          </div>

          {selectedGateway && (
            <>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Select Package:</p>
              <div className={`grid gap-3 mb-5 ${packages.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                {packages.map((pkg: any) => (
                  <div key={pkg.id} onClick={() => onSelectPkg(pkg)} style={{
                    padding: '0.875rem', borderRadius: '0.875rem', cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${displaySelected?.id === pkg.id ? '#FF192C' : '#e5e7eb'}`,
                    background: displaySelected?.id === pkg.id ? '#fff0f1' : '#fff',
                    transition: 'all 0.15s',
                  }}>
                    <p style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>{pkg.name}</p>
                     <p style={{ color: '#FF192C', fontWeight: 700, fontSize: '0.85rem' }}>${pkg.price}</p>
                     <p style={{ color: '#b45309', fontWeight: 700, fontSize: '0.72rem' }}>Priority level {pkg.priority || pkg.id}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>{pkg.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedGateway && displaySelected && (
            <div style={{ background: '#f9fafb', borderRadius: '0.875rem', padding: '1.25rem' }}>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                {selectedGateway.proofLabel || 'Payment Proof'}
              </p>
              <textarea
                value={proof}
                onChange={e => setProof?.(e.target.value)}
                placeholder="Enter your transaction ID, reference number, or describe your payment..."
                rows={3}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
              />
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.35rem' }}>After submitting, your payment will be reviewed and premium activated within {selectedGateway.reviewTime} hour(s).</p>
              <button
                onClick={handleCustomSubmit}
                disabled={!proof.trim() || submitting}
                style={{
                  marginTop: '0.875rem', width: '100%', padding: '0.8rem', borderRadius: '0.875rem', border: 'none',
                  background: !proof.trim() || submitting ? '#e5e7eb' : '#FF192C',
                  color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                  cursor: proof.trim() && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}>
                {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Upload size={16} /> Submit Payment Proof</>}
              </button>
            </div>
          )}
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
    </div>
  )
}
