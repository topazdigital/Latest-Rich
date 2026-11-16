import { useCallback, useEffect, useState, type ReactNode } from "react"
import { useLocation } from "wouter"
import { Activity, ArrowDownRight, ArrowUpRight, BadgeCheck, Check, Clipboard, ExternalLink, LogOut, MousePointer2, RefreshCw, UserRoundPlus, UsersRound } from "lucide-react"
import { clearStoredPartnerAuth, getStoredPartnerAuth, partnerFetch } from "../lib/affiliate-auth"
import "./partner-portal.css"

type Dashboard = {
  partner: { id: number; username: string; displayName: string; referralCode: string; parentPartnerId: number | null; createdAt: string | number; lastLogin: string | number | null }
  referralUrl: string
  stats: { clicks: number; signups: number; paidConversions: number; conversionRate: number }
  referrals: { id: number; createdAt: string | number }[]
  activity: { eventType: string; detail: string; createdAt: string | number }[]
  downline: { id: number; displayName: string; username: string; referralCode: string; active: boolean; createdAt: string | number }[]
}

function displayDate(value?: string | number | null) {
  if (!value) return "—"
  const parsed = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "P" }

export default function PartnerDashboardPage() {
  const [, setLocation] = useLocation()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const auth = getStoredPartnerAuth()

  const load = useCallback(async () => {
    if (!getStoredPartnerAuth()?.token) { setLocation("/partner/login"); return }
    setLoading(true)
    setError("")
    try {
      const response = await partnerFetch("/api/partner/dashboard")
      if (response.status === 401 || response.status === 403) {
        clearStoredPartnerAuth()
        setLocation("/partner/login")
        return
      }
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "We couldn’t load your partner activity.")
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "A connection issue interrupted the dashboard.")
    } finally { setLoading(false) }
  }, [setLocation])

  useEffect(() => { load() }, [load])
  async function copyReferral() {
    if (!data?.referralUrl) return
    try {
      await navigator.clipboard.writeText(data.referralUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch { setError("Clipboard access is unavailable. Select and copy the referral URL instead.") }
  }
  function logout() {
    clearStoredPartnerAuth()
    setLocation("/partner/login")
  }
  if (!auth) return <main className="partner-portal pp-page" data-testid="page-partner-dashboard-redirect" />

  return (
    <main className="partner-portal pp-page pp-partner" data-testid="page-partner-dashboard">
      <div className="pp-shell">
        <header className="pp-topbar">
          <div className="pp-brand">
            <span className="pp-mark"><Activity size={17} /></span>
            <span><span className="pp-brand-name">Rich Dating Network</span><span className="pp-brand-sub">Partner office</span></span>
          </div>
          <div className="pp-top-actions">
            <span className="pp-pill"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4c8b6a" }} /> Partner account</span>
            <button className="pp-button pp-button-quiet" onClick={logout} data-testid="button-partner-logout"><LogOut size={14} /> Sign out</button>
          </div>
        </header>
        {loading && !data ? (
          <section aria-label="Loading partner dashboard" data-testid="status-dashboard-loading">
            <div className="pp-heading-row"><div style={{ width: "60%" }}><div className="pp-skeleton" style={{ height: 10, width: 110, marginBottom: 14 }} /><div className="pp-skeleton" style={{ height: 36, width: 270, marginBottom: 10 }} /><div className="pp-skeleton" style={{ height: 12, width: 320 }} /></div></div>
            <div className="pp-grid pp-stats">{[1, 2, 3, 4].map(i => <div key={i} className="pp-card pp-stat"><div className="pp-skeleton" style={{ height: 11, width: 90 }} /><div className="pp-skeleton" style={{ height: 30, width: 80, marginTop: 18 }} /></div>)}</div>
            <div className="pp-grid pp-main-grid"><div className="pp-card" style={{ height: 255 }} /><div className="pp-card" style={{ height: 255 }} /></div>
          </section>
        ) : error && !data ? (
          <section style={{ maxWidth: 630, margin: "80px auto" }} data-testid="status-dashboard-error">
            <div className="pp-empty-icon"><Activity size={20} /></div>
            <h1 className="pp-title" style={{ textAlign: "center" }}>Your dashboard is taking a pause.</h1>
            <p className="pp-subtitle" style={{ textAlign: "center", marginBottom: 20 }}>{error}</p>
            <div style={{ display: "flex", justifyContent: "center" }}><button className="pp-button pp-button-primary" onClick={load} data-testid="button-retry-dashboard"><RefreshCw size={14} /> Try again</button></div>
          </section>
        ) : data ? (
          <>
            <section className="pp-heading-row">
              <div>
                <div className="pp-eyebrow">Partner overview</div>
                <h1 className="pp-title" data-testid="text-partner-greeting">Good to see you, {data.partner.displayName}.</h1>
                <p className="pp-subtitle">Your referral activity, at a glance. Performance is updated as new visits and signups are recorded.</p>
              </div>
              <div className="pp-pill pp-mono" data-testid="text-referral-code">CODE&nbsp; {data.partner.referralCode}</div>
            </section>
            {error && <div className="pp-error" role="alert" data-testid="status-dashboard-warning">{error}</div>}
            <section className="pp-grid pp-stats" aria-label="Referral performance">
              <Stat label="Link visits" value={data.stats.clicks} foot="Total tracked visits" icon={<MousePointer2 size={16} />} testId="metric-clicks" />
              <Stat label="Signups" value={data.stats.signups} foot="Accounts attributed to you" icon={<UserRoundPlus size={16} />} testId="metric-signups" />
              <Stat label="Paid conversions" value={data.stats.paidConversions} foot="Referred members with a completed order" icon={<BadgeCheck size={16} />} testId="metric-paid-conversions" />
              <Stat label="Visit to signup" value={`${Number(data.stats.conversionRate || 0).toFixed(1)}%`} foot="Signups divided by visits" icon={<ArrowUpRight size={16} />} testId="metric-conversion" />
            </section>
            <section className="pp-grid pp-main-grid">
              <div className="pp-card">
                <div className="pp-card-head"><div><h2 className="pp-card-title">Your referral link</h2><div className="pp-card-caption">Share this link to attribute new visits to your account.</div></div><ExternalLink size={15} color="#a19498" /></div>
                <div className="pp-card-body">
                  <div className="pp-link-row">
                    <span className="pp-link-text pp-mono" data-testid="text-referral-url">{data.referralUrl}</span>
                    <button className="pp-button pp-button-primary" onClick={copyReferral} data-testid="button-copy-referral">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy link"}</button>
                  </div>
                  <div style={{ marginTop: 17 }}>
                    <div className="pp-metric-line"><span>Partner since</span><strong data-testid="text-partner-created">{displayDate(data.partner.createdAt)}</strong></div>
                    <div className="pp-metric-line"><span>Last sign in</span><strong data-testid="text-partner-last-login">{displayDate(data.partner.lastLogin)}</strong></div>
                    <div className="pp-metric-line"><span>Your username</span><strong className="pp-mono" data-testid="text-partner-username">{data.partner.username}</strong></div>
                  </div>
                </div>
              </div>
              <div className="pp-card">
                <div className="pp-card-head"><div><h2 className="pp-card-title">Recent activity</h2><div className="pp-card-caption">A private log of referral milestones.</div></div><Activity size={15} color="#a19498" /></div>
                <div className="pp-card-body">
                  {data.activity.length ? <ul className="pp-list" data-testid="list-partner-activity">{data.activity.slice(0, 6).map((event, index) => (
                    <li key={`${event.createdAt}-${index}`} className="pp-list-item" data-testid={`item-activity-${index}`}>
                      <span className="pp-event-icon"><ArrowDownRight size={15} /></span><div className="pp-list-copy"><p className="pp-list-title">{event.eventType.replace(/[_-]/g, " ")}</p><p className="pp-list-detail">{event.detail}</p></div><time className="pp-list-date">{displayDate(event.createdAt)}</time>
                    </li>
                  ))}</ul> : <Empty icon={<Activity size={18} />} title="No activity yet" text="When visits or signups are recorded, they’ll appear here." testId="empty-activity" />}
                </div>
              </div>
            </section>
            <section className="pp-card" style={{ marginTop: 18 }}>
              <div className="pp-card-head"><div><h2 className="pp-card-title">Referral history</h2><div className="pp-card-caption">Signup dates only. Referred members’ identities remain private.</div></div><span className="pp-pill" data-testid="text-referral-count">{data.referrals.length} signups</span></div>
              {data.referrals.length ? <div className="pp-table-wrap"><table className="pp-table" data-testid="table-referral-history"><thead><tr><th>Referral</th><th>Recorded</th><th>Attribution</th></tr></thead><tbody>{data.referrals.map((ref, index) => <tr key={ref.id} data-testid={`row-referral-${ref.id}`}><td className="pp-mono">#{String(index + 1).padStart(3, "0")}</td><td>{displayDate(ref.createdAt)}</td><td><span className="pp-status">Attributed</span></td></tr>)}</tbody></table></div> : <Empty icon={<UsersRound size={19} />} title="Your first referral is on its way" text="Share your link to start building a private history of attributed signups." testId="empty-referrals" /> }
            </section>
            <section className="pp-card" style={{ marginTop: 18 }}>
              <div className="pp-card-head"><div><h2 className="pp-card-title">Partner network</h2><div className="pp-card-caption">Partners you’ve introduced to the network.</div></div><span className="pp-pill" data-testid="text-downline-count">{data.downline.length} partners</span></div>
              {data.downline.length ? <div className="pp-table-wrap"><table className="pp-table" data-testid="table-partner-network"><thead><tr><th>Partner</th><th>Username</th><th>Joined</th><th>Status</th></tr></thead><tbody>{data.downline.map(item => <tr key={item.id} data-testid={`row-downline-${item.id}`}><td><span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><span style={{ width: 28, height: 28, borderRadius: 9, display: "grid", placeItems: "center", background: "#f5e8e8", color: "#8f1d30", fontWeight: 800, fontSize: 9 }}>{initials(item.displayName)}</span><strong style={{ color: "var(--pp-ink)" }}>{item.displayName}</strong></span></td><td className="pp-mono">{item.username}</td><td>{displayDate(item.createdAt)}</td><td><span className={item.active ? "pp-status" : "pp-pill"}>{item.active ? "Active" : "Paused"}</span></td></tr>)}</tbody></table></div> : <Empty icon={<UsersRound size={19} />} title="Your network starts here" text="Introduced partners will appear here when they join your network." testId="empty-downline" /> }
            </section>
            <footer style={{ textAlign: "center", color: "#a09498", fontSize: 10, marginTop: 28 }}>Partner reporting contains no member profile information.</footer>
          </>
        ) : null}
      </div>
    </main>
  )
}

function Stat({ label, value, foot, icon, testId }: { label: string; value: string | number; foot: string; icon: ReactNode; testId: string }) {
  return <div className="pp-card pp-stat" data-testid={testId}><span className="pp-stat-mark">{icon}</span><div className="pp-stat-label">{label}</div><div className="pp-stat-value">{value}</div><div className="pp-stat-foot">{foot}</div></div>
}
function Empty({ icon, title, text, testId }: { icon: ReactNode; title: string; text: string; testId: string }) {
  return <div className="pp-empty" data-testid={testId}><div className="pp-empty-icon">{icon}</div><strong>{title}</strong><p>{text}</p></div>
}
