import { useState, useEffect, useRef, useCallback } from 'react'
import PremiumPage from '../components/premium/PremiumPage'
import { useAuth } from '../hooks/useAuth'
import { authFetch } from '../lib/auth'
import { Loader2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_PACKAGES = [
  { id: 1, name: '1 Month', days: 30, price: 9.99, popular: 0, description: 'Flexible monthly plan' },
  { id: 2, name: '3 Months', days: 90, price: 24.99, popular: 1, description: 'Save 17%' },
  { id: 3, name: '6 Months', days: 180, price: 39.99, popular: 0, description: 'Save 33%' },
  { id: 4, name: '1 Year', days: 365, price: 59.99, popular: 0, description: 'Best value — Save 50%' },
]

const PROVIDER_INFO: Record<string, { name: string; icon: string; color: string }> = {
  payhero: { name: 'M-Pesa', icon: '📱', color: '#00a651' },
  paystack: { name: 'Card / Bank Transfer', icon: '🏦', color: '#00c3f7' },
  paymongo: { name: 'GCash / Maya / Card', icon: '📲', color: '#7c3aed' },
  stripe: { name: 'Credit / Debit Card', icon: '💳', color: '#635bff' },
  paddle: { name: 'Credit / Debit Card', icon: '💳', color: '#0d47a1' },
  flutterwave: { name: 'Credit / Debit Card', icon: '💳', color: '#f5a623' },
  intasend: { name: 'Credit / Debit Card', icon: '💳', color: '#1a56db' },
  pesapal: { name: 'Credit / Debit Card', icon: '💳', color: '#e53e3e' },
}

function formatLocalPrice(usdPrice: number, provider: string, userCountry: string): string {
  const rates: Record<string, [number, string]> = {
    KE: [130, 'KES'], TZ: [2500, 'TZS'], UG: [3700, 'UGX'], RW: [1300, 'RWF'],
    NG: [1600, 'NGN'], GH: [12, 'GHS'], ZA: [19, 'ZAR'], PH: [56, 'PHP'],
  }
  const entry = rates[userCountry?.toUpperCase()]
  if (!entry || provider === 'stripe' || provider === 'paddle' || provider === 'flutterwave') return `$${usdPrice}`
  const [rate, currency] = entry
  return `${currency} ${Math.round(usdPrice * rate).toLocaleString()}`
}

export default function PremiumPageWrapper() {
  const { user, token, refreshUser } = useAuth()
  const [packages, setPackages] = useState(DEFAULT_PACKAGES)
  const [paymentMethod, setPaymentMethod] = useState<any>(null)
  const [selectedPkg, setSelectedPkg] = useState<any>(null)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [mpesaRef, setMpesaRef] = useState('')
  const [countdown, setCountdown] = useState(90)
  const [pollOutcome, setPollOutcome] = useState<'waiting' | 'success' | 'cancelled' | 'failed' | 'timeout'>('waiting')
  const [step, setStep] = useState<'packages' | 'confirm' | 'polling' | 'done'>('packages')
  const [customGateways, setCustomGateways] = useState<any[]>([])
  const [selectedGateway, setSelectedGateway] = useState<any>(null)
  const [proof, setProof] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto')
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!token) return
    fetch('/api/premium/packages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) setPackages(d) })
      .catch(() => {})
    authFetch('/api/payments/method').then(r => r.json()).then(setPaymentMethod).catch(() => {})
    authFetch('/api/custom-payments/gateways').then(r => r.json()).then(d => setCustomGateways(Array.isArray(d) ? d : [])).catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) { toast.success('Premium activated! Welcome to VIP. 👑'); refreshUser() }
    if (params.get('error')) toast.error('Payment failed. Please try again.')
    if (params.get('cancelled')) toast.error('Payment cancelled.')
  }, [token])

  const provider = paymentMethod?.provider || 'stripe'
  const providerInfo = PROVIDER_INFO[provider] || PROVIDER_INFO.stripe
  const hasManualGateways = customGateways.length > 0

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null }
    setPolling(false)
  }, [])

  const pollMpesaStatus = useCallback((ref: string) => {
    setPolling(true); setPollOutcome('waiting'); setCountdown(90)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { stopPolling(); setPollOutcome('timeout'); return 0 } return prev - 1 })
    }, 1000)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await authFetch(`/api/payments/payhero/status/${ref}`)
        const data = await res.json()
        if (data.finalStatus === 'completed' || data.orderStatus === 'completed') {
          stopPolling(); setPollOutcome('success')
          toast.success('Payment received! Premium activated. 👑')
          await refreshUser()
        } else if (data.finalStatus === 'cancelled') { stopPolling(); setPollOutcome('cancelled') }
        else if (data.finalStatus === 'failed') { stopPolling(); setPollOutcome('failed') }
      } catch {}
    }, 4000)
  }, [stopPolling, refreshUser])

  async function initiatePayment(pkg: any, phoneNum?: string) {
    setLoading(true)
    try {
      let endpoint = '/api/payments/paddle/checkout'
      let body: any = { packageId: pkg.id, type: 'premium' }
      if (provider === 'payhero') { endpoint = '/api/payments/payhero/initiate'; body.phone = phoneNum || phone }
      else if (provider === 'paystack') { endpoint = '/api/payments/paystack/initiate'; body.email = user?.email }
      else if (provider === 'paymongo') { endpoint = '/api/payments/paymongo/initiate'; body.paymentMethod = 'gcash' }
      else if (provider === 'stripe') { endpoint = '/api/payments/stripe/checkout' }
      else if (provider === 'pesapal') { endpoint = '/api/payments/pesapal/checkout' }
      else if (provider === 'intasend') { endpoint = '/api/payments/intasend/checkout' }
      else if (provider === 'paddle' || provider === 'flutterwave') { endpoint = '/api/payments/paddle/checkout' }
      const res = await authFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Payment failed'); setLoading(false); return }
      if (data.url) { window.location.href = data.url }
      else if (data.reference) { setMpesaRef(data.reference); setStep('polling'); toast.success('Check your phone for the M-Pesa prompt!'); pollMpesaStatus(data.reference) }
    } catch { toast.error('Something went wrong') }
    setLoading(false)
  }

  async function handleBuy(pkg: any) {
    setSelectedPkg(pkg)
    if (provider === 'payhero') { setStep('confirm') }
    else { await initiatePayment(pkg) }
  }

  async function handleCustomSubmit() {
    if (!selectedGateway || !selectedPkg || !proof.trim()) { toast.error('Select a package and enter payment proof'); return }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/custom-payments/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: selectedGateway.id, type: 'premium', packageId: selectedPkg.id, proof }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Submission failed'); setSubmitting(false); return }
      toast.success(`Payment submitted! It will be reviewed within ${data.reviewTime} hour(s).`)
      setProof(''); setSelectedGateway(null); setSelectedPkg(null)
    } catch { toast.error('Something went wrong') }
    setSubmitting(false)
  }

  // M-Pesa confirm step
  if (step === 'confirm' && selectedPkg) {
    return (
      <div style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '1.25rem', padding: '1.75rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📱</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.35rem' }}>Pay with M-Pesa</h2>
            <p style={{ color: '#374151', fontSize: '0.85rem', fontWeight: 600 }}>
              {selectedPkg.name} · {formatLocalPrice(selectedPkg.price, provider, paymentMethod?.country || '')}
            </p>
          </div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>Your M-Pesa Phone Number</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 0712345678 or +254712345678"
            style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.875rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '0.35rem' }} />
          <p style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '1rem' }}>We will send an STK push to this number.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setStep('packages')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.875rem', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
            <button onClick={() => initiatePayment(selectedPkg)} disabled={!phone.trim() || loading}
              style={{ flex: 2, padding: '0.75rem', borderRadius: '0.875rem', border: 'none', background: !phone.trim() ? '#e5e7eb' : '#00a651', color: '#fff', fontWeight: 800, cursor: phone.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : '📱 Send M-Pesa Request'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // M-Pesa polling step
  if (step === 'polling') {
    return (
      <div style={{ maxWidth: 480, margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '1.25rem', padding: '2rem', textAlign: 'center' }}>
          {pollOutcome === 'waiting' && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📲</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', marginBottom: '0.5rem' }}>Check your phone!</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                An M-Pesa STK push has been sent.<br />Enter your <strong>M-Pesa PIN</strong> to complete the payment.
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Waiting… {countdown}s</p>
            </>
          )}
          {pollOutcome === 'success' && (
            <>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>👑</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827' }}>Premium Activated!</h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>Welcome to VIP. Enjoy all premium features!</p>
            </>
          )}
          {(pollOutcome === 'cancelled' || pollOutcome === 'failed' || pollOutcome === 'timeout') && (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
              <h2 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{pollOutcome === 'timeout' ? 'Request timed out' : 'Payment failed'}</h2>
              <button onClick={() => { setStep('packages'); stopPolling() }}
                style={{ marginTop: '1.5rem', padding: '0.75rem 2rem', borderRadius: '0.875rem', border: 'none', background: '#FF192C', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Normal packages view — pass extra payment context to PremiumPage
  return (
    <PremiumPage
      user={user}
      packages={packages}
      paymentMethod={paymentMethod}
      providerInfo={providerInfo}
      customGateways={customGateways}
      hasManualGateways={hasManualGateways}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedGateway={selectedGateway}
      setSelectedGateway={setSelectedGateway}
      selectedPkg={selectedPkg}
      setSelectedPkg={setSelectedPkg}
      proof={proof}
      setProof={setProof}
      submitting={submitting}
      loading={loading}
      formatLocalPrice={formatLocalPrice}
      handleBuy={handleBuy}
      handleCustomSubmit={handleCustomSubmit}
    />
  )
}
