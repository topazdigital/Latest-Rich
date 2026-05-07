import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authFetch } from '../lib/auth'
import { Loader2, CreditCard, Phone, Building2, Zap, Crown, Check, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const PACKAGES = [
  { id: 1, credits: 100, usdPrice: 4.99, popular: false, label: 'Starter', color: '#6b7280' },
  { id: 2, credits: 250, usdPrice: 9.99, popular: true, label: 'Popular', color: '#FF192C', badge: '🔥 Most Popular' },
  { id: 3, credits: 500, usdPrice: 17.99, popular: false, label: 'Value', color: '#8b5cf6' },
  { id: 4, credits: 1000, usdPrice: 29.99, popular: false, label: 'Best Value', color: '#f59e0b', badge: '💎 Best Deal' },
]

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string; instruction: string }> = {
  payhero: { name: 'M-Pesa', icon: '📱', color: '#00a651', instruction: 'Enter your M-Pesa phone number (07XXXXXXXX). You will receive an STK push to enter your PIN.' },
  paystack: { name: 'Card / Bank Transfer', icon: '🏦', color: '#00c3f7', instruction: 'You will be redirected to a secure Paystack payment page.' },
  paymongo: { name: 'GCash / Maya / Card', icon: '📲', color: '#7c3aed', instruction: 'You will be redirected to choose GCash, Maya, or Credit Card.' },
  stripe: { name: 'Credit / Debit Card', icon: '💳', color: '#635bff', instruction: 'Secure payment via Visa, Mastercard, or Amex.' },
}

function formatLocalPrice(usdPrice: number, provider: string, userCountry: string): string {
  const rates: Record<string, [number, string]> = {
    KE: [130, 'KES'], TZ: [2500, 'TZS'], UG: [3700, 'UGX'], RW: [1300, 'RWF'],
    NG: [1600, 'NGN'], GH: [12, 'GHS'], ZA: [19, 'ZAR'],
    PH: [56, 'PHP'],
  }
  const entry = rates[userCountry?.toUpperCase()]
  if (!entry || provider === 'stripe') return `$${usdPrice}`
  const [rate, currency] = entry
  return `${currency} ${Math.round(usdPrice * rate).toLocaleString()}`
}

export default function CreditsPageWrapper() {
  const { user, token } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [selectedPkg, setSelectedPkg] = useState<number | null>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [mpesaRef, setMpesaRef] = useState('')
  const [step, setStep] = useState<'packages' | 'confirm' | 'polling'>('packages')
  const [paymentType, setPaymentType] = useState<'credits' | 'premium'>('credits')

  useEffect(() => {
    if (!token) return
    authFetch('/api/payments/method').then(r => r.json()).then(setPaymentMethod).catch(() => {})
    authFetch('/api/credits/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})

    // Handle success/error from URL params
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) toast.success('Payment successful! Credits added. 🎉')
    if (params.get('error')) toast.error('Payment failed. Please try again.')
    if (params.get('cancelled')) toast.error('Payment cancelled.')
  }, [token])

  const provider = paymentMethod?.provider || 'stripe'
  const providerInfo = PROVIDER_INFO[provider] || PROVIDER_INFO.stripe
  const pkg = PACKAGES.find(p => p.id === selectedPkg)

  async function handleBuy(pkgId: number) {
    setSelectedPkg(pkgId)
    if (provider === 'payhero') {
      setStep('confirm')
    } else {
      await initiatePayment(pkgId)
    }
  }

  async function initiatePayment(pkgId: number, phoneNum?: string) {
    setLoading(true)
    try {
      let endpoint = '/api/payments/stripe/checkout'
      let body: any = { packageId: pkgId, type: paymentType }

      if (provider === 'payhero') {
        endpoint = '/api/payments/payhero/initiate'
        body.phone = phoneNum || phone
      } else if (provider === 'paystack') {
        endpoint = '/api/payments/paystack/initiate'
        body.email = user?.email
      } else if (provider === 'paymongo') {
        endpoint = '/api/payments/paymongo/initiate'
        body.paymentMethod = 'gcash'
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

  async function pollMpesaStatus(ref: string) {
    setPolling(true)
    let attempts = 0
    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await authFetch(`/api/payments/payhero/status/${ref}`)
        const data = await res.json()
        if (data.orderStatus === 'completed' || data.ResultCode === 0) {
          clearInterval(interval)
          setPolling(false)
          toast.success('Payment successful! Credits added. 🎉')
          setStep('packages')
          authFetch('/api/credits/orders').then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {})
        } else if (data.ResultCode && data.ResultCode !== 0) {
          clearInterval(interval)
          setPolling(false)
          toast.error('M-Pesa payment failed or cancelled')
          setStep('packages')
        }
      } catch {}
      if (attempts >= 20) { clearInterval(interval); setPolling(false) }
    }, 5000)
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: '4rem', height: '4rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(245,158,11,0.3)' }}>
          <span style={{ fontSize: '1.75rem' }}>💳</span>
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginBottom: '0.4rem' }}>Get Credits</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Use credits to boost your profile, send gifts, and unlock premium features</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '0.4rem 0.875rem', fontSize: '0.82rem', fontWeight: 600 }}>
          <span>{providerInfo.icon}</span>
          <span style={{ color: providerInfo.color }}>Paying with {providerInfo.name}</span>
          {paymentMethod?.country && <span style={{ color: '#9ca3af' }}>({paymentMethod.country})</span>}
        </div>
      </div>

      {/* Current balance */}
      <div style={{ background: 'linear-gradient(135deg,#fff0f1,#fff)', border: '1.5px solid #ffc5c9', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.8rem', fontWeight: 600 }}>Your current balance</p>
          <p style={{ color: '#FF192C', fontSize: '1.75rem', fontWeight: 900, lineHeight: 1.1 }}>{user?.credits || 0} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>credits</span></p>
        </div>
        <div style={{ fontSize: '2rem' }}>💰</div>
      </div>

      {/* Step: package selection */}
      {step === 'packages' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
            {PACKAGES.map(pkg => (
              <div key={pkg.id} onClick={() => handleBuy(pkg.id)} style={{
                border: `2px solid ${pkg.popular ? pkg.color : '#e5e7eb'}`,
                borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer',
                background: pkg.popular ? `linear-gradient(135deg,${pkg.color}08,#fff)` : '#fff',
                position: 'relative', transition: 'all 0.2s',
                boxShadow: pkg.popular ? `0 4px 20px ${pkg.color}20` : '0 1px 4px rgba(0,0,0,0.05)',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${pkg.color}25` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = pkg.popular ? `0 4px 20px ${pkg.color}20` : '0 1px 4px rgba(0,0,0,0.05)' }}>
                {pkg.badge && (
                  <div style={{ position: 'absolute', top: '-0.625rem', left: '50%', transform: 'translateX(-50%)', background: pkg.color, color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '0.15rem 0.6rem', borderRadius: '999px', whiteSpace: 'nowrap' }}>
                    {pkg.badge}
                  </div>
                )}
                <div style={{ marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#111827' }}>{pkg.credits}</span>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem', fontWeight: 600 }}> credits</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {formatLocalPrice(pkg.usdPrice, provider, paymentMethod?.country || '')}
                  {provider !== 'stripe' && <span style={{ color: '#9ca3af' }}> ≈ ${pkg.usdPrice}</span>}
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

          {/* What you can do with credits */}
          <div style={{ background: '#f9fafb', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.875rem' }}>What you can do with credits:</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {[
                { icon: '⚡', label: 'Boost Profile', cost: '50 credits/30 min' },
                { icon: '💝', label: 'Super Like', cost: '10 credits' },
                { icon: '🎁', label: 'Send Gifts', cost: '5-100 credits' },
                { icon: '📨', label: 'Unlock Messages', cost: 'Free with Premium' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827' }}>{item.label}</p>
                    <p style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{item.cost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order history */}
          {orders.length > 0 && (
            <div>
              <p style={{ fontWeight: 700, color: '#374151', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Purchase History</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orders.slice(0, 8).map((o: any) => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#fff', borderRadius: '0.875rem', border: '1px solid #f3f4f6' }}>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{o.description}</p>
                      <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{new Date(o.time * 1000).toLocaleDateString()}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{o.currency} {o.amount}</p>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px', background: o.status === 'completed' ? '#dcfce7' : '#fef9c3', color: o.status === 'completed' ? '#166534' : '#854d0e' }}>
                        {o.status}
                      </span>
                    </div>
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
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>{pkg.credits} credits · {formatLocalPrice(pkg.usdPrice, provider, paymentMethod?.country || '')}</p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Your M-Pesa Phone Number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0712345678 or +254712345678"
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.875rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.35rem' }}>We will send an STK push to this number. Enter your M-Pesa PIN when prompted.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setStep('packages')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back
            </button>
            <button onClick={() => initiatePayment(pkg.id)} disabled={!phone.trim() || loading} style={{
              flex: 2, padding: '0.75rem', borderRadius: '0.875rem', border: 'none',
              background: !phone.trim() ? '#e5e7eb' : '#00a651', color: '#fff',
              fontWeight: 800, cursor: phone.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : '📱 Send M-Pesa Request'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Step: M-Pesa polling */}
      {step === 'polling' && (
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '1.25rem', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📲</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>Check your phone!</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            An M-Pesa STK push has been sent to your phone.<br />
            Enter your <strong>M-Pesa PIN</strong> to complete the payment.
          </p>
          {polling ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <Loader2 size={32} color="#00a651" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#9ca3af', fontSize: '0.82rem' }}>Waiting for confirmation...</p>
            </div>
          ) : (
            <button onClick={() => setStep('packages')} style={{ padding: '0.65rem 1.5rem', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Back to packages
            </button>
          )}
        </div>
      )}
    </div>
  )
}
