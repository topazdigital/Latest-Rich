'use client'
import { useState } from 'react'
import { Save, Loader2, Key, CreditCard, Crown, Palette, Globe, Mail, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { config: any; creditPackages: any[]; premiumPackages: any[] }
const TABS = ['General', 'Payments', 'Social Login', 'Email', 'Credits', 'Premium', 'Moderation']

export default function AdminSettings({ config, creditPackages, premiumPackages }: Props) {
  const [tab, setTab] = useState('General')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: config?.name || 'Rich Dating Network',
    title: config?.title || '',
    description: config?.description || '',
    keywords: config?.keywords || '',
    email: config?.email || '',
    currency: config?.currency || 'USD',
    mainColor: config?.mainColor || '#FF192C',
    freeCredits: config?.freeCredits || 50,
    photoReview: config?.photoReview || 0,
    emailVerification: config?.emailVerification || 0,
    stripePublic: '',
    stripeSecret: '',
    paypalClientId: '',
    paypalClientSecret: '',
    googleKey: config?.googleKey || '',
    googleSecret: config?.googleSecret || '',
    fbAppId: config?.fbAppId || '',
    fbAppSecret: config?.fbAppSecret || '',
    terms: config?.terms || '',
    privacy: config?.privacy || '',
    fAI: config?.fAI || 'No',
    fEngage: config?.fEngage || 'Yes',
    fEngageTime: config?.fEngageTime || 10,
    fEngageLimit: config?.fEngageLimit || 100,
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
  })

  function update(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('Settings saved!')
      else toast.error('Failed to save')
    } catch { toast.error('Error saving') }
    finally { setSaving(false) }
  }

  const Field = ({ label, name, type = 'text', placeholder = '', textarea = false }: any) => (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{label}</label>
      {textarea
        ? <textarea value={(form as any)[name]} onChange={e => update(name, e.target.value)} rows={4} placeholder={placeholder} className="input-field resize-none text-sm" />
        : <input type={type} value={(form as any)[name]} onChange={e => update(name, e.target.value)} placeholder={placeholder || 'Leave blank to keep existing'} className="input-field text-sm" />}
    </div>
  )

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} Save
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-4">
        {tab === 'General' && (
          <>
            <Field label="Site Name" name="name" />
            <Field label="Site Title (SEO)" name="title" />
            <Field label="Description" name="description" textarea />
            <Field label="Keywords" name="keywords" placeholder="dating, singles, love..." />
            <Field label="Admin Email" name="email" type="email" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Currency</label>
                <select value={form.currency} onChange={e => update('currency', e.target.value)} className="input-field text-sm">
                  {['USD','EUR','GBP','KES','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <Field label="Free Credits on Join" name="freeCredits" type="number" />
            </div>
            <Field label="Brand Color" name="mainColor" type="color" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Photo Review</label>
                <select value={form.photoReview} onChange={e => update('photoReview', +e.target.value)} className="input-field text-sm">
                  <option value={0}>Auto-approve</option><option value={1}>Manual review</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Verification</label>
                <select value={form.emailVerification} onChange={e => update('emailVerification', +e.target.value)} className="input-field text-sm">
                  <option value={0}>Not required</option><option value={1}>Required</option>
                </select>
              </div>
            </div>
            <Field label="Terms of Service" name="terms" textarea />
            <Field label="Privacy Policy" name="privacy" textarea />
          </>
        )}

        {tab === 'Payments' && (
          <>
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 mb-2">
              💡 API keys are stored securely as environment variables. Leave blank to keep existing values.
            </div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard size={16} className="text-brand-500" /> Stripe</h3>
            <Field label="Stripe Publishable Key (pk_...)" name="stripePublic" placeholder="pk_live_... (leave blank to keep existing)" />
            <Field label="Stripe Secret Key (sk_...)" name="stripeSecret" placeholder="sk_live_... (leave blank to keep existing)" />
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 pt-4 border-t border-gray-100"><span className="font-bold text-blue-600">Pay</span>Pal</h3>
            <Field label="PayPal Client ID" name="paypalClientId" placeholder="(leave blank to keep existing)" />
            <Field label="PayPal Client Secret" name="paypalClientSecret" placeholder="(leave blank to keep existing)" />
            <div className="p-4 bg-green-50 rounded-xl text-sm text-green-700">
              ✅ M-Pesa/PayHero credentials are already configured via environment secrets.
            </div>
          </>
        )}

        {tab === 'Social Login' && (
          <>
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">💡 Set up OAuth apps and add credentials here.</div>
            <h3 className="font-semibold text-gray-900">Google OAuth</h3>
            <Field label="Google Client ID" name="googleKey" placeholder="" />
            <Field label="Google Client Secret" name="googleSecret" placeholder="" />
            <h3 className="font-semibold text-gray-900 pt-4 border-t border-gray-100">Facebook Login</h3>
            <Field label="Facebook App ID" name="fbAppId" placeholder="" />
            <Field label="Facebook App Secret" name="fbAppSecret" placeholder="" />
          </>
        )}

        {tab === 'Email' && (
          <>
            <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-700">Configure SMTP to send emails from the platform.</div>
            <Field label="SMTP Host" name="smtpHost" placeholder="smtp.gmail.com" />
            <Field label="SMTP Port" name="smtpPort" placeholder="587" />
            <Field label="SMTP Username" name="smtpUser" placeholder="your@gmail.com" />
            <Field label="SMTP Password" name="smtpPass" type="password" placeholder="App password" />
          </>
        )}

        {tab === 'Credits' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Credit packages available to users. Managed via Prisma database.</p>
            <div className="space-y-3">
              {creditPackages.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{p.credits} Credits</p>
                    <p className="text-sm text-gray-500">{p.description}</p>
                  </div>
                  <p className="font-bold text-brand-500">${p.price}</p>
                  {p.popular === 1 && <span className="badge bg-brand-100 text-brand-600">Popular</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Premium' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Premium subscription packages.</p>
            <div className="space-y-3">
              {premiumPackages.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">{p.days} days · {p.description}</p>
                  </div>
                  <p className="font-bold text-brand-500">${p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Moderation' && (
          <>
            <h3 className="font-semibold text-gray-900">AI Fake Engagement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">AI Engagement</label>
                <select value={form.fAI} onChange={e => update('fAI', e.target.value)} className="input-field text-sm">
                  <option value="Yes">Enabled</option><option value="No">Disabled</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Auto-engage new users</label>
                <select value={form.fEngage} onChange={e => update('fEngage', e.target.value)} className="input-field text-sm">
                  <option value="Yes">Yes</option><option value="No">No</option>
                </select>
              </div>
              <Field label="Engage delay (minutes)" name="fEngageTime" type="number" />
              <Field label="Max engagements" name="fEngageLimit" type="number" />
            </div>
          </>
        )}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} Save Settings
      </button>
    </div>
  )
}
