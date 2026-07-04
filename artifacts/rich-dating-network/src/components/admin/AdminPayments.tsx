import { useState, useEffect } from 'react'
import { authFetch } from '../../lib/auth'

const PROVIDERS = [
  {
    id: 'paystack',
    name: 'Paystack',
    icon: '🏦',
    countries: 'All countries — Visa, Mastercard from anywhere + NGN/GHS/ZAR/KES locally',
    color: '#00c3f7',
    fields: [
      { key: 'paystack_secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'paystack_public_key', label: 'Public Key', placeholder: 'pk_live_...', secret: false },
      { key: 'ngn_rate', label: 'NGN per USD Rate', placeholder: 'e.g. 1600', secret: false },
      { key: 'ghs_rate', label: 'GHS per USD Rate', placeholder: 'e.g. 12', secret: false },
      { key: 'zar_rate', label: 'ZAR per USD Rate', placeholder: 'e.g. 19', secret: false },
    ],
  },
  {
    id: 'payhero',
    name: 'PayHero (M-Pesa)',
    icon: '📱',
    countries: 'Kenya, Tanzania, Uganda, Rwanda, Ethiopia',
    color: '#00a651',
    fields: [
      { key: 'payhero_api_username', label: 'API Username', placeholder: 'Your PayHero username', secret: false },
      { key: 'payhero_api_password', label: 'API Password', placeholder: 'Your PayHero password', secret: true },
      { key: 'payhero_channel_id', label: 'Channel ID', placeholder: 'e.g. 1234', secret: false },
      { key: 'kes_rate', label: 'KES per USD Rate', placeholder: 'e.g. 130', secret: false },
    ],
  },
  {
    id: 'paymongo',
    name: 'PayMongo',
    icon: '📲',
    countries: 'Philippines (GCash, Maya, Credit Cards)',
    color: '#7c3aed',
    fields: [
      { key: 'paymongo_secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'paymongo_public_key', label: 'Public Key', placeholder: 'pk_live_...', secret: false },
      { key: 'php_rate', label: 'PHP per USD Rate', placeholder: 'e.g. 56', secret: false },
    ],
  },
]

export default function AdminPayments() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeProvider, setActiveProvider] = useState('paystack')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null)

  useEffect(() => {
    authFetch('/api/payments/config').then(r => r.json()).then(data => { setConfig(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function handleChange(key: string, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }))
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const names: Record<string, string> = { payhero: 'PayHero', paystack: 'Paystack', paymongo: 'PayMongo' }
    try {
      const res = await authFetch(`/api/payments/${activeProvider}/test-credentials`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.ok) {
        setTestResult({ ok: true, message: `✓ Credentials valid — ${names[activeProvider]} accepted your API key`, detail: data.detail })
      } else {
        setTestResult({ ok: false, message: data.error || 'Connection failed', detail: data.detail })
      }
    } catch {
      setTestResult({ ok: false, message: `Network error — could not reach ${names[activeProvider]}` })
    }
    setTesting(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await authFetch('/api/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      const refreshed = await authFetch('/api/payments/config').then(r => r.json())
      setConfig(refreshed)
      setEdits({})
    } catch {}
    setSaving(false)
  }

  const provider = PROVIDERS.find(p => p.id === activeProvider)!

  const ROUTING = [
    { flag: '🇰🇪', country: 'Kenya', provider: 'PayHero M-Pesa', color: '#00a651' },
    { flag: '🇹🇿', country: 'Tanzania', provider: 'PayHero M-Pesa', color: '#00a651' },
    { flag: '🇺🇬', country: 'Uganda', provider: 'PayHero M-Pesa', color: '#00a651' },
    { flag: '🇷🇼', country: 'Rwanda', provider: 'PayHero M-Pesa', color: '#00a651' },
    { flag: '🇳🇬', country: 'Nigeria', provider: 'Paystack', color: '#00c3f7' },
    { flag: '🇬🇭', country: 'Ghana', provider: 'Paystack', color: '#00c3f7' },
    { flag: '🇿🇦', country: 'South Africa', provider: 'Paystack', color: '#00c3f7' },
    { flag: '🇵🇭', country: 'Philippines', provider: 'PayMongo (GCash)', color: '#7c3aed' },
    { flag: '🇺🇸', country: 'USA', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇬🇧', country: 'UK', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇨🇦', country: 'Canada', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇦🇺', country: 'Australia', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇩🇪', country: 'Germany', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇦🇪', country: 'UAE', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🇸🇬', country: 'Singapore', provider: 'Paystack (Card)', color: '#00c3f7' },
    { flag: '🌍', country: 'All others', provider: 'Paystack (Card) — default', color: '#00c3f7' },
  ]

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>Payment Providers</h2>
        <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>
          Configure payment methods per region. Users see the right option based on their location.
        </p>
      </div>

      {/* Two-column layout: left = config, right = routing */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* LEFT: Provider config */}
        <div>
          {/* Provider tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => { setActiveProvider(p.id); setTestResult(null) }} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 0.875rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                background: activeProvider === p.id ? p.color : '#1e293b',
                color: '#fff', fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.15s',
                boxShadow: activeProvider === p.id ? `0 4px 12px ${p.color}40` : 'none',
              }}>
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading...</div>
          ) : (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '1rem', padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', paddingBottom: '0.875rem', borderBottom: '1px solid #1f2937' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: provider.color + '20', border: `1px solid ${provider.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {provider.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{provider.name}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.75rem' }}>🌍 {provider.countries}</p>
                </div>
                <a href={`https://${provider.id === 'payhero' ? 'dashboard.payhero.co.ke' : provider.id === 'paystack' ? 'dashboard.paystack.com' : 'dashboard.paymongo.com'}`}
                  target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: provider.color, textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>
                  Dashboard →
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
                {provider.fields.map(field => (
                  <div key={field.key}>
                    <label style={{ display: 'block', color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      {field.label}
                      {field.secret && <span style={{ color: '#ef4444', marginLeft: '0.3rem', fontSize: '0.68rem' }}>🔒 Encrypted</span>}
                    </label>
                    <input
                      type={field.secret ? 'password' : 'text'}
                      placeholder={edits[field.key] ? '' : (config[field.key] || field.placeholder)}
                      value={edits[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      style={{
                        width: '100%', padding: '0.6rem 0.8rem',
                        background: '#0f172a', border: '1px solid #374151', borderRadius: '0.5rem',
                        color: '#fff', fontSize: '0.83rem', outline: 'none', fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = provider.color }}
                      onBlur={e => { e.currentTarget.style.borderColor = '#374151' }}
                    />
                    {config[field.key] && !edits[field.key] && (
                      <p style={{ color: '#22c55e', fontSize: '0.68rem', marginTop: '0.2rem' }}>✓ Configured — leave blank to keep</p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={handleSave} disabled={saving || Object.keys(edits).length === 0} style={{
                  padding: '0.6rem 1.25rem', borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                  background: Object.keys(edits).length === 0 ? '#374151' : provider.color,
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
                }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {saved && <span style={{ color: '#22c55e', fontSize: '0.83rem', fontWeight: 600 }}>✓ Saved!</span>}
                <button onClick={() => { setTestResult(null); handleTest() }} disabled={testing} style={{
                  padding: '0.6rem 1.25rem', borderRadius: '0.625rem', border: `1px solid ${provider.color}`,
                  background: 'transparent', color: provider.color, fontWeight: 700, fontSize: '0.85rem',
                  fontFamily: 'inherit', cursor: 'pointer', opacity: testing ? 0.7 : 1,
                }}>
                  {testing ? 'Testing…' : '🔍 Test Connection'}
                </button>
              </div>
              {testResult && (
                <div style={{
                  marginTop: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.625rem',
                  background: testResult.ok ? '#052e16' : '#1c0a0a',
                  border: `1px solid ${testResult.ok ? '#166534' : '#7f1d1d'}`,
                }}>
                  <p style={{ color: testResult.ok ? '#4ade80' : '#f87171', fontSize: '0.83rem', fontWeight: 600, margin: 0 }}>
                    {testResult.message}
                  </p>
                  {testResult.detail && (
                    <p style={{ color: '#d1d5db', fontSize: '0.75rem', marginTop: '0.3rem', marginBottom: 0 }}>
                      {testResult.detail}
                    </p>
                  )}
                  {!testResult.ok && activeProvider === 'payhero' && (
                    <p style={{ color: '#6b7280', fontSize: '0.72rem', marginTop: '0.4rem', marginBottom: 0, lineHeight: 1.5 }}>
                      💡 The API password is <strong style={{ color: '#e2e8f0' }}>not</strong> your PayHero login password.
                      Go to PayHero → API Keys → delete the "Rich Dating Network" key → create a new one → set a new password → paste that password here.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* How it works note */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '0.75rem', padding: '0.875rem 1rem', marginTop: '1rem' }}>
            <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.78rem', marginBottom: '0.4rem' }}>💡 How routing works</p>
            <ul style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: '1.7', paddingLeft: '1rem', margin: 0 }}>
              <li>Kenya/East Africa → <strong style={{ color: '#00a651' }}>PayHero M-Pesa</strong></li>
              <li>Nigeria/Ghana/SA → <strong style={{ color: '#00c3f7' }}>Paystack</strong></li>
              <li>Philippines → <strong style={{ color: '#7c3aed' }}>PayMongo (GCash)</strong></li>
              <li>Everyone else → <strong style={{ color: '#00c3f7' }}>Paystack (Card)</strong></li>
            </ul>
          </div>
        </div>

        {/* RIGHT: Country routing table */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '1rem', padding: '1rem' }}>
          <p style={{ color: '#fff', fontWeight: 700, marginBottom: '0.75rem', fontSize: '0.85rem' }}>🗺️ Country Routing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {ROUTING.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', background: '#0f172a', borderRadius: '0.4rem' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{row.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#e5e7eb', fontSize: '0.75rem', fontWeight: 600 }}>{row.country}</p>
                  <p style={{ color: row.color, fontSize: '0.65rem' }}>{row.provider}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
