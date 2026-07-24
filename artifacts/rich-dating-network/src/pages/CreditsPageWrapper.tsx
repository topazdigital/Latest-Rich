import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authFetch } from '../lib/auth'
import { Loader2, Upload, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const PKG_COLORS = ['#6b7280', '#FF192C', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6']
const FALLBACK_PACKAGES = [
  { id: 1, credits: 100, usdPrice: 4.99, popular: false, label: 'Starter', color: '#6b7280' },
  { id: 2, credits: 250, usdPrice: 9.99, popular: true, label: 'Popular', color: '#FF192C', badge: '🔥 Most Popular' },
  { id: 3, credits: 500, usdPrice: 17.99, popular: false, label: 'Value', color: '#8b5cf6' },
  { id: 4, credits: 1000, usdPrice: 29.99, popular: false, label: 'Best Value', color: '#f59e0b', badge: '💎 Best Deal' },
]

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string; instruction: string }> = {
  payhero: { name: 'M-Pesa', icon: '📱', color: '#00a651', instruction: 'Enter your M-Pesa phone number (07XXXXXXXX). You will receive an STK push to enter your PIN.' },
  paystack: { name: 'Card / Bank Transfer', icon: '🏦', color: '#00c3f7', instruction: 'You will be redirected to a secure Paystack payment page.' },
  paymongo: { name: 'GCash / Maya / Card', icon: '📲', color: '#7c3aed', instruction: 'You will be redirected to choose GCash, Maya, or Credit Card.' },
}

function formatLocalPrice(usdPrice: number, provider: string, userCountry: string): string {
  const rates: Record<string, [number, string]> = {
    KE: [130, 'KES'], TZ: [2500, 'TZS'], UG: [3700, 'UGX'], RW: [1300, 'RWF'],
    NG: [1600, 'NGN'], GH: [12, 'GHS'], ZA: [19, 'ZAR'], PH: [56, 'PHP'],
  }
  const entry = rates[userCountry?.toUpperCase()]
  if (!entry) return `${usdPrice}`
  const [rate, currency] = entry
  return `${currency} ${Math.round(usdPrice * rate).toLocaleString()}`
}

export default function CreditsPageWrapper() {
  const { user, token, refreshUser } = useAuth()
  const [packages, setPackages] = useState(FALLBACK_PACKAGES)
  const [orders, setOrders] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [mpesaRef, setMpesaRef] = useState('')
  const [countdown, setCountdown] = useState(90)
  const [pollOutcome, setPollOutcome] = useState<'waiting' | 'success' | 'cancelled' | 'failed' | 'timeout'>('waiting')
  const [step, setStep] = useState<'packages' | 'confirm' | 'polling'>('packages')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [paymentType] = useState<'credits'>('credits')
  const [customGateways, setCustomGateways] = useState<any[]>([])
  const [selectedGateway, setSelectedGateway] = useState<any>(null)
  const [proof, setProof] = useState('')
  const [customOrders, setCustomOrders] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [useCard, setUseCard] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [offers, setOffers] = useState<any>(null)
  const [offerLoading, setOfferLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/credits/packages').then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d) && d.length > 0) {
        const mapped = d.filter(p => p.active !== 0).map((p, i) => ({
          id: i + 1,
          credits: p.credits,
          usdPrice: p.price,
          popular: !!p.popular,
          label: p.description || '',
          color: PKG_COLORS[i] || PKG_COLORS[0],
          badge: p.popular ? '🔥 Most Popular' : undefined,
        }))
        if (mapped.length > 0) setPackages(mapped)
      }
    }).catch(() => {})
    fetch('/api/engagement/offers').then(r => r.json()).then(setOffers).catch(() => {})
  }, [])

  async function buyOffer(kind: 'starter' | 'event', eventId?: number) {
    setOfferLoading(kind === 'event' ? `event-${eventId}` : kind)
    try {
      const res = await authFetch('/api/engagement/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, eventId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Offer unavailable'); return }
      if (data.url) window.location.href = data.url
    } catch { toast.error('Could not start checkout') }
    finally { setOfferLoading(null) }
  }

  useEffect(() => {
    if (!token) return
    authFetch('/api/payments/method').then(r => r.json()).then(setPaymentMethod).catch(() => {})
    authFetch('/api/credits/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
    authFetch('/api/custom-payments/gateways').then(r => r.json()).then(d => setCustomGateways(Array.isArray(d) ? d : [])).catch(() => {})
    authFetch('/api/custom-payments/my-orders').then(r => r.json()).then(d => setCustomOrders(Array.isArray(d) ? d : [])).catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      toast.success('Payment successful! Credits added. 🎉')
      refreshUser()
      authFetch('/api/credits/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
    }
    if (params.get('pending')) toast.success('Payment received — your credits will appear shortly.')
    if (params.get('error')) toast.error('Payment failed. Please try again.')
    if (params.get('cancelled')) toast.error('Payment cancelled.')

    const interval = setInterval(() => { refreshUser() }, 30_000)
    return () => clearInterval(interval)
  }, [token])

  const provider = paymentMethod?.provider || 'paystack'
  const hasLocalMethod = provider === 'payhero' || provider === 'paymongo'
  const effectiveProvider = hasLocalMethod && useCard ? 'paystack' : provider
  const providerInfo = PROVIDER_INFO[effectiveProvider] || PROVIDER_INFO.paystack
  const pkg = packages.find(p => p.id === selectedPkg)

  const mpesaGateway = customGateways.find((g: any) => (g.name || '').toLowerCase().replace(/[^a-z]/g, '').includes('mpesa')) || null
  const otherGateways = customGateways.filter((g: any) => g.id !== mpesaGateway?.id)

  async function handleBuy(pkgId: number) {
    setSelectedPkg(pkgId)
    if (effectiveProvider === 'payhero') {
      setShowManual(false)
      setProof('')
      setStep('confirm')
    } else {
      await initiatePayment(pkgId)
    }
  }

  async function initiatePayment(pkgId: number, phoneNum?: string) {
    setLoading(true)
    try {
      let endpoint = '/api/payments/paystack/initiate'
      let body: any = { packageId: pkgId, type: paymentType }

      if (effectiveProvider === 'payhero') {
        endpoint = '/api/payments/payhero/initiate'
        body.phone = phoneNum || phone
      } else if (effectiveProvider === 'paymongo') {
        endpoint = '/api/payments/paymongo/initiate'
        body.paymentMethod = 'gcash'
      } else {
        endpoint = '/api/payments/paystack/initiate'
        body.email = user?.email
      }

      const res = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error || 'Payment failed'); setLoading(false); return }

      if (data.url) {
        window.location.href = data.url
      } else if (data.reference) {
        setMpesaRef(data.reference)
        setStep('polling')
        toast.success(data.message || 'Request sent! Check your phone.')
        pollMpesaStatus(data.reference)
      }
    } catch { toast.error('Something went wrong') }
    setLoading(false)
  }

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    setPolling(false)
  }, [])

  const pollMpesaStatus = useCallback((ref: string) => {
    setPolling(true)
    setPollOutcome('waiting')
    setCountdown(90)

    // Countdown timer — ticks every second
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          stopPolling()
          setPollOutcome('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Status poller — checks PayHero every 4 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await authFetch(`/api/payments/payhero/status/${ref}`)
        const data = await res.json()

        if (data.finalStatus === 'completed' || data.orderStatus === 'completed') {
          stopPolling()
          setPollOutcome('success')
          toast.success('Payment received! Credits added. 🎉')
          await refreshUser()
          authFetch('/api/credits/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
          return
        }
        if (data.finalStatus === 'cancelled') {
          stopPolling()
          setPollOutcome('cancelled')
          return
        }
        if (data.finalStatus === 'failed') {
          stopPolling()
          setPollOutcome('failed')
          return
        }
      } catch { /* network hiccup — keep polling */ }
    }, 4000)
  }, [stopPolling, refreshUser])

  async function handleCustomSubmit(gatewayOverride?: any) {
    const gateway = gatewayOverride || selectedGateway
    if (!gateway || !selectedPkg || !proof.trim()) {
      toast.error('Please select a package and enter your payment proof')
      return
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/custom-payments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayId: gateway.id,
          type: 'credits',
          packageId: selectedPkg,
          proof,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Submission failed'); setSubmitting(false); return }
      toast.success(`Payment submitted! It will be reviewed within ${data.reviewTime} hour(s).`)
      setStep('packages')
      setShowManual(false)
      setProof('')
      setSelectedGateway(null)
      setSelectedPkg(null)
      authFetch('/api/custom-payments/my-orders').then(r => r.json()).then(d => setCustomOrders(Array.isArray(d) ? d : [])).catch(() => {})
    } catch { toast.error('Something went wrong') }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>
          <span style={{ fontSize: '1.75rem' }}>💳</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginBottom: '0.4rem' }}>Get Credits</h1>
        <p style={{ color: '#374151', fontSize: '0.9rem' }}>Boost your profile, send gifts, and unlock premium features</p>
      </div>

      {/* Current balance */}
      <div style={{ background: 'linear-gradient(135deg,#fff0f1,#fff)', border: '1.5px solid #ffc5c9', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#111827', fontSize: '0.85rem', fontWeight: 700 }}>Your current balance</p>
          <p style={{ color: '#FF192C', fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1 }}>{user?.credits || 0} <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#d97706' }}>credits</span></p>
        </div>
        <div style={{ fontSize: '2rem' }}>💰</div>
      </div>

      {/* Payment options */}
      {step === 'packages' && (
        <>
          {offers?.starter && (
            <div style={{ marginBottom: '1rem', borderRadius: '1.25rem', padding: '1rem 1.25rem', background: 'linear-gradient(135deg,#fff7ed,#fff)', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2rem' }}>🎁</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 900, color: '#9a3412', fontSize: '0.95rem' }}>New here? Try chatting for $1</p>
                <p style={{ color: '#6b7280', fontSize: '0.78rem' }}>Get 3 credits to start a conversation today.</p>
              </div>
              <button onClick={() => buyOffer('starter')} disabled={!!offerLoading} style={{ border: 'none', borderRadius: '0.75rem', padding: '0.65rem 0.85rem', background: '#f97316', color: '#fff', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {offerLoading === 'starter' ? 'Starting…' : '$1 trial'}
              </button>
            </div>
          )}
          {offers?.events?.length > 0 && (
            <div style={{ marginBottom: '1rem', borderRadius: '1.25rem', padding: '1rem 1.25rem', background: '#fdf4ff', border: '1px solid #f0abfc' }}>
              <p style={{ fontWeight: 900, color: '#86198f', fontSize: '0.95rem', marginBottom: '0.6rem' }}>Exclusive events</p>
              {offers.events.map((event: any) => (
                <div key={event.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 0' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.82rem' }}>{event.title}</p>
                    <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>{event.description || 'Curated members-only access'}</p>
                  </div>
                  <button onClick={() => buyOffer('event', event.id)} disabled={!!offerLoading} style={{ border: 'none', borderRadius: '0.7rem', padding: '0.5rem 0.75rem', background: '#a21caf', color: '#fff', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>
                    ${Number(event.ticketPrice || 1).toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Payment method switcher (M-Pesa / GCash users can switch to Card) */}
          {hasLocalMethod && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#f9fafb', borderRadius: '0.875rem', padding: '0.3rem' }}>
              <button onClick={() => setUseCard(false)} style={{
                flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: !useCard ? '#fff' : 'transparent',
                color: !useCard ? '#111827' : '#6b7280',
                fontWeight: 700, fontSize: '0.82rem',
                boxShadow: !useCard ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {PROVIDER_INFO[provider]?.icon} {PROVIDER_INFO[provider]?.name}
              </button>
              <button onClick={() => setUseCard(true)} style={{
                flex: 1, padding: '0.55rem 0.5rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: useCard ? '#fff' : 'transparent',
                color: useCard ? '#111827' : '#6b7280',
                fontWeight: 700, fontSize: '0.82rem',
                boxShadow: useCard ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                💳 Pay by Card
              </button>
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.4rem 0.875rem', fontSize: '0.82rem', fontWeight: 600 }}>
            <span>{providerInfo.icon}</span>
            <span style={{ color: providerInfo.color }}>Paying with {providerInfo.name}</span>
            {paymentMethod?.country && !useCard && <span style={{ color: '#6b7280' }}>({paymentMethod.country})</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
            {packages.map(pkg => (
              <div key={pkg.id} onClick={() => handleBuy(pkg.id)} style={{
                border: `2px solid ${pkg.popular ? pkg.color : '#e5e7eb'}`,
                borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer',
                background: pkg.popular ? `linear-gradient(135deg,${pkg.color}08,#fff)` : '#fff',
                position: 'relative', transition: 'all 0.2s',
                boxShadow: pkg.popular ? `0 4px 20px ${pkg.color}20` : '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                {pkg.badge && (
                  <div style={{ position: 'absolute', top: '-0.625rem', left: '50%', transform: 'translateX(-50%)', background: pkg.color, color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {pkg.badge}
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827' }}>{pkg.credits}</span>
                  <span style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 700 }}> credits</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '0.75rem', fontWeight: 700 }}>
                  {useCard ? `$${pkg.usdPrice}` : formatLocalPrice(pkg.usdPrice, effectiveProvider, paymentMethod?.country || '')}
                  {effectiveProvider === 'payhero' && <span style={{ color: '#6b7280' }}> ≈ ${pkg.usdPrice}</span>}
                </div>
                <button style={{
                  width: '100%', padding: '0.55rem', borderRadius: '0.75rem', border: 'none',
                  background: loading && selectedPkg === pkg.id ? '#e5e7eb' : pkg.color,
                  color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  {loading && selectedPkg === pkg.id ? 'Processing...' : `Buy ${pkg.credits} Credits`}
                </button>
              </div>
            ))}
          </div>

          {/* Other manual payment methods (e.g. bank transfer for countries without M-Pesa) */}
          {otherGateways.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.85rem', marginBottom: '0.75rem' }}>Other payment methods:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {otherGateways.map((g: any) => (
                  <div key={g.id} onClick={() => setSelectedGateway(selectedGateway?.id === g.id ? null : g)} style={{
                    padding: '1rem', borderRadius: '0.875rem', cursor: 'pointer',
                    border: `2px solid ${selectedGateway?.id === g.id ? '#FF192C' : '#e5e7eb'}`,
                    background: selectedGateway?.id === g.id ? '#fff0f1' : '#fff',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

                    {selectedGateway?.id === g.id && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f3d7d8' }} onClick={e => e.stopPropagation()}>
                        <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Select package:</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '0.9rem' }}>
                          {packages.map(p => (
                            <div key={p.id} onClick={() => setSelectedPkg(p.id)} style={{
                              padding: '0.65rem', borderRadius: '0.625rem', cursor: 'pointer', textAlign: 'center',
                              border: `2px solid ${selectedPkg === p.id ? p.color : '#e5e7eb'}`,
                              background: selectedPkg === p.id ? `${p.color}08` : '#fff',
                            }}>
                              <p style={{ fontWeight: 800, color: '#111827', fontSize: '0.85rem' }}>{p.credits} credits</p>
                              <p style={{ color: '#6b7280', fontSize: '0.72rem' }}>${p.usdPrice}</p>
                            </div>
                          ))}
                        </div>
                        {selectedPkg && (
                          <>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                              {g.proofLabel || 'Payment Proof'}
                            </label>
                            <textarea
                              value={proof}
                              onChange={e => setProof(e.target.value)}
                              placeholder="Enter your transaction ID, reference number, or describe your payment..."
                              rows={2}
                              style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
                            />
                            <button
                              onClick={() => handleCustomSubmit(g)}
                              disabled={!proof.trim() || submitting}
                              style={{
                                marginTop: '0.7rem', width: '100%', padding: '0.7rem', borderRadius: '0.75rem', border: 'none',
                                background: !proof.trim() || submitting ? '#e5e7eb' : '#FF192C',
                                color: '#fff', fontWeight: 800, fontSize: '0.82rem', cursor: proof.trim() && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                              }}>
                              {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Upload size={16} /> Submit Payment Proof</>}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step: M-Pesa phone confirm */}
      {step === 'confirm' && pkg && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '1.25rem', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📱</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.35rem' }}>Pay with M-Pesa</h2>
            <p style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 600 }}>{pkg.credits} credits · {formatLocalPrice(pkg.usdPrice, provider, paymentMethod?.country || '')}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Your M-Pesa Phone Number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0712345678 or +254712345678"
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.875rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '0.35rem' }}>We will send an STK push to this number.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setStep('packages')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            <button onClick={() => initiatePayment(pkg.id)} disabled={!phone.trim() || loading} style={{
              flex: 2, padding: '0.75rem', borderRadius: '0.875rem', border: 'none',
              background: !phone.trim() ? '#e5e7eb' : '#00a651', color: '#fff',
              fontWeight: 800, cursor: phone.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : '📱 Send M-Pesa Request'}
            </button>
          </div>

          {/* Manual fallback — pay via Till and submit proof, in case STK push fails */}
          {mpesaGateway && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed #e5e7eb' }}>
              {!showManual ? (
                <button onClick={() => setShowManual(true)} style={{
                  width: '100%', padding: '0.6rem', borderRadius: '0.75rem', border: '1.5px dashed #d1d5db',
                  background: 'transparent', color: '#374151', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Trouble with the STK push? Pay manually instead
                </button>
              ) : (
                <div style={{ background: '#f9fafb', borderRadius: '0.875rem', padding: '1.1rem' }}>
                  <p style={{ fontWeight: 800, color: '#111827', fontSize: '0.9rem', marginBottom: '0.5rem' }}>📱 Pay Manually via M-Pesa Till</p>
                  <p style={{ color: '#4b5563', fontSize: '0.8rem', lineHeight: 1.6, marginBottom: '0.9rem' }}>{mpesaGateway.description}</p>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                    {mpesaGateway.proofLabel || 'Payment Proof'}
                  </label>
                  <textarea
                    value={proof}
                    onChange={e => setProof(e.target.value)}
                    placeholder="Enter your M-Pesa transaction code, e.g. QFT1XXXXXX"
                    rows={2}
                    style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1.5px solid #e5e7eb', borderRadius: '0.75rem', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: '#fff' }}
                  />
                  <p style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.35rem' }}>After submitting, an admin will review it and credits will be added within {mpesaGateway.reviewTime} hour(s).</p>
                  <button
                    onClick={() => handleCustomSubmit(mpesaGateway)}
                    disabled={!proof.trim() || submitting}
                    style={{
                      marginTop: '0.8rem', width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: 'none',
                      background: !proof.trim() || submitting ? '#e5e7eb' : '#111827',
                      color: '#fff', fontWeight: 800, fontSize: '0.85rem', cursor: proof.trim() && !submitting ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    }}>
                    {submitting ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Upload size={16} /> Submit Payment Proof</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step: M-Pesa polling */}
      {step === 'polling' && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '1.25rem', padding: '2rem', textAlign: 'center' }}>

          {/* WAITING — user needs to enter PIN */}
          {pollOutcome === 'waiting' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📲</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>Check your phone!</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                An M-Pesa STK push has been sent to your phone.<br />
                Enter your <strong>M-Pesa PIN</strong> to complete the payment.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ position: 'relative', width: '5rem', height: '5rem' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke={countdown > 20 ? '#00a651' : countdown > 10 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 34}`}
                      strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / 90)}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: countdown > 20 ? '#00a651' : countdown > 10 ? '#f59e0b' : '#ef4444' }}>
                      {countdown}s
                    </span>
                  </div>
                </div>
                <p style={{ color: '#374151', fontSize: '0.8rem', fontWeight: 600 }}>Waiting for PIN confirmation…</p>
              </div>
            </>
          )}

          {/* SUCCESS */}
          {pollOutcome === 'success' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle size={56} color="#00a651" />
              </div>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827', marginBottom: '0.5rem' }}>Payment received!</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Your credits have been added to your account.</p>
              <button onClick={() => { setStep('packages'); setPollOutcome('waiting') }} style={{ padding: '0.7rem 2rem', borderRadius: '0.875rem', border: 'none', background: '#00a651', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Back to credits
              </button>
            </>
          )}

          {/* CANCELLED — user ignored / dismissed the STK push */}
          {pollOutcome === 'cancelled' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <XCircle size={56} color="#f59e0b" />
              </div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>PIN not entered</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                You dismissed or didn't respond to the M-Pesa prompt.<br />No charge was made. Try again and enter your PIN when prompted.
              </p>
              <button onClick={() => { setStep('confirm'); setPollOutcome('waiting') }} style={{ padding: '0.7rem 2rem', borderRadius: '0.875rem', border: 'none', background: '#00a651', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try again
              </button>
            </>
          )}

          {/* FAILED — payment declined or other error */}
          {pollOutcome === 'failed' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <XCircle size={56} color="#ef4444" />
              </div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>Payment failed</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                The M-Pesa payment was declined.<br />Check your M-Pesa balance and try again.
              </p>
              <button onClick={() => { setStep('confirm'); setPollOutcome('waiting') }} style={{ padding: '0.7rem 2rem', borderRadius: '0.875rem', border: 'none', background: '#FF192C', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try again
              </button>
            </>
          )}

          {/* TIMEOUT — took too long */}
          {pollOutcome === 'timeout' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Clock size={56} color="#9ca3af" />
              </div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>Request timed out</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                The STK push expired before your PIN was entered.<br />If you were charged, your credits will be added automatically. Otherwise, try again.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => { setStep('packages'); setPollOutcome('waiting') }} style={{ padding: '0.7rem 1.5rem', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Back
                </button>
                <button onClick={() => { setStep('confirm'); setPollOutcome('waiting') }} style={{ padding: '0.7rem 1.5rem', borderRadius: '0.875rem', border: 'none', background: '#00a651', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Try again
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* What credits buy */}
      {step === 'packages' && (
        <div style={{ background: '#f9fafb', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.875rem' }}>What you can do with credits:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {[
              { icon: '⚡', label: 'Boost Profile', cost: '50 credits/30 min' },
              { icon: '💝', label: 'Super Like', cost: '10 credits' },
              { icon: '🎁', label: 'Send Gifts', cost: '5–100 credits' },
              { icon: '📨', label: 'Unlock Messages', cost: 'Free with Premium' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{item.label}</p>
                  <p style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 500 }}>{item.cost}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order history */}
      {step === 'packages' && (orders.length > 0 || customOrders.length > 0) && (
        <div>
          <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Purchase History</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orders.slice(0, 5).map((o: any) => (
              <div key={`auto-${o.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid #f3f4f6' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{o.description}</p>
                  <p style={{ fontSize: '0.72rem', color: '#6b7280' }}>{new Date(o.time * 1000).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{o.currency} {o.amount}</p>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: o.status === 'completed' ? '#dcfce7' : '#fef9c3', color: o.status === 'completed' ? '#166534' : '#854d0e' }}>
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
            {customOrders.slice(0, 5).map((row: any) => (
              <div key={`custom-${row.order?.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid #f3f4f6' }}>
                <div>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>Manual: {row.gateway?.name}</p>
                  <p style={{ fontSize: '0.72rem', color: '#6b7280' }}>{new Date((row.order?.time || 0) * 1000).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{row.order?.currency} {row.order?.amount}</p>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: row.order?.status === 'completed' ? '#dcfce7' : row.order?.status === 'rejected' ? '#fee2e2' : '#fef9c3', color: row.order?.status === 'completed' ? '#166534' : row.order?.status === 'rejected' ? '#991b1b' : '#854d0e' }}>
                    {row.order?.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
