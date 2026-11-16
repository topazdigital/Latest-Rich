import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Activity, Check, Clipboard, Eye, KeyRound, Link2, LoaderCircle, Pause, Play, Plus, RefreshCw, Search, ShieldCheck, UserRoundPlus, X } from "lucide-react"
import { authFetch } from "../../lib/auth"
import "../../pages/partner-portal.css"

type PartnerRow = {
  id: number
  username: string
  displayName: string
  referralCode: string
  parentPartnerId: number | null
  active: boolean | number
  createdAt: string | number
  lastLogin: string | number | null
  lastActivity: string | number | null
  clicks: number
  signups: number
  paidConversions: number
  recruitedPartners: number
  referralUrl: string
}
type ActivityPayload = { partner: PartnerRow; activity: { eventType: string; detail: string; createdAt: string | number }[]; referrals: { id: number; createdAt: string | number }[] }
type Secret = { title: string; username: string; password: string; loginUrl?: string; referralUrl?: string }

function dateLabel(value?: string | number | null) {
  if (!value) return "Never"
  const parsed = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function activeRow(row: PartnerRow) { return row.active === true || row.active === 1 }

export default function AdminPartners() {
  const [rows, setRows] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [parentPartnerId, setParentPartnerId] = useState("")
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [secret, setSecret] = useState<Secret | null>(null)
  const [activity, setActivity] = useState<ActivityPayload | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState("")
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await authFetch("/api/admin/partners")
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Partner accounts could not be loaded.")
      setRows(Array.isArray(payload) ? payload : Array.isArray(payload.partners) ? payload.partners : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "A connection issue interrupted the partner list.")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return normalized ? rows.filter(row => [row.displayName, row.username, row.referralCode].some(value => value?.toLowerCase().includes(normalized))) : rows
  }, [rows, query])
  const totals = useMemo(() => rows.reduce((sum, row) => ({
    clicks: sum.clicks + Number(row.clicks || 0),
    signups: sum.signups + Number(row.signups || 0),
    paidConversions: sum.paidConversions + Number(row.paidConversions || 0),
    recruited: sum.recruited + Number(row.recruitedPartners || 0),
    active: sum.active + (activeRow(row) ? 1 : 0),
  }), { clicks: 0, signups: 0, paidConversions: 0, recruited: 0, active: 0 }), [rows])

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    setError("")
    try {
      const response = await authFetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          ...(username.trim() ? { username: username.trim() } : {}),
          ...(password ? { password } : {}),
          ...(parentPartnerId ? { parentPartnerId: Number(parentPartnerId) } : {}),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Partner account could not be created.")
      setSecret({ title: "Partner access is ready", username: payload.partner.username, password: payload.oneTimePassword, loginUrl: `${window.location.origin}/partner/login`, referralUrl: payload.partner.referralUrl })
      setShowCreate(false)
      setDisplayName("")
      setUsername("")
      setPassword("")
      setParentPartnerId("")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Partner account could not be created.")
    } finally { setCreating(false) }
  }

  async function changeStatus(row: PartnerRow) {
    const activate = !activeRow(row)
    const action = activate ? "reactivate" : "pause"
    if (!window.confirm(`${activate ? "Reactivate" : "Pause"} access for ${row.displayName}?`)) return
    setBusyId(row.id)
    try {
      const response = await authFetch(`/api/admin/partners/${row.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: activate ? 1 : 0 }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || `Could not ${action} this partner.`)
      setRows(current => current.map(item => item.id === row.id ? { ...item, active: payload.active } : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${action} this partner.`)
    } finally { setBusyId(null) }
  }

  async function resetPassword(row: PartnerRow) {
    if (!window.confirm(`Issue a new one-time password for ${row.displayName}? Their current password will stop working.`)) return
    setBusyId(row.id)
    try {
      const response = await authFetch(`/api/admin/partners/${row.id}/reset-password`, { method: "POST" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Password reset failed.")
      setSecret({ title: "New one-time password", username: row.username, password: payload.oneTimePassword, loginUrl: `${window.location.origin}/partner/login`, referralUrl: row.referralUrl })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.")
    } finally { setBusyId(null) }
  }

  async function inspect(row: PartnerRow) {
    setActivity(row ? { partner: row, activity: [], referrals: [] } : null)
    setActivityLoading(true)
    setActivityError("")
    try {
      const response = await authFetch(`/api/admin/partners/${row.id}/activity`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Activity could not be loaded.")
      setActivity(payload)
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : "Activity could not be loaded.")
    } finally { setActivityLoading(false) }
  }

  async function copySecret() {
    if (!secret) return
    const text = `Partner login: ${secret.loginUrl || ""}\nUsername: ${secret.username}\nPassword: ${secret.password}${secret.referralUrl ? `\nReferral link: ${secret.referralUrl}` : ""}`
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800) } catch { setCopied(false) }
  }

  return (
    <section className="partner-portal pp-partner" data-testid="admin-partners">
      <div className="pp-heading-row" style={{ marginTop: 4 }}>
        <div><div className="pp-eyebrow">Network operations</div><h1 className="pp-title" style={{ fontSize: 30 }}>Partner accounts</h1><p className="pp-subtitle">Issue access, review attributed activity, and keep the partner network in good standing.</p></div>
        <div className="pp-admin-toolbar">
          <label className="pp-search"><Search size={15} className="pp-input-icon" /><input className="pp-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search partner or code" aria-label="Search partners" data-testid="input-search-partners" /></label>
          <button className="pp-button pp-button-primary" onClick={() => setShowCreate(true)} data-testid="button-create-partner"><Plus size={15} /> Add partner</button>
          <button className="pp-icon-button" onClick={load} aria-label="Refresh partners" data-testid="button-refresh-partners"><RefreshCw size={15} /></button>
        </div>
      </div>
      {error && <div className="pp-error" role="alert" style={{ marginBottom: 14 }} data-testid="status-admin-partners-error"><span>{error}</span><button className="pp-icon-button" style={{ marginLeft: "auto" }} onClick={() => setError("")} aria-label="Dismiss error"><X size={14} /></button></div>}
      <div className="pp-grid pp-admin-stats" aria-label="Partner network totals">
        <div className="pp-card pp-admin-stat" data-testid="metric-partner-total"><span>Total partners</span><strong>{loading ? "—" : rows.length}</strong></div>
        <div className="pp-card pp-admin-stat" data-testid="metric-partner-active"><span>Active access</span><strong>{loading ? "—" : totals.active}</strong></div>
        <div className="pp-card pp-admin-stat" data-testid="metric-partner-clicks"><span>Tracked visits</span><strong>{loading ? "—" : totals.clicks.toLocaleString()}</strong></div>
        <div className="pp-card pp-admin-stat" data-testid="metric-partner-signups"><span>Attributed signups</span><strong>{loading ? "—" : totals.signups.toLocaleString()}</strong></div>
        <div className="pp-card pp-admin-stat" data-testid="metric-partner-paid-conversions"><span>Paid conversions</span><strong>{loading ? "—" : totals.paidConversions.toLocaleString()}</strong></div>
      </div>
      <div className="pp-card">
        <div className="pp-card-head"><div><h2 className="pp-card-title">Partner directory</h2><div className="pp-card-caption">Credentials are shown only at creation or password reset.</div></div><span className="pp-pill" data-testid="text-filtered-partner-count">{filtered.length} accounts</span></div>
        {loading ? <div style={{ padding: 20 }} data-testid="status-admin-partners-loading"><div className="pp-skeleton" style={{ height: 34, marginBottom: 12 }} /><div className="pp-skeleton" style={{ height: 48, marginBottom: 8 }} /><div className="pp-skeleton" style={{ height: 48, marginBottom: 8 }} /><div className="pp-skeleton" style={{ height: 48 }} /></div> : error && !rows.length ? (
          <div className="pp-empty" data-testid="status-admin-partners-load-error"><div className="pp-empty-icon"><Activity size={19} /></div><strong>Partner directory unavailable</strong><p>Retry to load current accounts and activity.</p><button className="pp-button pp-button-soft" style={{ marginTop: 14 }} onClick={load} data-testid="button-retry-partners"><RefreshCw size={13} /> Retry</button></div>
        ) : filtered.length ? (
          <div className="pp-table-wrap"><table className="pp-table" data-testid="table-admin-partners"><thead><tr><th>Partner</th><th>Referral code</th><th>Visits</th><th>Signups</th><th>Paid conversions</th><th>Network</th><th>Last activity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filtered.map(row => <tr key={row.id} data-testid={`row-admin-partner-${row.id}`}>
              <td><strong style={{ color: "var(--pp-ink)", display: "block" }} data-testid={`text-partner-name-${row.id}`}>{row.displayName}</strong><span className="pp-mono" style={{ color: "#988b90", fontSize: 10 }} data-testid={`text-partner-username-${row.id}`}>{row.username}</span></td>
              <td><span className="pp-code" data-testid={`text-partner-code-${row.id}`}>{row.referralCode}</span></td>
              <td data-testid={`text-partner-clicks-${row.id}`}>{Number(row.clicks || 0).toLocaleString()}</td><td data-testid={`text-partner-signups-${row.id}`}>{Number(row.signups || 0).toLocaleString()}</td><td data-testid={`text-partner-paid-conversions-${row.id}`}>{Number(row.paidConversions || 0).toLocaleString()}</td>
              <td data-testid={`text-partner-downline-${row.id}`}>{Number(row.recruitedPartners || 0)}</td><td data-testid={`text-partner-last-activity-${row.id}`}>{dateLabel(row.lastActivity || row.lastLogin)}</td>
              <td><span className={activeRow(row) ? "pp-status" : "pp-pill"} data-testid={`status-partner-${row.id}`}>{activeRow(row) ? "Active" : "Paused"}</span></td>
              <td><div className="pp-row-actions">
                <button className="pp-icon-button" onClick={() => inspect(row)} title="Inspect activity" aria-label={`Inspect ${row.displayName}`} data-testid={`button-inspect-partner-${row.id}`}><Eye size={14} /></button>
                <button className="pp-icon-button" onClick={() => resetPassword(row)} disabled={busyId === row.id} title="Reset password" aria-label={`Reset password for ${row.displayName}`} data-testid={`button-reset-password-${row.id}`}>{busyId === row.id ? <LoaderCircle size={14} /> : <KeyRound size={14} />}</button>
                <button className="pp-icon-button" onClick={() => changeStatus(row)} disabled={busyId === row.id} title={activeRow(row) ? "Pause partner" : "Reactivate partner"} aria-label={`${activeRow(row) ? "Pause" : "Reactivate"} ${row.displayName}`} data-testid={`button-toggle-partner-${row.id}`}>{busyId === row.id ? <LoaderCircle size={14} /> : activeRow(row) ? <Pause size={14} /> : <Play size={14} />}</button>
              </div></td>
            </tr>)}</tbody></table></div>
        ) : <div className="pp-empty" data-testid="empty-admin-partners"><div className="pp-empty-icon"><UserRoundPlus size={19} /></div><strong>{query ? "No matching partners" : "Your partner network is ready"}</strong><p>{query ? "Try another name, username, or referral code." : "Create the first partner account and issue their private credentials."}</p>{!query && <button className="pp-button pp-button-primary" style={{ marginTop: 14 }} onClick={() => setShowCreate(true)} data-testid="button-create-first-partner"><Plus size={14} /> Create first partner</button>}</div>}
      </div>

      {showCreate && <div className="pp-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
        <section className="pp-modal" role="dialog" aria-modal="true" aria-labelledby="create-partner-title" data-testid="modal-create-partner">
          <header className="pp-modal-head"><div><div className="pp-eyebrow">New account</div><h2 className="pp-card-title" id="create-partner-title" style={{ fontSize: 18, marginTop: 5 }}>Add a partner</h2></div><button className="pp-icon-button" onClick={() => setShowCreate(false)} aria-label="Close create partner form" data-testid="button-close-create-partner"><X size={15} /></button></header>
          <form onSubmit={createPartner} className="pp-modal-body">
            <div className="pp-field" style={{ marginTop: 0 }}><label className="pp-label" htmlFor="new-partner-name">Display name</label><input id="new-partner-name" className="pp-input" value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={80} placeholder="Partner or business name" data-testid="input-new-partner-name" /></div>
            <div className="pp-grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
              <div className="pp-field"><label className="pp-label" htmlFor="new-partner-username">Username <span style={{ color: "#a09498", fontWeight: 500 }}>optional</span></label><input id="new-partner-username" className="pp-input" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" placeholder="Generated if blank" data-testid="input-new-partner-username" /></div>
              <div className="pp-field"><label className="pp-label" htmlFor="new-partner-password">Password <span style={{ color: "#a09498", fontWeight: 500 }}>optional</span></label><input id="new-partner-password" className="pp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" placeholder="Generated if blank" data-testid="input-new-partner-password" /></div>
            </div>
            <div className="pp-field"><label className="pp-label" htmlFor="new-partner-parent">Parent partner <span style={{ color: "#a09498", fontWeight: 500 }}>optional</span></label><select id="new-partner-parent" className="pp-input" value={parentPartnerId} onChange={e => setParentPartnerId(e.target.value)} data-testid="select-partner-parent"><option value="">No parent partner</option>{rows.filter(row => activeRow(row)).map(row => <option key={row.id} value={row.id}>{row.displayName} · {row.username}</option>)}</select></div>
            <p className="pp-form-note"><ShieldCheck size={14} /> Credentials are displayed once after creation. Share them through a secure channel.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 22 }}><button type="button" className="pp-button pp-button-quiet" onClick={() => setShowCreate(false)} data-testid="button-cancel-create-partner">Cancel</button><button type="submit" className="pp-button pp-button-primary" disabled={creating || !displayName.trim()} data-testid="button-submit-create-partner">{creating ? <LoaderCircle size={14} /> : <Plus size={14} />}{creating ? "Creating…" : "Create partner"}</button></div>
          </form>
        </section>
      </div>}

      {secret && <div className="pp-modal-backdrop" role="presentation">
        <section className="pp-modal" role="dialog" aria-modal="true" aria-labelledby="partner-secret-title" data-testid="modal-partner-credentials">
          <header className="pp-modal-head"><div><div className="pp-eyebrow">One-time credentials</div><h2 className="pp-card-title" id="partner-secret-title" style={{ fontSize: 18, marginTop: 5 }}>{secret.title}</h2></div><button className="pp-icon-button" onClick={() => { setSecret(null); setCopied(false) }} aria-label="Close credentials" data-testid="button-close-credentials"><X size={15} /></button></header>
          <div className="pp-modal-body">
            <div className="pp-toast-note" data-testid="status-one-time-credential">Copy and deliver these credentials securely. This password will not be shown again.</div>
            <div style={{ display: "grid", gap: 10, margin: "16px 0" }}>
              <Credential label="Username" value={secret.username} testId="text-issued-username" />
              <Credential label="Temporary password" value={secret.password} testId="text-issued-password" />
              {secret.loginUrl && <Credential label="Partner login" value={secret.loginUrl} testId="text-issued-login-url" />}
              {secret.referralUrl && <Credential label="Referral URL" value={secret.referralUrl} testId="text-issued-referral-url" />}
            </div>
            <button className="pp-button pp-button-primary" style={{ width: "100%" }} onClick={copySecret} data-testid="button-copy-credentials">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied securely" : "Copy credentials"}</button>
            <button className="pp-button pp-button-quiet" style={{ width: "100%", marginTop: 9 }} onClick={() => { setSecret(null); setCopied(false) }} data-testid="button-done-credentials">Done</button>
          </div>
        </section>
      </div>}

      {activity && <div className="pp-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setActivity(null) }}>
        <section className="pp-modal" role="dialog" aria-modal="true" aria-labelledby="partner-activity-title" data-testid="modal-partner-activity">
          <header className="pp-modal-head"><div><div className="pp-eyebrow">Account review</div><h2 className="pp-card-title" id="partner-activity-title" style={{ fontSize: 18, marginTop: 5 }}>{activity.partner.displayName}</h2><div className="pp-card-caption">{activity.partner.username} · joined {dateLabel(activity.partner.createdAt)}</div></div><button className="pp-icon-button" onClick={() => setActivity(null)} aria-label="Close activity" data-testid="button-close-partner-activity"><X size={15} /></button></header>
          <div className="pp-modal-body">
            {activityError && <div className="pp-error" role="alert" data-testid="status-partner-activity-error">{activityError}<button className="pp-button pp-button-soft" style={{ marginLeft: "auto" }} onClick={() => inspect(activity.partner)} data-testid="button-retry-partner-activity">Retry</button></div>}
            {activityLoading ? <div data-testid="status-partner-activity-loading"><div className="pp-skeleton" style={{ height: 48, marginBottom: 10 }} /><div className="pp-skeleton" style={{ height: 48, marginBottom: 10 }} /><div className="pp-skeleton" style={{ height: 48 }} /></div> : !activityError && <>
              <div className="pp-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9, marginBottom: 18 }}>
                <div className="pp-toast-note" data-testid="text-activity-clicks"><strong>{activity.partner.clicks}</strong><br />visits</div><div className="pp-toast-note" data-testid="text-activity-signups"><strong>{activity.partner.signups}</strong><br />signups</div><div className="pp-toast-note" data-testid="text-activity-paid-conversions"><strong>{activity.partner.paidConversions}</strong><br />paid conversions</div><div className="pp-toast-note" data-testid="text-activity-recruits"><strong>{activity.partner.recruitedPartners}</strong><br />recruited</div>
              </div>
              <h3 className="pp-card-title" style={{ marginBottom: 7 }}>Recent events</h3>
              {activity.activity.length ? <ul className="pp-list" data-testid="list-admin-partner-activity">{activity.activity.map((item, index) => <li className="pp-list-item" key={`${item.createdAt}-${index}`} data-testid={`item-admin-activity-${index}`}><span className="pp-event-icon"><Activity size={14} /></span><div className="pp-list-copy"><p className="pp-list-title">{item.eventType.replace(/[_-]/g, " ")}</p><p className="pp-list-detail">{item.detail}</p></div><time className="pp-list-date">{dateLabel(item.createdAt)}</time></li>)}</ul> : <div className="pp-empty" data-testid="empty-admin-partner-activity"><strong>No events recorded</strong><p>Partner activity will be listed here as it happens.</p></div>}
              <h3 className="pp-card-title" style={{ margin: "19px 0 8px" }}>Attributed signup dates</h3>
              {activity.referrals.length ? <ul className="pp-list" data-testid="list-admin-partner-referrals">{activity.referrals.map((ref, index) => <li key={ref.id} className="pp-list-item" data-testid={`item-admin-referral-${ref.id}`}><span className="pp-event-icon"><Link2 size={14} /></span><div className="pp-list-copy"><p className="pp-list-title">Attributed signup #{index + 1}</p></div><time className="pp-list-date">{dateLabel(ref.createdAt)}</time></li>)}</ul> : <div className="pp-empty" data-testid="empty-admin-partner-referrals"><strong>No attributed signups yet</strong><p>Member identities are intentionally not displayed.</p></div>}
            </>}
          </div>
        </section>
      </div>}
    </section>
  )
}

function Credential({ label, value, testId }: { label: string; value: string; testId: string }) {
  return <div style={{ border: "1px solid var(--pp-line)", background: "#faf5f4", borderRadius: 10, padding: "11px 13px" }} data-testid={testId}><div className="pp-eyebrow" style={{ fontSize: 8, marginBottom: 6 }}>{label}</div><div className="pp-mono" style={{ fontSize: 12, overflowWrap: "anywhere", color: "#3a3034" }}>{value}</div></div>
}
