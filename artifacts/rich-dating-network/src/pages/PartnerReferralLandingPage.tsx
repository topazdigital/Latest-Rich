import { useEffect, useState } from "react"
import { useLocation } from "wouter"
import { ArrowRight, Check, Link2, ShieldCheck } from "lucide-react"
import "./partner-portal.css"

export default function PartnerReferralLandingPage({ params }: { params: { code: string } }) {
  const [, setLocation] = useLocation()
  const [state, setState] = useState<"tracking" | "ready" | "error">("tracking")
  const code = params.code

  useEffect(() => {
    let alive = true
    fetch(`/api/partner/click/${encodeURIComponent(code)}`, { method: "POST" })
      .then(response => {
        if (!response.ok) throw new Error("Could not record this referral.")
        return response.json()
      })
      .then(() => {
        if (!alive) return
        setState("ready")
        window.setTimeout(() => setLocation("/register"), 900)
      })
      .catch(() => { if (alive) setState("error") })
    return () => { alive = false }
  }, [code, setLocation])

  function continueToSignup() { setLocation("/register") }

  return (
    <main className="partner-portal pp-page pp-partner" data-testid="page-partner-referral">
      <div style={{ maxWidth: 690, margin: "0 auto", minHeight: "100dvh", padding: "28px 22px", display: "flex", flexDirection: "column" }}>
        <header className="pp-topbar" style={{ paddingBottom: 20 }}>
          <div className="pp-brand">
            <span className="pp-mark"><Link2 size={17} /></span>
            <span><span className="pp-brand-name">Rich Dating Network</span><span className="pp-brand-sub">A personal introduction</span></span>
          </div>
          <span className="pp-pill"><ShieldCheck size={13} /> Private & secure</span>
        </header>
        <section style={{ flex: 1, display: "grid", placeItems: "center", padding: "40px 0" }}>
          <div className="pp-card" style={{ width: "100%", padding: "clamp(24px,6vw,48px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden="true" style={{ width: 155, height: 155, position: "absolute", right: -48, top: -62, border: "1px solid #ecdada", borderRadius: "50%", boxShadow: "0 0 0 24px #f8e9e955,0 0 0 48px #f8e9e933" }} />
            <div className="pp-eyebrow" style={{ position: "relative" }}>A thoughtful introduction</div>
            <h1 className="pp-title" style={{ fontSize: "clamp(30px,6vw,48px)", maxWidth: 470, margin: "13px auto" }}>Meet someone worth knowing.</h1>
            <p className="pp-subtitle" style={{ maxWidth: 420, margin: "0 auto" }}>You’ve been invited to explore Rich Dating Network. Create your account to discover the community.</p>
            <div style={{ width: 54, height: 54, borderRadius: 18, background: state === "error" ? "#fff0ef" : "#f8e9e9", color: state === "error" ? "#9d3037" : "var(--pp-red)", display: "grid", placeItems: "center", margin: "28px auto 14px" }}>
              {state === "ready" ? <Check size={23} /> : <Link2 size={22} />}
            </div>
            <p style={{ color: "#786c70", fontSize: 11, margin: "0 0 18px" }} data-testid="status-referral-tracking">
              {state === "tracking" && "Preparing your invitation…"}
              {state === "ready" && "Your invitation is ready. Continuing to account creation…"}
              {state === "error" && "We couldn’t confirm the invitation just now. You can still continue."}
            </p>
            {state === "error" && (
              <button type="button" className="pp-button pp-button-primary" onClick={continueToSignup} data-testid="button-continue-signup">Continue to sign up <ArrowRight size={14} /></button>
            )}
            {state !== "error" && <div className="pp-skeleton" style={{ width: 120, height: 3, margin: "0 auto" }} aria-label="Loading" />}
            <p style={{ color: "#a09498", fontSize: 9, margin: "30px 0 0" }}>Invitation code <span className="pp-code" data-testid="text-referral-code">{code}</span></p>
          </div>
        </section>
        <footer style={{ textAlign: "center", color: "#9b9094", fontSize: 10, paddingTop: 14 }}>A private introduction, handled with care.</footer>
      </div>
    </main>
  )
}
