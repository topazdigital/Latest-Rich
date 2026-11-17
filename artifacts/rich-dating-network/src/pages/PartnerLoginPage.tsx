import { FormEvent, useState } from "react"
import { Link } from "wouter"
import { ArrowRight, Eye, EyeOff, Heart, KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react"
import { clearStoredPartnerAuth, getStoredPartnerAuth, setStoredPartnerAuth } from "../lib/affiliate-auth"
import { clearStoredAuth } from "../lib/auth"
import "./partner-portal.css"

export default function PartnerLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/partner/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.token || !data.partner) throw new Error(data.error || "Those credentials could not be verified.")
      clearStoredAuth()
      clearStoredPartnerAuth()
      setStoredPartnerAuth({ token: data.token, partner: data.partner })
      window.location.replace("/referrals")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in is temporarily unavailable. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const existing = getStoredPartnerAuth()
  return (
    <main className="partner-portal pp-login-page pp-partner" data-testid="page-partner-login">
      <aside className="pp-login-aside">
        <Link href="/" className="pp-brand" data-testid="link-network-home">
          <span className="pp-mark"><Heart size={17} fill="currentColor" /></span>
          <span><strong className="pp-brand-name">Rich <em>Dating</em> Network</strong><span className="pp-brand-sub">Partner office</span></span>
        </Link>
        <div>
          <span className="pp-login-kicker"><ShieldCheck size={13} /> Private partner access</span>
          <h1 className="pp-login-display">Your network.<br /><em>In clear view.</em></h1>
          <p className="pp-login-copy">A dedicated workspace for the people who help Rich Dating Network grow. Track visits, signups, and the partners you bring into your network.</p>
          <div className="pp-feature-list">
            <div className="pp-feature"><span className="pp-feature-mark"><ShieldCheck size={15} /></span>Private, partner-only reporting</div>
            <div className="pp-feature"><span className="pp-feature-mark"><KeyRound size={15} /></span>Access issued directly by our team</div>
            <div className="pp-feature"><span className="pp-feature-mark"><ArrowRight size={15} /></span>Referral activity, without member details</div>
          </div>
        </div>
        <p className="pp-login-foot">RICH DATING NETWORK <span className="pp-mono">/ PARTNER PORTAL</span></p>
      </aside>
      <section className="pp-login-content">
        <div className="pp-login-form">
          <div className="pp-brand" style={{ marginBottom: 42 }}>
            <span className="pp-mark"><Heart size={17} fill="currentColor" /></span>
            <span><strong className="pp-brand-name">Rich <em>Dating</em> Network</strong><span className="pp-brand-sub">Partner office</span></span>
          </div>
          <div className="pp-eyebrow">Partner sign in</div>
          <h2 className="pp-title">Welcome back.</h2>
          <p className="pp-subtitle">Use the username and password provided by your network administrator.</p>
          {existing && (
            <div className="pp-toast-note" style={{ marginTop: 18 }} data-testid="status-existing-session">
              A partner session is already saved for <strong>{existing.partner.displayName}</strong>. Sign in again to switch accounts.
            </div>
          )}
          <form onSubmit={submit} data-testid="form-partner-login">
            <div className="pp-field">
              <label className="pp-label" htmlFor="partner-username">Partner username</label>
              <div className="pp-input-wrap">
                <UserRound className="pp-input-icon" size={16} />
                <input id="partner-username" className="pp-input has-icon" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" required placeholder="Your issued username" data-testid="input-partner-username" />
              </div>
            </div>
            <div className="pp-field">
              <label className="pp-label" htmlFor="partner-password">Password</label>
              <div className="pp-input-wrap">
                <LockKeyhole className="pp-input-icon" size={16} />
                <input id="partner-password" className="pp-input has-icon" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Enter your password" data-testid="input-partner-password" />
                <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)} className="pp-icon-button" style={{ position: "absolute", right: 8, top: 8, border: 0 }} data-testid="button-toggle-password">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="pp-form-error" role="alert" data-testid="status-login-error">{error}</div>}
            <button className="pp-button pp-button-primary" style={{ width: "100%", minHeight: 47, marginTop: 5 }} type="submit" disabled={loading} data-testid="button-partner-sign-in">
              {loading ? "Checking access…" : "Sign in to partner portal"} {!loading && <ArrowRight size={15} />}
            </button>
          </form>
          <p className="pp-form-note"><ShieldCheck size={14} /> Partner access is separate from member accounts. Need help? Contact the administrator who issued your credentials.</p>
          <div style={{ borderTop: "1px solid var(--pp-line)", marginTop: 30, paddingTop: 18, display: "flex", justifyContent: "space-between", gap: 12, color: "var(--pp-muted)", fontSize: 10 }}>
            <span>Secure partner workspace</span><Link href="/login" style={{ color: "var(--pp-red-dark)", fontWeight: 800 }} data-testid="link-member-sign-in">Member sign in</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
