import { useState, useEffect, useRef } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Save, Eye, EyeOff, Settings, CreditCard, MessageSquare, Users, Globe, Shield, Crown, Plus, Trash2, Image, Mail, Bell, Camera } from "lucide-react"

const SECTIONS = [
  {
    title: "General Settings",
    icon: Settings,
    color: "text-blue-400",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", placeholder: "Rich Dating Network" },
      { key: "site_tagline", label: "Site Tagline", type: "text", placeholder: "Find Your Perfect Match" },
      { key: "site_url", label: "Site URL (for referral links)", type: "text", placeholder: "https://richdatingnetwork.com", help: "Used to generate referral invite links" },
      { key: "site_email", label: "Contact Email", type: "email", placeholder: "support@example.com" },
      { key: "feed_enabled", label: "Homepage Feed (News Feed)", type: "select", options: [["0","Hidden (Discover is default home)"],["1","Visible (show Feed in nav)"]], help: "When disabled, the Feed page is hidden and Discover is the home route" },
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
    title: "Auto-Message Timing",
    icon: MessageSquare,
    color: "text-purple-400",
    fields: [
      { key: "auto_messages_enabled", label: "Auto Messages Enabled", type: "select", options: [["1","Enabled"],["0","Disabled"]] },
      { key: "auto_messages_count", label: "Auto Messages Per Trigger", type: "number", placeholder: "3" },
      { key: "auto_message_new_user_delay_seconds", label: "New User First Message Delay (seconds)", type: "number", placeholder: "5", help: "How many seconds after registration to send first message. Default: 5" },
      { key: "auto_message_min_delay_seconds", label: "Min Delay on Login (seconds)", type: "number", placeholder: "60", help: "Minimum seconds after login to trigger messages. Default: 60" },
      { key: "auto_message_max_delay_seconds", label: "Max Delay on Login (seconds)", type: "number", placeholder: "900", help: "Maximum seconds after login. Default: 900 (15 min). Message fires at random time in range." },
      { key: "email_notifications_enabled", label: "Email Notifications", type: "select", options: [["1","Enabled"],["0","Disabled"]], help: "Send email alerts for new messages, likes, etc." },
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
    title: "Registration & Verification",
    icon: Shield,
    color: "text-pink-400",
    fields: [
      { key: "require_email_verification", label: "Require Email Verification", type: "select", options: [["0","No (users access site instantly)"],["1","Yes (must verify email first)"]], help: "Toggle whether new users must verify their email" },
      { key: "photo_moderation", label: "Photo Moderation (Manual Review)", type: "select", options: [["0","Auto-approve"],["1","Manual review required"]], help: "Require admin approval for all uploaded photos" },
      { key: "auto_detect_contacts", label: "Auto-Detect Contact Info in Photos", type: "select", options: [["1","Enabled (reject suspicious photos)"],["0","Disabled"]], help: "Automatically reject photos that appear to contain phone numbers or contact info in the filename" },
      { key: "verification_mode", label: "Identity Verification Mode", type: "select", options: [["manual","Manual (admin reviews each selfie)"],["auto","Auto-approve (selfie accepted instantly)"]], help: "How to handle user identity verification selfies" },
      { key: "verification_gesture", label: "Verification Gesture / Challenge Text", type: "text", placeholder: "e.g. Hold up two fingers and smile", help: "The gesture users must perform in their selfie photo to prove they are real" },
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

const EMAIL_FIELDS = [
  { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com or mail.yourdomain.com" },
  { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
  { key: "smtp_user", label: "SMTP Username / Email", type: "text", placeholder: "noreply@yourdomain.com" },
  { key: "smtp_pass", label: "SMTP Password", type: "password", placeholder: "Your email password or app password" },
  { key: "smtp_from", label: "From Email", type: "text", placeholder: "noreply@yourdomain.com" },
  { key: "smtp_from_name", label: "From Name", type: "text", placeholder: "Rich Dating Network" },
  { key: "smtp_secure", label: "Use TLS/SSL", type: "select", options: [["0","No (STARTTLS on port 587)"],["1","Yes (SSL on port 465)"]] },
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
  const [testingEmail, setTestingEmail] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set())
  const [packages, setPackages] = useState<PremiumPkg[]>(DEFAULT_PACKAGES)
  const [pkgLoading, setPkgLoading] = useState(true)
  const [logoUrl, setLogoUrl] = useState("")
  const [faviconUrl, setFaviconUrl] = useState("")
  const [gestureImageUrl, setGestureImageUrl] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [uploadingGesture, setUploadingGesture] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const logoRef = useRef<HTMLInputElement>(null)
  const faviconRef = useRef<HTMLInputElement>(null)
  const gestureRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    authFetch("/api/admin/config").then(r => r.json()).then(d => {
      setConfig(d)
      setLoading(false)
    }).catch(() => setLoading(false))

    authFetch("/api/premium/packages").then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d) && d.length > 0) setPackages(d)
      setPkgLoading(false)
    }).catch(() => setPkgLoading(false))

    fetch("/api/branding/public").then(r => r.json()).then((d: any) => {
      if (d.branding_logo) setLogoUrl(d.branding_logo)
      if (d.branding_favicon) setFaviconUrl(d.branding_favicon)
    }).catch(() => {})
    authFetch("/api/admin/config").then(r => r.json()).then((d: any) => {
      if (d.branding_gesture) setGestureImageUrl(d.branding_gesture)
    }).catch(() => {})
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

  const sendTestEmail = async () => {
    if (!testEmail) { toast.error("Enter a test email address"); return }
    setTestingEmail(true)
    try {
      const res = await authFetch("/api/admin/test-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail })
      })
      const data = await res.json()
      if (res.ok) toast.success("Test email sent! Check your inbox.")
      else toast.error(data.error || "Failed to send test email")
    } catch { toast.error("Failed") } finally { setTestingEmail(false) }
  }

  async function uploadBranding(type: "logo" | "favicon" | "gesture", file: File) {
    const setter = type === "logo" ? setUploadingLogo : type === "favicon" ? setUploadingFavicon : setUploadingGesture
    setter(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await authFetch(`/api/branding/upload/${type}`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Upload failed"); return }
      if (type === "logo") setLogoUrl(data.url)
      else if (type === "favicon") setFaviconUrl(data.url)
      else setGestureImageUrl(data.url)
      toast.success(`${type === "logo" ? "Logo" : type === "favicon" ? "Favicon" : "Gesture image"} updated!`)
    } catch { toast.error("Upload failed") } finally { setter(false) }
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

  function renderField(f: any) {
    if (f.type === 'select') return (
      <select value={config[f.key] ?? (f.options?.[0]?.[0] || "")}
        onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500">
        {f.options?.map(([v, l]: string[]) => <option key={v} value={v}>{l}</option>)}
      </select>
    )
    if (f.type === 'password') return (
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
    )
    return (
      <input type={f.type || "text"} value={config[f.key] ?? ""}
        onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
        placeholder={f.placeholder}
        className="w-full bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600" />
    )
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

      {/* Branding */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-pink-400">
            <Image size={16} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Branding & Logo</h3>
            <p className="text-gray-500 text-xs">Upload your site logo and favicon</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-3 gap-5">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-3 block">Site Logo</label>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" /> : <Camera size={22} className="text-gray-600" />}
              </div>
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadBranding("logo", e.target.files[0])} />
              <button onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium border border-gray-700 disabled:opacity-50">
                {uploadingLogo ? "Uploading..." : "Upload Logo"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-gray-300 text-sm font-medium mb-3 block">Favicon</label>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
                {faviconUrl ? <img src={faviconUrl} alt="Favicon" className="w-10 h-10 object-contain" /> : <Camera size={22} className="text-gray-600" />}
              </div>
              <input ref={faviconRef} type="file" accept="image/*,.ico" className="hidden"
                onChange={e => e.target.files?.[0] && uploadBranding("favicon", e.target.files[0])} />
              <button onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium border border-gray-700 disabled:opacity-50">
                {uploadingFavicon ? "Uploading..." : "Upload Favicon"}
              </button>
            </div>
          </div>
          <div>
            <label className="text-gray-300 text-sm font-medium mb-3 block">Verification Gesture Image</label>
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
                {gestureImageUrl ? <img src={gestureImageUrl} alt="Gesture" className="w-full h-full object-cover" /> : <Camera size={22} className="text-gray-600" />}
              </div>
              <input ref={gestureRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && uploadBranding("gesture", e.target.files[0])} />
              <button onClick={() => gestureRef.current?.click()} disabled={uploadingGesture}
                className="px-3 py-1.5 bg-pink-900 hover:bg-pink-800 text-pink-300 rounded-lg text-xs font-medium border border-pink-800 disabled:opacity-50">
                {uploadingGesture ? "Uploading..." : "Upload Gesture"}
              </button>
              <p className="text-gray-600 text-xs text-center">Shown to users during verification</p>
            </div>
          </div>
        </div>
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
                  {renderField(f)}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Email / SMTP Settings */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-blue-400">
            <Mail size={16} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Email / SMTP Settings</h3>
            <p className="text-gray-500 text-xs">Configure outgoing mail for password resets, verification, and notifications</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-800/50 rounded-xl p-3 mb-2">
            <p className="text-gray-400 text-xs leading-relaxed">
              <strong className="text-gray-300">SMTP examples:</strong> Gmail: host=smtp.gmail.com port=587. Your host: mail.yourdomain.com port=587.
              Use an App Password for Gmail (not your regular password). These settings are used for sending password reset links, email verification, and new message notifications.
            </p>
          </div>
          {EMAIL_FIELDS.map((f: any) => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-300 text-sm font-medium">{f.label}</label>
              </div>
              {renderField({ ...f, options: f.options })}
            </div>
          ))}

          <div className="border-t border-gray-800 pt-4">
            <label className="text-gray-300 text-sm font-medium mb-2 block">Test Email</label>
            <div className="flex gap-2">
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                className="flex-1 bg-gray-800 text-white px-3 py-2.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 placeholder-gray-600"
                placeholder="your@email.com" />
              <button onClick={sendTestEmail} disabled={testingEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {testingEmail ? "Sending..." : "Send Test"}
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Send a test email to verify your SMTP settings are correct</p>
          </div>
        </div>
      </div>

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
