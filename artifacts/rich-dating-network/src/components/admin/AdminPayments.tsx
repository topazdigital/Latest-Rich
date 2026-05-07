import { useState, useEffect } from 'react'
import { authFetch } from '../../lib/auth'

const PROVIDERS = [
  {
    id: 'stripe',
    name: 'Stripe',
    icon: '💳',
    countries: 'USA, UK, Canada, Australia, Europe, UAE, Singapore, Japan, and 40+ countries',
    color: '#635bff',
    fields: [
      { key: 'stripe_secret_key', label: 'Secret Key', placeholder: 'sk_live_...', secret: true },
      { key: 'stripe_publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...', secret: false },
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
    id: 'paystack',
    name: 'Paystack',
    icon: '🏦',
    countries: 'Nigeria, Ghana, South Africa, Egypt',
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
  const [activeProvider, setActiveProvider] = useState('stripe')

  useEffect(() => {
    authFetch('/api/payments/config').then(r => r.json()).then(data => { setConfig(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function handleChange(key: string, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }))
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

  return (
    <div style={{ maxWidth: '900px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>Payment Providers</h2>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Configure payment methods for each country. Users automatically see the right method based on their profile location.
          Each user's payment goes directly to your account for that provider.
        </p>
      </div>

      {/* How payments work */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.5rem' }}>💡 How it works</p>
        <ul style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.8', paddingLeft: '1rem' }}>
          <li>A user in <strong style={{ color: '#fff' }}>Kenya</strong> pays via <strong style={{ color: '#00a651' }}>M-Pesa (PayHero)</strong> → KES goes directly to your M-Pesa/PayHero account</li>
          <li>A user in <strong style={{ color: '#fff' }}>Nigeria</strong> pays via <strong style={{ color: '#00c3f7' }}>Paystack</strong> → NGN goes to your Paystack account</li>
          <li>A user in <strong style={{ color: '#fff' }}>Philippines</strong> pays via <strong style={{ color: '#7c3aed' }}>GCash/Maya (PayMongo)</strong> → PHP to your PayMongo account</li>
          <li>A user in <strong style={{ color: '#fff' }}>USA/UK/Europe</strong> pays via <strong style={{ color: '#635bff' }}>Stripe</strong> → USD/GBP/EUR to your Stripe account</li>
          <li>Set exchange rates so we charge the correct local amount equivalent to USD price</li>
        </ul>
      </div>

      {/* Provider tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PROVIDERS.map(p => (
          <button key={p.id} onClick={() => setActiveProvider(p.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
            background: activeProvider === p.id ? p.color : '#1e293b',
            color: '#fff', fontSize: '0.85rem', fontWeight: 700, transition: 'all 0.15s',
            boxShadow: activeProvider === p.id ? `0 4px 14px ${p.color}40` : 'none',
          }}>
            <span>{p.icon}</span> {p.name}
          </button>
        ))}
      </div>

      {/* Active provider config */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Loading...</div>
      ) : (
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '1rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid #1f2937' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', background: provider.color + '20', border: `1px solid ${provider.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
              {provider.icon}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 700 }}>{provider.name}</p>
              <p style={{ color: '#6b7280', fontSize: '0.78rem' }}>🌍 {provider.countries}</p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <a href={`https://${provider.id === 'stripe' ? 'dashboard.stripe.com' : provider.id === 'payhero' ? 'dashboard.payhero.co.ke' : provider.id === 'paystack' ? 'dashboard.paystack.com' : 'dashboard.paymongo.com'}`}
                target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: provider.color, textDecoration: 'none', fontWeight: 700 }}>
                Open Dashboard →
              </a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {provider.fields.map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {field.label}
                  {field.secret && <span style={{ color: '#ef4444', marginLeft: '0.3rem', fontSize: '0.7rem' }}>🔒 Encrypted</span>}
                </label>
                <input
                  type={field.secret ? 'password' : 'text'}
                  placeholder={edits[field.key] ? '' : (config[field.key] || field.placeholder)}
                  value={edits[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  style={{
                    width: '100%', padding: '0.65rem 0.875rem',
                    background: '#0f172a', border: '1px solid #374151', borderRadius: '0.625rem',
                    color: '#fff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = provider.color }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#374151' }}
                />
                {config[field.key] && !edits[field.key] && (
                  <p style={{ color: '#22c55e', fontSize: '0.7rem', marginTop: '0.25rem' }}>✓ Configured — leave blank to keep</p>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button onClick={handleSave} disabled={saving || Object.keys(edits).length === 0} style={{
              padding: '0.65rem 1.5rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
              background: Object.keys(edits).length === 0 ? '#374151' : provider.color,
              color: '#fff', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1, transition: 'all 0.15s',
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && <span style={{ color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>✓ Saved successfully!</span>}
          </div>
        </div>
      )}

      {/* Country routing table */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '1rem', padding: '1.25rem', marginTop: '1.5rem' }}>
        <p style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>🗺️ Country → Payment Provider Routing</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
          {[
            { flag: '🇰🇪', country: 'Kenya', provider: 'PayHero M-Pesa', color: '#00a651' },
            { flag: '🇹🇿', country: 'Tanzania', provider: 'PayHero M-Pesa', color: '#00a651' },
            { flag: '🇺🇬', country: 'Uganda', provider: 'PayHero M-Pesa', color: '#00a651' },
            { flag: '🇷🇼', country: 'Rwanda', provider: 'PayHero M-Pesa', color: '#00a651' },
            { flag: '🇳🇬', country: 'Nigeria', provider: 'Paystack', color: '#00c3f7' },
            { flag: '🇬🇭', country: 'Ghana', provider: 'Paystack', color: '#00c3f7' },
            { flag: '🇿🇦', country: 'South Africa', provider: 'Paystack', color: '#00c3f7' },
            { flag: '🇵🇭', country: 'Philippines', provider: 'PayMongo (GCash)', color: '#7c3aed' },
            { flag: '🇺🇸', country: 'USA', provider: 'Stripe', color: '#635bff' },
            { flag: '🇬🇧', country: 'UK', provider: 'Stripe', color: '#635bff' },
            { flag: '🇨🇦', country: 'Canada', provider: 'Stripe', color: '#635bff' },
            { flag: '🇦🇺', country: 'Australia', provider: 'Stripe', color: '#635bff' },
            { flag: '🇩🇪', country: 'Germany', provider: 'Stripe', color: '#635bff' },
            { flag: '🇦🇪', country: 'UAE', provider: 'Stripe', color: '#635bff' },
            { flag: '🇸🇬', country: 'Singapore', provider: 'Stripe', color: '#635bff' },
            { flag: '🌍', country: 'All others', provider: 'Stripe (default)', color: '#635bff' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: '#0f172a', borderRadius: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>{row.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e5e7eb', fontSize: '0.78rem', fontWeight: 600 }}>{row.country}</p>
                <p style={{ color: row.color, fontSize: '0.7rem' }}>{row.provider}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
