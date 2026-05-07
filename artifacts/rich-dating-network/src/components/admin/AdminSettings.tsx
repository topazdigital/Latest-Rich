import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Save, Eye, EyeOff, Settings, CreditCard, MessageSquare, Users, Zap, Globe, Shield } from "lucide-react"

const SECTIONS = [
  {
    title: "General Settings",
    icon: Settings,
    color: "text-blue-400",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", placeholder: "Rich Dating Network", help: "The name displayed across the platform" },
      { key: "site_tagline", label: "Site Tagline", type: "text", placeholder: "Find Your Perfect Match", help: "Short description shown on the landing page" },
      { key: "site_email", label: "Contact Email", type: "email", placeholder: "support@example.com" },
      { key: "maintenance_mode", label: "Maintenance Mode", type: "select", options: [["0","Off"],["1","On"]], help: "When on, only admins can access the site" },
    ]
  },
  {
    title: "Credits & Monetization",
    icon: CreditCard,
    color: "text-green-400",
    fields: [
      { key: "credits_per_message", label: "Credits Per Message (0 = free)", type: "number", placeholder: "10", help: "Credits deducted from sender per message" },
      { key: "registration_credits", label: "Credits on Registration", type: "number", placeholder: "50" },
      { key: "premium_price_monthly", label: "Premium Monthly Price ($)", type: "number", placeholder: "9.99" },
      { key: "premium_price_yearly", label: "Premium Yearly Price ($)", type: "number", placeholder: "79.99" },
    ]
  },
  {
    title: "Messaging & Automation",
    icon: MessageSquare,
    color: "text-purple-400",
    fields: [
      { key: "auto_messages_enabled", label: "Auto Messages Enabled", type: "select", options: [["1","Enabled"],["0","Disabled"]], help: "Send automated messages from fake profiles" },
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
      { key: "profile_completion_reward", label: "Credits for Full Profile", type: "number", placeholder: "20", help: "Bonus credits when user completes their profile" },
    ]
  },
  {
    title: "Social Login",
    icon: Globe,
    color: "text-cyan-400",
    fields: [
      { key: "google_client_id", label: "Google Client ID", type: "text", placeholder: "xxx.apps.googleusercontent.com", help: "From Google Cloud Console → OAuth 2.0" },
      { key: "google_client_secret", label: "Google Client Secret", type: "password", placeholder: "GOCSPX-...", help: "Keep this secret — never share it publicly" },
      { key: "facebook_app_id", label: "Facebook App ID", type: "text", placeholder: "1234567890", help: "From Meta Developer Console" },
      { key: "facebook_app_secret", label: "Facebook App Secret", type: "password", placeholder: "abc123...", help: "From Meta Developer Console → App Secret" },
    ]
  },
  {
    title: "Stripe Payments",
    icon: Shield,
    color: "text-orange-400",
    fields: [
      { key: "stripe_publishable_key", label: "Stripe Publishable Key", type: "text", placeholder: "pk_live_..." },
      { key: "stripe_secret_key", label: "Stripe Secret Key", type: "password", placeholder: "sk_live_...", help: "Never expose this to the frontend" },
      { key: "stripe_webhook_secret", label: "Stripe Webhook Secret", type: "password", placeholder: "whsec_..." },
    ]
  },
]

export default function AdminSettings() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())

  useEffect(() => {
    authFetch("/api/admin/config").then(r => r.json()).then(d => {
      setConfig(d)
      setLoading(false)
    }).catch(() => setLoading(false))
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

  function togglePassword(key: string) {
    setShowPasswords(prev => {
      const n = new Set(prev)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })
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
          <p className="text-gray-400 text-sm mt-1">Configure all platform settings in one place</p>
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
              {section.fields.map(f => (
                <div key={f.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-gray-300 text-sm font-medium">{f.label}</label>
                    {f.help && <span className="text-gray-500 text-xs max-w-xs text-right">{f.help}</span>}
                  </div>
                  {f.type === 'select' ? (
                    <select
                      value={config[f.key] ?? (f.options?.[0]?.[0] || "")}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                      className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500"
                    >
                      {f.options?.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  ) : f.type === 'password' ? (
                    <div className="relative">
                      <input
                        type={showPasswords.has(f.key) ? 'text' : 'password'}
                        value={config[f.key] ?? ""}
                        onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full bg-gray-800 text-white px-3 py-2.5 pr-10 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600"
                      />
                      <button type="button" onClick={() => togglePassword(f.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPasswords.has(f.key) ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  ) : (
                    <input
                      type={f.type || "text"}
                      value={config[f.key] ?? ""}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

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
