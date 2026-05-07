import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Save, Eye, EyeOff, Settings, CreditCard, MessageSquare, Users, Globe, Shield, Crown, Plus, Trash2 } from "lucide-react"

const SECTIONS = [
  {
    title: "General Settings",
    icon: Settings,
    color: "text-blue-400",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", placeholder: "Rich Dating Network" },
      { key: "site_tagline", label: "Site Tagline", type: "text", placeholder: "Find Your Perfect Match" },
      { key: "site_email", label: "Contact Email", type: "email", placeholder: "support@example.com" },
      { key: "maintenance_mode", label: "Maintenance Mode", type: "select", options: [["0","Off"],["1","On"]], help: "When on, only admins can access the site" },
    ]
  },
  {
    title: "Credits & Monetization",
    icon: CreditCard,
    color: "text-green-400",
    fields: [
      { key: "credits_per_message", label: "Credits Per Message (0 = free)", type: "number", placeholder: "10", help: "Credits deducted per chat message sent" },
      { key: "registration_credits", label: "Credits on Registration", type: "number", placeholder: "50" },
      { key: "profile_completion_reward", label: "Credits for Full Profile", type: "number", placeholder: "20" },
    ]
  },
  {
    title: "Messaging & Automation",
    icon: MessageSquare,
    color: "text-purple-400",
    fields: [
      { key: "auto_messages_enabled", label: "Auto Messages Enabled", type: "select", options: [["1","Enabled"],["0","Disabled"]] },
      { key: "auto_messages_count", label: "Auto Messages Per Login", type: "number", placeholder: "3" },
      { key: "fake_user_delay_minutes", label: "Delay Between Auto Messages (min)", type: "number", placeholder: "30" },
    ]
  },
  {
    title: "User Features",
    icon: Users,
    color: "text-yellow-400",
    fields: [
      { key: "superlike_count", label: "Daily Superlikes per User", type: "number", placeholder: "3" },
      { key: "max_photos", label: "Max Photos per User", type: "number", placeholder: "10" },
    ]
  },
  {
    title: "Social Login",
    icon: Globe,
    color: "text-cyan-400",
    fields: [
      { key: "google_client_id", label: "Google Client ID", type: "text", placeholder: "xxx.apps.googleusercontent.com", help: "Google Cloud Console → OAuth 2.0" },
      { key: "google_client_secret", label: "Google Client Secret", type: "password", placeholder: "GOCSPX-..." },
      { key: "facebook_app_id", label: "Facebook App ID", type: "text", placeholder: "1234567890" },
      { key: "facebook_app_secret", label: "Facebook App Secret", type: "password", placeholder: "abc123..." },
    ]
  },
  {
    title: "Stripe Payments",
    icon: Shield,
    color: "text-orange-400",
    fields: [
      { key: "stripe_publishable_key", label: "Stripe Publishable Key", type: "text", placeholder: "pk_live_..." },
      { key: "stripe_secret_key", label: "Stripe Secret Key", type: "password", placeholder: "sk_live_..." },
      { key: "stripe_webhook_secret", label: "Stripe Webhook Secret", type: "password", placeholder: "whsec_..." },
    ]
  },
]

const DEFAULT_PACKAGES = [
  { name: "1 Month", days: 30, price: 9.99, popular: 0, description: "Flexible monthly plan", active: 1 },
  { name: "3 Months", days: 90, price: 24.99, popular: 1, description: "Save 17%", active: 1 },
  { name: "6 Months", days: 180, price: 39.99, popular: 0, description: "Save 33%", active: 1 },
  { name: "1 Year", days: 365, price: 59.99, popular: 0, description: "Best value — Save 50%", active: 1 },
]

interface PremiumPkg { name: string; days: number; price: number; popular: number; description: string; active: number }

export default function AdminSettings() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPkg, setSavingPkg] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())
  const [packages, setPackages] = useState<PremiumPkg[]>(DEFAULT_PACKAGES)
  const [pkgLoading, setPkgLoading] = useState(true)

  useEffect(() => {
    authFetch("/api/admin/config").then(r => r.json()).then(d => {
      setConfig(d)
      setLoading(false)
    }).catch(() => setLoading(false))

    authFetch("/api/premium/packages").then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d) && d.length > 0) setPackages(d)
      setPkgLoading(false)
    }).catch(() => setPkgLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await authFetch("/api/admin/config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })
      if (res.ok) toast.success("Settings saved successfully")
      else toast.error("Failed to save settings")
    } catch { toast.error("Failed to save") } finally { setSaving(false) }
  }

  const savePremiumPackages = async () => {
    setSavingPkg(true)
    try {
      const res = await authFetch("/api/premium/packages", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages })
      })
      if (res.ok) toast.success("Premium packages saved!")
      else toast.error("Failed to save packages")
    } catch { toast.error("Failed to save packages") } finally { setSavingPkg(false) }
  }

  function togglePassword(key: string) {
    setShowPasswords(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function updatePkg(i: number, key: keyof PremiumPkg, val: any) {
    setPackages(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p))
  }

  function addPkg() {
    setPackages(prev => [...prev, { name: "New Plan", days: 30, price: 9.99, popular: 0, description: "", active: 1 }])
  }

  function removePkg(i: number) {
    setPackages(prev => prev.filter((_, idx) => idx !== i))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Site Settings</h2>
          <p className="text-gray-400 text-sm mt-1">Configure all platform settings</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg">
          <Save size={16} />
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      {SECTIONS.map((section) => {
        const SectionIcon = section.icon
        return (
          <div key={section.title} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
              <div className={`w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center ${section.color}`}>
                <SectionIcon size={16} />
              </div>
              <h3 className="text-white font-semibold text-sm">{section.title}</h3>
            </div>
            <div className="p-5 space-y-4">
              {section.fields.map((f: any) => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-gray-300 text-sm font-medium">{f.label}</label>
                    {f.help && <span className="text-gray-500 text-xs max-w-xs text-right">{f.help}</span>}
                  </div>
                  {f.type === 'select' ? (
                    <select value={config[f.key] ?? (f.options?.[0]?.[0] || "")}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                      className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500">
                      {f.options?.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : f.type === 'password' ? (
                    <div className="relative">
                      <input type={showPasswords.has(f.key) ? 'text' : 'password'}
                        value={config[f.key] ?? ""}
                        onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-gray-800 text-white px-3 py-2.5 pr-10 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600" />
                      <button type="button" onClick={() => togglePassword(f.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPasswords.has(f.key) ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  ) : (
                    <input type={f.type || "text"} value={config[f.key] ?? ""}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Premium Packages Management */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-yellow-400">
              <Crown size={16} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Premium Packages</h3>
              <p className="text-gray-500 text-xs">Control what plans users can subscribe to</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addPkg}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium transition-colors border border-gray-700">
              <Plus size={13} /> Add Plan
            </button>
            <button onClick={savePremiumPackages} disabled={savingPkg}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
              <Save size={13} />
              {savingPkg ? "Saving..." : "Save Plans"}
            </button>
          </div>
        </div>

        <div className="p-5">
          {pkgLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
                <p className="text-gray-400 text-xs leading-relaxed">
                  <strong className="text-gray-300">Premium unlocks:</strong> Sharing contact info (phone, email, social handles, links) in chat, seeing profile visitors, VIP badge, priority placement, and more.
                  Non-premium members cannot share contact details in chat at all.
                </p>
              </div>

              {packages.map((pkg, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs font-mono">Plan {i + 1}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={pkg.active === 1}
                          onChange={e => updatePkg(i, 'active', e.target.checked ? 1 : 0)}
                          className="w-4 h-4 accent-yellow-500 rounded" />
                        <span className="text-xs text-gray-400">{pkg.active ? 'Active' : 'Hidden'}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={pkg.popular === 1}
                          onChange={e => updatePkg(i, 'popular', e.target.checked ? 1 : 0)}
                          className="w-4 h-4 accent-brand-500 rounded" />
                        <span className="text-xs text-gray-400">Popular badge</span>
                      </label>
                    </div>
                    <button onClick={() => removePkg(i)} className="text-red-500 hover:text-red-400 p-1 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Plan Name</label>
                      <input value={pkg.name} onChange={e => updatePkg(i, 'name', e.target.value)}
                        className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
                        placeholder="e.g. 1 Month" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Duration (days)</label>
                      <input type="number" value={pkg.days} onChange={e => updatePkg(i, 'days', parseInt(e.target.value) || 30)}
                        className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
                        placeholder="30" min="1" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Price (USD)</label>
                      <input type="number" value={pkg.price} step="0.01" onChange={e => updatePkg(i, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
                        placeholder="9.99" min="0" />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Tag Line</label>
                      <input value={pkg.description} onChange={e => updatePkg(i, 'description', e.target.value)}
                        className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:outline-none focus:border-yellow-500"
                        placeholder="e.g. Save 17%" />
                    </div>
                  </div>
                </div>
              ))}

              {packages.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No plans configured. Add a plan above.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pb-6">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 shadow-lg">
          <Save size={17} />
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </div>
  )
}
