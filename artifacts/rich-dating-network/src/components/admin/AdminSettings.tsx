import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

const CONFIG_FIELDS = [
  { key: "site_name", label: "Site Name", default: "Rich Dating Network" },
  { key: "site_email", label: "Contact Email", default: "" },
  { key: "credits_per_message", label: "Credits Per Message", default: "10" },
  { key: "premium_price_monthly", label: "Premium Price (Monthly, USD)", default: "9.99" },
  { key: "auto_messages_enabled", label: "Auto Messages Enabled (1=yes)", default: "1" },
  { key: "auto_messages_count", label: "Auto Messages Per Login", default: "3" },
  { key: "fake_user_delay_minutes", label: "Delay Between Auto Messages (minutes)", default: "30" },
  { key: "registration_credits", label: "Credits Given on Registration", default: "50" },
  { key: "superlike_count", label: "Daily Superlikes", default: "3" },
  { key: "maintenance_mode", label: "Maintenance Mode (1=on)", default: "0" },
]

export default function AdminSettings() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authFetch("/api/admin/config").then(r => r.json()).then(d => {
      setConfig(d)
      setLoading(false)
    })
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await authFetch("/api/admin/config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      })
      toast.success("Settings saved")
    } catch { toast.error("Failed to save") } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-bold text-white">Site Settings</h2>

      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
        {CONFIG_FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-gray-400 text-sm mb-1.5 block">{f.label}</label>
            <input
              type="text"
              value={config[f.key] ?? f.default}
              onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
              className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500"
            />
          </div>
        ))}
      </div>

      <button onClick={save} disabled={saving}
        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  )
}
