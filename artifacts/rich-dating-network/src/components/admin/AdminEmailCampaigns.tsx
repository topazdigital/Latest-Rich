import { useState, useEffect, useCallback } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

interface Campaign {
  id: number
  name: string
  subject: string
  htmlBody: string
  status: string
  totalRecipients: number
  sentCount: number
  failedCount: number
  batchSize: number
  coolingSeconds: number
  filterGender: number
  filterCountry: string
  filterMinAge: number
  filterMaxAge: number
  onlyReal: number
  createdAt: number
  startedAt: number
  completedAt: number
  lastSentAt: number
}

const TEMPLATES = [
  {
    name: "Welcome Back",
    subject: "We miss you! 💕 Come back and see who's waiting for you",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:40px;text-align:center">
  <div style="font-size:48px;margin-bottom:12px">💕</div>
  <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800">We Miss You!</h1>
  <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:8px 0 0">New people are waiting to meet you</p>
</div>
<div style="padding:40px;text-align:center">
  <p style="color:#111;font-size:17px;font-weight:600;margin:0 0 12px">Hey there 👋</p>
  <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px">You haven't visited in a while, and a lot has changed! New verified members have joined in your area who match your preferences.</p>
  <a href="https://richdatingnetwork.com/discover" style="display:inline-block;background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(255,25,44,0.35)">See Who's Online →</a>
  <p style="color:#aaa;font-size:12px;margin:32px 0 0;line-height:1.6">© Rich Dating Network · <a href="https://richdatingnetwork.com" style="color:#FF192C">Visit Site</a></p>
</div>
</div>`,
  },
  {
    name: "New Matches Waiting",
    subject: "❤️ You have new matches waiting — don't leave them hanging",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#1a0a0e,#7a1226,#FF192C);padding:40px;text-align:center">
  <div style="font-size:48px;margin-bottom:12px">❤️</div>
  <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800">New Matches!</h1>
  <p style="color:rgba(255,255,255,0.8);font-size:15px;margin:8px 0 0">Verified members are interested in you</p>
</div>
<div style="padding:40px;text-align:center">
  <p style="color:#111;font-size:17px;font-weight:600;margin:0 0 12px">You have new matches 🎉</p>
  <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px">Successful, verified singles have liked your profile and are waiting to connect. Log in now to see who they are and start a conversation.</p>
  <a href="https://richdatingnetwork.com/likes" style="display:inline-block;background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(255,25,44,0.35)">View Your Matches →</a>
  <p style="color:#aaa;font-size:12px;margin:32px 0 0;line-height:1.6">© Rich Dating Network · <a href="https://richdatingnetwork.com" style="color:#FF192C">Visit Site</a></p>
</div>
</div>`,
  },
  {
    name: "Premium Offer",
    subject: "👑 Special offer: Get Premium for 50% OFF this weekend only",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:40px;text-align:center">
  <div style="font-size:48px;margin-bottom:12px">👑</div>
  <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800">50% OFF Premium</h1>
  <p style="color:rgba(255,255,255,0.9);font-size:15px;margin:8px 0 0">This weekend only — exclusive offer</p>
</div>
<div style="padding:40px;text-align:center">
  <p style="color:#111;font-size:17px;font-weight:600;margin:0 0 12px">Unlock Your Full Potential 💎</p>
  <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px">Premium members get <strong>3x more profile views</strong>, unlimited messages, and appear at the top of search results.</p>
  <div style="background:#fff7ed;border:2px solid #f59e0b;border-radius:16px;padding:20px;margin:0 0 28px;display:inline-block">
    <div style="font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px">Limited Time</div>
    <div style="font-size:36px;font-weight:800;color:#d97706;line-height:1.1">50% OFF</div>
    <div style="font-size:13px;color:#92400e">Use code: <strong>WEEKEND50</strong></div>
  </div>
  <br>
  <a href="https://richdatingnetwork.com/premium" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(245,158,11,0.4)">Claim Your Discount →</a>
  <p style="color:#aaa;font-size:12px;margin:32px 0 0;line-height:1.6">© Rich Dating Network · <a href="https://richdatingnetwork.com" style="color:#FF192C">Visit Site</a></p>
</div>
</div>`,
  },
  {
    name: "Activity Reminder",
    subject: "👀 Someone viewed your profile today on Rich Dating Network",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#1e293b,#334155);padding:40px;text-align:center">
  <div style="font-size:48px;margin-bottom:12px">👀</div>
  <h1 style="color:#fff;font-size:26px;margin:0;font-weight:800">Profile Activity</h1>
  <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">People are looking at your profile</p>
</div>
<div style="padding:40px;text-align:center">
  <p style="color:#111;font-size:17px;font-weight:600;margin:0 0 12px">Your profile is getting attention! 🔥</p>
  <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 28px">Several people have viewed your profile recently. Log in to see who's been checking you out and make a connection before they move on.</p>
  <a href="https://richdatingnetwork.com/visitors" style="display:inline-block;background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(255,25,44,0.35)">See Who Visited →</a>
  <p style="color:#aaa;font-size:12px;margin:32px 0 0;line-height:1.6">© Rich Dating Network · <a href="https://richdatingnetwork.com" style="color:#FF192C">Visit Site</a></p>
</div>
</div>`,
  },
  {
    name: "Credits Offer",
    subject: "💎 Get bonus credits — your exclusive member offer inside",
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:40px;text-align:center">
  <div style="font-size:48px;margin-bottom:12px">💎</div>
  <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800">Bonus Credits!</h1>
  <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:8px 0 0">Exclusive offer for valued members</p>
</div>
<div style="padding:40px;text-align:center">
  <p style="color:#111;font-size:17px;font-weight:600;margin:0 0 12px">Special offer just for you 🎁</p>
  <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 20px">As a valued member of Rich Dating Network, we're giving you a special discount on credits. Use them to send messages, unlock profiles, and more.</p>
  <div style="background:#f5f3ff;border:2px solid #a855f7;border-radius:16px;padding:20px;margin:0 0 28px">
    <div style="font-size:13px;color:#6d28d9;font-weight:600">Buy 250 credits, Get 100 FREE</div>
    <div style="font-size:32px;font-weight:800;color:#7c3aed;margin:4px 0">350 Credits</div>
    <div style="font-size:14px;color:#7c3aed">for the price of 250</div>
  </div>
  <a href="https://richdatingnetwork.com/credits" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(124,58,237,0.4)">Claim Bonus Credits →</a>
  <p style="color:#aaa;font-size:12px;margin:32px 0 0;line-height:1.6">© Rich Dating Network · <a href="https://richdatingnetwork.com" style="color:#FF192C">Visit Site</a></p>
</div>
</div>`,
  },
  { name: "Custom (blank)", subject: "", html: "" },
]

const COUNTRIES = [
  { code: "", label: "All Countries" },
  { code: "KE", label: "Kenya" }, { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" }, { code: "GH", label: "Ghana" },
  { code: "UG", label: "Uganda" }, { code: "TZ", label: "Tanzania" },
  { code: "RW", label: "Rwanda" }, { code: "ET", label: "Ethiopia" },
  { code: "EG", label: "Egypt" }, { code: "MA", label: "Morocco" },
  { code: "GB", label: "United Kingdom" }, { code: "US", label: "United States" },
  { code: "CA", label: "Canada" }, { code: "AU", label: "Australia" },
  { code: "AE", label: "UAE" }, { code: "SA", label: "Saudi Arabia" },
  { code: "IN", label: "India" }, { code: "DE", label: "Germany" },
  { code: "FR", label: "France" }, { code: "ZM", label: "Zambia" },
  { code: "ZW", label: "Zimbabwe" }, { code: "CM", label: "Cameroon" },
]

function statusColor(s: string) {
  if (s === "completed") return "#22c55e"
  if (s === "sending") return "#f59e0b"
  if (s === "paused") return "#94a3b8"
  if (s === "failed") return "#ef4444"
  return "#475569"
}

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtDate(ts: number) {
  if (!ts) return "—"
  return new Date(ts * 1000).toLocaleString()
}

function progress(c: Campaign) {
  if (!c.totalRecipients) return 0
  return Math.round((c.sentCount / c.totalRecipients) * 100)
}

const INPUT = {
  background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155",
  borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.82rem",
  width: "100%", fontFamily: "inherit", outline: "none",
}

const BTN_PRIMARY = {
  background: "linear-gradient(135deg,#FF192C,#ff5f6b)", color: "#fff",
  border: "none", borderRadius: "0.5rem", padding: "0.55rem 1.25rem",
  fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
}

const BTN_GHOST = {
  background: "transparent", color: "#94a3b8", border: "1px solid #334155",
  borderRadius: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.8rem",
  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
}

const CARD = {
  background: "#0f172a", border: "1px solid #1e293b", borderRadius: "0.875rem", padding: "1.25rem",
}

export default function AdminEmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "create" | "detail">("list")
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [composerTab, setComposerTab] = useState<"template" | "compose" | "recipients" | "settings">("template")
  const [saving, setSaving] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)

  const [form, setForm] = useState({
    name: "",
    subject: "",
    htmlBody: "",
    batchSize: "50",
    coolingSeconds: "60",
    filterGender: "0",
    filterCountry: "",
    filterMinAge: "0",
    filterMaxAge: "0",
    onlyReal: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/admin/email-campaigns")
      const d = await r.json()
      const list: Campaign[] = Array.isArray(d) ? d : []
      setCampaigns(list)
      // Sync detail view when campaigns reload so Pause/Start buttons stay correct
      setSelected(prev => prev ? (list.find(c => c.id === prev.id) ?? prev) : null)
    } catch { toast.error("Failed to load campaigns") }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh running campaigns every 4 seconds
  useEffect(() => {
    const running = campaigns.some(c => c.status === "sending")
    if (!running) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [campaigns, load])

  function resetForm() {
    setForm({ name: "", subject: "", htmlBody: "", batchSize: "50", coolingSeconds: "60", filterGender: "0", filterCountry: "", filterMinAge: "0", filterMaxAge: "0", onlyReal: true })
    setPreviewCount(null)
    setComposerTab("template")
  }

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setForm(f => ({ ...f, subject: tpl.subject, htmlBody: tpl.html }))
    setComposerTab("compose")
  }

  async function getPreviewCount() {
    setCountLoading(true)
    try {
      const r = await authFetch("/api/admin/email-campaigns/0/preview-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filterGender: form.filterGender, filterCountry: form.filterCountry, filterMinAge: form.filterMinAge, filterMaxAge: form.filterMaxAge, onlyReal: form.onlyReal }),
      })
      const d = await r.json()
      setPreviewCount(d.count ?? null)
    } catch { toast.error("Failed to count recipients") }
    setCountLoading(false)
  }

  async function saveCampaign() {
    if (!form.name.trim()) { toast.error("Campaign name is required"); return }
    if (!form.subject.trim()) { toast.error("Email subject is required"); return }
    if (!form.htmlBody.trim()) { toast.error("Email body is required"); return }
    setSaving(true)
    try {
      const r = await authFetch("/api/admin/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || "Failed to save"); setSaving(false); return }
      toast.success("Campaign saved as draft")
      await load()
      setView("list")
      resetForm()
    } catch { toast.error("Failed to save") }
    setSaving(false)
  }

  async function startCampaign(id: number) {
    try {
      const r = await authFetch(`/api/admin/email-campaigns/${id}/start`, { method: "POST" })
      const d = await r.json()
      if (!r.ok) { toast.error(d.error || "Failed to start"); return }
      toast.success("Campaign started! Emails are being sent in batches.")
      load()
    } catch { toast.error("Failed to start campaign") }
  }

  async function pauseCampaign(id: number) {
    try {
      await authFetch(`/api/admin/email-campaigns/${id}/pause`, { method: "POST" })
      toast.success("Campaign paused")
      load()
    } catch { toast.error("Failed to pause") }
  }

  async function resetCampaign(id: number) {
    if (!confirm("Reset this campaign to draft? This will clear send progress.")) return
    try {
      await authFetch(`/api/admin/email-campaigns/${id}/reset`, { method: "POST" })
      toast.success("Campaign reset to draft")
      load()
    } catch { toast.error("Failed to reset") }
  }

  async function deleteCampaign(id: number) {
    if (!confirm("Delete this campaign permanently?")) return
    try {
      await authFetch(`/api/admin/email-campaigns/${id}`, { method: "DELETE" })
      toast.success("Campaign deleted")
      if (selected?.id === id) { setSelected(null); setView("list") }
      load()
    } catch { toast.error("Failed to delete") }
  }

  if (loading && campaigns.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem", color: "#475569" }}>
      <div style={{ width: "1.5rem", height: "1.5rem", border: "2px solid #FF192C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: "0.75rem" }} />
      Loading campaigns…
    </div>
  )

  // ── CREATE VIEW ────────────────────────────────────────────────────
  if (view === "create") {
    const tabs = [
      { key: "template", label: "1. Template" },
      { key: "compose", label: "2. Compose" },
      { key: "recipients", label: "3. Recipients" },
      { key: "settings", label: "4. Settings" },
    ]
    return (
      <div style={{ maxWidth: "860px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <button onClick={() => { setView("list"); resetForm() }} style={BTN_GHOST}>← Back</button>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>New Email Campaign</h2>
        </div>

        {/* Campaign Name */}
        <div style={{ ...CARD, marginBottom: "1rem" }}>
          <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>CAMPAIGN NAME</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. June Re-engagement Blast" style={INPUT} />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", background: "#0f172a", padding: "0.3rem", borderRadius: "0.625rem", border: "1px solid #1e293b" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setComposerTab(t.key as any)} style={{
              flex: 1, padding: "0.5rem 0.5rem", borderRadius: "0.4rem", border: "none", cursor: "pointer",
              background: composerTab === t.key ? "linear-gradient(135deg,#FF192C,#ff5f6b)" : "transparent",
              color: composerTab === t.key ? "#fff" : "#94a3b8", fontWeight: 600, fontSize: "0.75rem", fontFamily: "inherit",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab: Template */}
        {composerTab === "template" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: "0.75rem" }}>
            {TEMPLATES.map((tpl, i) => (
              <button key={i} onClick={() => applyTemplate(tpl)} style={{
                ...CARD, cursor: "pointer", textAlign: "left", border: "1px solid #334155",
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#FF192C"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#334155"}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                  {["💕", "❤️", "👑", "👀", "💎", "📝"][i]}
                </div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.25rem" }}>{tpl.name}</div>
                {tpl.subject && <div style={{ color: "#64748b", fontSize: "0.72rem", lineHeight: 1.4 }}>{tpl.subject.slice(0, 60)}…</div>}
              </button>
            ))}
          </div>
        )}

        {/* Tab: Compose */}
        {composerTab === "compose" && (
          <div style={CARD}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>EMAIL SUBJECT</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Your email subject line…" style={INPUT} />
            </div>
            <div>
              <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>HTML BODY</label>
              <textarea value={form.htmlBody} onChange={e => setForm(f => ({ ...f, htmlBody: e.target.value }))}
                rows={20} placeholder="Paste or write your HTML email body here…" style={{ ...INPUT, resize: "vertical", fontFamily: "monospace", fontSize: "0.78rem" }} />
              <p style={{ color: "#475569", fontSize: "0.72rem", marginTop: "0.4rem" }}>
                Write raw HTML. Use inline styles for best email client compatibility.
              </p>
            </div>

            {form.htmlBody && (
              <div style={{ marginTop: "1.25rem" }}>
                <div style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.5rem" }}>PREVIEW</div>
                <div style={{ background: "#fff", borderRadius: "0.5rem", padding: "1rem", border: "1px solid #334155" }}>
                  <iframe srcDoc={form.htmlBody} style={{ width: "100%", height: "400px", border: "none" }} title="Email Preview" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Recipients */}
        {composerTab === "recipients" && (
          <div style={CARD}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>GENDER FILTER</label>
                <select value={form.filterGender} onChange={e => setForm(f => ({ ...f, filterGender: e.target.value }))} style={INPUT}>
                  <option value="0">All Genders</option>
                  <option value="1">Male Only</option>
                  <option value="2">Female Only</option>
                </select>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>COUNTRY FILTER</label>
                <select value={form.filterCountry} onChange={e => setForm(f => ({ ...f, filterCountry: e.target.value }))} style={INPUT}>
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>MIN AGE (0 = any)</label>
                <input type="number" value={form.filterMinAge} onChange={e => setForm(f => ({ ...f, filterMinAge: e.target.value }))} min="0" max="99" style={INPUT} />
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>MAX AGE (0 = any)</label>
                <input type="number" value={form.filterMaxAge} onChange={e => setForm(f => ({ ...f, filterMaxAge: e.target.value }))} min="0" max="99" style={INPUT} />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", marginBottom: "1.25rem" }}>
              <input type="checkbox" checked={form.onlyReal} onChange={e => setForm(f => ({ ...f, onlyReal: e.target.checked }))} />
              <span style={{ color: "#e2e8f0", fontSize: "0.85rem", fontWeight: 600 }}>Real users only</span>
              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>(exclude fake/bot accounts)</span>
            </label>

            <button onClick={getPreviewCount} disabled={countLoading} style={{ ...BTN_GHOST, marginBottom: "0.75rem" }}>
              {countLoading ? "Counting…" : "Count Matching Recipients"}
            </button>
            {previewCount !== null && (
              <div style={{ background: "#1e293b", borderRadius: "0.5rem", padding: "0.75rem 1rem", color: "#e2e8f0", fontSize: "0.9rem", fontWeight: 700 }}>
                📬 {previewCount.toLocaleString()} users will receive this email
              </div>
            )}
          </div>
        )}

        {/* Tab: Settings */}
        {composerTab === "settings" && (() => {
          const batchNum = Math.max(1, parseInt(form.batchSize) || 50)
          const coolNum = Math.max(1, parseInt(form.coolingSeconds) || 60)
          const perHour = Math.round((batchNum / coolNum) * 3600)

          function applyHourlyRate(rateStr: string) {
            const rate = Math.max(1, parseInt(rateStr) || 100)
            // Fix batch size at current value; adjust cooling to match hourly rate
            const newCooling = Math.max(10, Math.round((batchNum / rate) * 3600))
            setForm(f => ({ ...f, coolingSeconds: String(newCooling) }))
          }

          return (
            <div style={CARD}>
              {/* Per-hour control — primary */}
              <div style={{ marginBottom: "1.25rem", background: "#1e293b", borderRadius: "0.625rem", padding: "1rem 1.125rem", border: "1px solid #334155" }}>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                  📬 MAX EMAILS PER HOUR
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <input
                    type="number"
                    defaultValue={perHour}
                    key={`ph-${batchNum}`}
                    onBlur={e => applyHourlyRate(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") applyHourlyRate((e.target as HTMLInputElement).value) }}
                    min="1" max="100000"
                    style={{ ...INPUT, width: "8rem" }}
                  />
                  <span style={{ color: "#64748b", fontSize: "0.8rem" }}>emails / hour</span>
                  <span style={{ marginLeft: "auto", background: perHour > 5000 ? "#7f1d1d44" : perHour > 1000 ? "#78350f44" : "#14532d44", color: perHour > 5000 ? "#fca5a5" : perHour > 1000 ? "#fde68a" : "#86efac", padding: "0.2rem 0.75rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>
                    {perHour > 5000 ? "⚠️ Very aggressive" : perHour > 1000 ? "⚡ Moderate" : "✅ Safe"}
                  </span>
                </div>
                <p style={{ color: "#475569", fontSize: "0.72rem", marginTop: "0.5rem", margin: "0.5rem 0 0" }}>
                  Set how many emails to send per hour. The cooling time adjusts automatically. Keep under 500/hour to stay out of spam.
                </p>
              </div>

              {/* Advanced: batch + cooling */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>BATCH SIZE</label>
                  <input type="number" value={form.batchSize} onChange={e => setForm(f => ({ ...f, batchSize: e.target.value }))} min="1" max="500" style={INPUT} />
                  <p style={{ color: "#475569", fontSize: "0.72rem", marginTop: "0.3rem" }}>Emails per batch</p>
                </div>
                <div>
                  <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>COOLING TIME (seconds)</label>
                  <input type="number" value={form.coolingSeconds} onChange={e => setForm(f => ({ ...f, coolingSeconds: e.target.value }))} min="10" max="86400" style={INPUT} />
                  <p style={{ color: "#475569", fontSize: "0.72rem", marginTop: "0.3rem" }}>Seconds between batches</p>
                </div>
              </div>

              <div style={{ background: "#1e293b", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
                <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: 0, lineHeight: 1.6 }}>
                  Current rate: <strong style={{ color: "#e2e8f0" }}>{batchNum} emails</strong> every <strong style={{ color: "#e2e8f0" }}>{coolNum}s</strong> = <strong style={{ color: perHour > 1000 ? "#fde68a" : "#86efac" }}>{perHour.toLocaleString()} emails/hour</strong>
                </p>
              </div>
            </div>
          )
        })()}

        {/* Save button */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
          <button onClick={() => { setView("list"); resetForm() }} style={BTN_GHOST}>Cancel</button>
          <button onClick={saveCampaign} disabled={saving} style={BTN_PRIMARY}>
            {saving ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const pct = progress(selected)
    // Orphaned = status is "sending" but was never properly started (startedAt=0, sentCount=0)
    const isOrphaned = selected.status === "sending" && !selected.startedAt && !selected.sentCount
    return (
      <div style={{ maxWidth: "760px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => { setView("list"); setSelected(null) }} style={BTN_GHOST}>← Back</button>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0, flex: 1 }}>{selected.name}</h2>
          <span style={{ background: statusColor(selected.status) + "22", color: statusColor(selected.status), padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.75rem", fontWeight: 700 }}>
            {statusLabel(selected.status)}
          </span>
        </div>

        {/* Orphaned campaign warning */}
        {isOrphaned && (
          <div style={{ background: "#78350f22", border: "1px solid #f59e0b", borderRadius: "0.75rem", padding: "0.875rem 1.1rem", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.1rem" }}>⚠️</span>
            <div>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.2rem" }}>Campaign was never properly started</div>
              <div style={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.5 }}>This campaign shows <strong style={{ color: "#f59e0b" }}>Running</strong> status but has 0 emails sent and no start time. It was likely set to this state by a server restart or a previous bug. Pause it, then restart — or reset it to Draft to reconfigure and send fresh.</div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Total", value: selected.totalRecipients || "—" },
            { label: "Sent", value: selected.sentCount, color: "#22c55e" },
            { label: "Failed", value: selected.failedCount, color: selected.failedCount > 0 ? "#ef4444" : undefined },
            { label: "Progress", value: `${pct}%`, color: pct === 100 ? "#22c55e" : "#f59e0b" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ color: s.color || "#e2e8f0", fontWeight: 800, fontSize: "1.4rem" }}>{String(s.value)}</div>
              <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {selected.totalRecipients > 0 && (
          <div style={{ ...CARD, marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Send Progress</span>
              <span style={{ color: "#e2e8f0", fontSize: "0.78rem", fontWeight: 700 }}>{selected.sentCount} / {selected.totalRecipients}</span>
            </div>
            <div style={{ background: "#1e293b", borderRadius: "50px", height: "8px", overflow: "hidden" }}>
              <div style={{ background: "linear-gradient(90deg,#FF192C,#ff5f6b)", height: "100%", width: `${pct}%`, transition: "width 0.3s", borderRadius: "50px" }} />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ ...CARD, marginBottom: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {[
              { label: "Subject", value: selected.subject },
              { label: "Send Rate", value: `~${Math.round((selected.batchSize / Math.max(1, selected.coolingSeconds)) * 3600).toLocaleString()} emails/hour` },
              { label: "Batch Size", value: `${selected.batchSize} emails / batch` },
              { label: "Cooling Time", value: `${selected.coolingSeconds}s between batches` },
              { label: "Gender Filter", value: selected.filterGender === 1 ? "Male" : selected.filterGender === 2 ? "Female" : "All" },
              { label: "Country Filter", value: selected.filterCountry || "All" },
              { label: "Real Users Only", value: selected.onlyReal ? "Yes" : "No" },
              { label: "Created", value: fmtDate(selected.createdAt) },
              { label: "Started", value: fmtDate(selected.startedAt) },
              { label: "Completed", value: fmtDate(selected.completedAt) },
              { label: "Last Batch At", value: fmtDate(selected.lastSentAt) },
            ].map(r => (
              <div key={r.label}>
                <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 600 }}>{r.label.toUpperCase()}</div>
                <div style={{ color: "#e2e8f0", fontSize: "0.82rem" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* HTML preview */}
        {selected.htmlBody && (
          <div style={{ ...CARD, marginBottom: "1.25rem" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.75rem" }}>EMAIL PREVIEW</div>
            <div style={{ background: "#fff", borderRadius: "0.5rem", overflow: "hidden" }}>
              <iframe srcDoc={selected.htmlBody} style={{ width: "100%", height: "360px", border: "none" }} title="Email Preview" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {(selected.status === "draft" || selected.status === "paused") && (
            <button onClick={() => { startCampaign(selected.id); setSelected(c => c ? { ...c, status: "sending" } : c) }} style={BTN_PRIMARY}>
              ▶ Start Sending
            </button>
          )}
          {selected.status === "sending" && (
            <button onClick={() => { pauseCampaign(selected.id); setSelected(c => c ? { ...c, status: "paused" } : c) }} style={{ ...BTN_GHOST, color: "#f59e0b", borderColor: "#f59e0b" }}>
              ⏸ Pause
            </button>
          )}
          {selected.status !== "draft" && (
            <button onClick={() => resetCampaign(selected.id)} style={BTN_GHOST}>
              ↺ Reset to Draft
            </button>
          )}
          <button onClick={() => deleteCampaign(selected.id)} style={{ ...BTN_GHOST, color: "#ef4444", borderColor: "#ef4444" }}>
            🗑 Delete
          </button>
          <button onClick={load} style={BTN_GHOST}>↻ Refresh</button>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ──────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Email Campaigns</h2>
          <p style={{ color: "#475569", fontSize: "0.78rem", margin: "0.25rem 0 0" }}>Design, schedule and send bulk email campaigns to your users</p>
        </div>
        <button onClick={() => { resetForm(); setView("create") }} style={BTN_PRIMARY}>+ New Campaign</button>
      </div>

      {/* Stats summary */}
      {campaigns.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Total Campaigns", value: campaigns.length },
            { label: "Completed", value: campaigns.filter(c => c.status === "completed").length, color: "#22c55e" },
            { label: "In Progress", value: campaigns.filter(c => c.status === "sending" || c.status === "paused").length, color: "#f59e0b" },
            { label: "Emails Sent", value: campaigns.reduce((s, c) => s + (c.sentCount || 0), 0).toLocaleString(), color: "#FF192C" },
          ].map(s => (
            <div key={s.label} style={{ ...CARD, textAlign: "center" }}>
              <div style={{ color: s.color || "#e2e8f0", fontWeight: 800, fontSize: "1.3rem" }}>{String(s.value)}</div>
              <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📧</div>
          <p style={{ color: "#e2e8f0", fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>No campaigns yet</p>
          <p style={{ color: "#475569", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>Create your first email campaign to re-engage your users</p>
          <button onClick={() => { resetForm(); setView("create") }} style={BTN_PRIMARY}>Create Campaign</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {campaigns.map(c => (
            <div key={c.id} style={{ ...CARD, cursor: "pointer" }}
              onClick={() => { setSelected(c); setView("detail") }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "#334155"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "#1e293b"}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "0.9rem" }}>{c.name}</span>
                    <span style={{ background: statusColor(c.status) + "22", color: statusColor(c.status), padding: "0.15rem 0.5rem", borderRadius: "50px", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>
                      {statusLabel(c.status)}
                    </span>
                    {c.status === "sending" && !c.startedAt && !c.sentCount && (
                      <span style={{ background: "#78350f44", color: "#f59e0b", padding: "0.15rem 0.5rem", borderRadius: "50px", fontSize: "0.66rem", fontWeight: 700, flexShrink: 0 }}>⚠️ Orphaned</span>
                    )}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>{c.subject}</div>
                  {c.totalRecipients > 0 && (
                    <div style={{ marginTop: "0.625rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{c.sentCount.toLocaleString()} / {c.totalRecipients.toLocaleString()} sent</span>
                        <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>{progress(c)}%</span>
                      </div>
                      <div style={{ background: "#1e293b", borderRadius: "50px", height: "4px" }}>
                        <div style={{ background: "linear-gradient(90deg,#FF192C,#ff5f6b)", height: "100%", width: `${progress(c)}%`, borderRadius: "50px" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {(c.status === "draft" || c.status === "paused") && (
                    <button onClick={() => startCampaign(c.id)} style={{ ...BTN_PRIMARY, padding: "0.4rem 0.875rem", fontSize: "0.75rem" }}>
                      ▶ Start
                    </button>
                  )}
                  {c.status === "sending" && (
                    <button onClick={() => pauseCampaign(c.id)} style={{ ...BTN_GHOST, color: "#f59e0b", borderColor: "#f59e0b", padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}>
                      ⏸ Pause
                    </button>
                  )}
                  <button onClick={() => deleteCampaign(c.id)} style={{ ...BTN_GHOST, color: "#ef4444", borderColor: "#ef4444", padding: "0.35rem 0.625rem", fontSize: "0.75rem" }}>
                    🗑
                  </button>
                </div>
              </div>
              <div style={{ color: "#334155", fontSize: "0.7rem", marginTop: "0.625rem" }}>
                Created {fmtDate(c.createdAt)} · Batch: {c.batchSize} / {c.coolingSeconds}s · {c.onlyReal ? "Real users" : "All users"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
