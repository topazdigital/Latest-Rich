import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "../../lib/auth"
import { timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"

interface OrderRow {
  order: {
    id: number
    userId: number
    type: string
    description: string
    amount: number
    credits?: number
    status: string
    time: number
    stripeSessionId?: string
    currency?: string
  }
  user: {
    id: number
    name: string
    email: string
  } | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Completed" },
  pending:   { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Pending" },
  failed:    { bg: "rgba(239,68,68,0.15)",  color: "#ef4444", label: "Failed" },
  cancelled: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "Cancelled" },
}

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  premium:  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  credits:  { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  starter:  { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  boost:    { bg: "rgba(236,72,153,0.15)", color: "#ec4899" },
}

function getTypeStyle(type: string) {
  return TYPE_STYLES[type?.toLowerCase()] ?? { bg: "rgba(100,116,139,0.15)", color: "#94a3b8" }
}

function getStatusStyle(status: string) {
  return STATUS_STYLES[status?.toLowerCase()] ?? STATUS_STYLES.pending
}

const CARD: React.CSSProperties = {
  background: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "0.875rem",
  padding: "1.25rem",
}

const FILTERS = ["all", "pending", "completed", "failed", "cancelled"] as const
type Filter = typeof FILTERS[number]

interface AuditOrder {
  order: {
    id: number; userId: number; type: string; description: string
    amount: number; credits?: number; status: string; time: number
    stripeSessionId?: string; currency?: string
  }
  user: { id: number; name: string; email: string; credits: number } | null
  verdict?: "SUCCESS" | "FAILED" | "CANCELLED" | "PENDING" | "UNKNOWN"
  verifying?: boolean
  reversing?: boolean
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [fulfilling, setFulfilling] = useState<number | null>(null)
  const [reconciling, setReconciling] = useState(false)
  const [overrideCredits, setOverrideCredits] = useState<Record<number, string>>({})
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Manual grant modal
  const [grantModal, setGrantModal] = useState(false)
  const [grantEmail, setGrantEmail] = useState("")
  const [grantCredits, setGrantCredits] = useState("")
  const [grantNote, setGrantNote] = useState("")
  const [granting, setGranting] = useState(false)

  // Backfill historical amount_usd
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{ updated: number; total: number } | null>(null)

  const backfillUsd = async () => {
    if (!confirm("This will calculate USD equivalents for all historical orders using the current exchange rates saved in Payment Providers. Continue?")) return
    setBackfilling(true)
    setBackfillResult(null)
    try {
      const r = await authFetch("/api/admin/orders/backfill-usd", { method: "POST" })
      const d = await r.json()
      if (r.ok && d.success) {
        setBackfillResult({ updated: d.updated, total: d.total })
        toast.success(`✅ Backfilled ${d.updated} of ${d.total} orders with USD values`)
      } else {
        toast.error(d.error || "Backfill failed")
      }
    } catch { toast.error("Network error") }
    setBackfilling(false)
  }

  // Credit audit panel
  const [auditOpen, setAuditOpen] = useState(false)
  const [auditOrders, setAuditOrders] = useState<AuditOrder[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const loadAudit = async () => {
    setAuditLoading(true)
    try {
      const r = await authFetch("/api/admin/orders/credit-audit")
      if (r.ok) setAuditOrders((await r.json()).map((o: AuditOrder) => ({ ...o, verdict: undefined })))
      else toast.error("Failed to load audit data")
    } catch { toast.error("Network error") }
    setAuditLoading(false)
  }

  const openAudit = () => { setAuditOpen(true); loadAudit() }

  const verifyOrder = async (orderId: number) => {
    setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, verifying: true } : o))
    try {
      const r = await authFetch(`/api/admin/orders/${orderId}/verify-payhero`, { method: "POST" })
      const d = await r.json()
      if (r.ok) {
        setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, verdict: d.verdict, verifying: false } : o))
      } else {
        toast.error(d.error || "Verification failed")
        setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, verifying: false } : o))
      }
    } catch {
      toast.error("Network error")
      setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, verifying: false } : o))
    }
  }

  const reverseOrder = async (orderId: number) => {
    if (!confirm("Are you sure? This will deduct the credits from the user's account and mark the order as failed.")) return
    setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, reversing: true } : o))
    try {
      const r = await authFetch(`/api/admin/orders/${orderId}/reverse-credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled M-Pesa transaction — credits reversed by admin audit" }),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success(d.message)
        setAuditOrders(prev => prev.filter(o => o.order.id !== orderId))
        await load(true)
      } else {
        toast.error(d.error || "Reversal failed")
        setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, reversing: false } : o))
      }
    } catch {
      toast.error("Network error")
      setAuditOrders(prev => prev.map(o => o.order.id === orderId ? { ...o, reversing: false } : o))
    }
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filter !== "all") params.set("status", filter)
      if (search) params.set("search", search)
      const r = await authFetch(`/api/admin/orders?${params}`)
      if (r.ok) {
        const d = await r.json()
        setOrders(Array.isArray(d) ? d : [])
      }
    } catch { }
    if (!silent) setLoading(false)
  }, [page, filter, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 10000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, load])

  const fulfillOrder = async (orderId: number, orderCredits: number, orderType?: string) => {
    const creditsInput = overrideCredits[orderId]
    const creditsOverride = creditsInput ? parseInt(creditsInput) : null

    // Only credit-type orders need a credits amount — premium orders derive their
    // duration from the order description on the server, not from a credits field.
    if (orderType === "credits" && !orderCredits && !creditsOverride) {
      toast.error("Enter the credits amount to add before fulfilling")
      return
    }

    setFulfilling(orderId)
    try {
      const body: any = {}
      if (creditsOverride && creditsOverride > 0) body.creditsOverride = creditsOverride
      const r = await authFetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success(d.message || "Order fulfilled!")
        setOverrideCredits(prev => { const n = { ...prev }; delete n[orderId]; return n })
        await load(true)
      } else {
        toast.error(d.error || "Failed to fulfill order")
      }
    } catch {
      toast.error("Network error")
    }
    setFulfilling(null)
  }

  const reconcileAll = async () => {
    setReconciling(true)
    try {
      const r = await authFetch("/api/admin/orders/reconcile-pending", { method: "POST" })
      const d = await r.json()
      if (r.ok) {
        if (d.reconciled === 0) {
          toast.success(`No stuck pending orders found (checked ${d.total} orders)`)
        } else {
          toast.success(`✅ Auto-credited ${d.reconciled} order${d.reconciled !== 1 ? "s" : ""}!`)
        }
        await load(true)
      } else {
        toast.error(d.error || "Reconciliation failed")
      }
    } catch {
      toast.error("Network error")
    }
    setReconciling(false)
  }

  const handleGrant = async () => {
    if (!grantEmail.trim() || !grantCredits) {
      toast.error("Email and credits amount are required")
      return
    }
    setGranting(true)
    try {
      const r = await authFetch("/api/admin/orders/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: grantEmail.trim(), credits: parseInt(grantCredits), note: grantNote }),
      })
      const d = await r.json()
      if (r.ok) {
        toast.success(d.message || "Credits granted!")
        setGrantModal(false)
        setGrantEmail("")
        setGrantCredits("")
        setGrantNote("")
        await load(true)
      } else {
        toast.error(d.error || "Failed to grant credits")
      }
    } catch {
      toast.error("Network error")
    }
    setGranting(false)
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const pendingCount = orders.filter(r => r.order?.status === "pending").length
  const stats = {
    total: orders.filter(r => r.order?.status === "completed").reduce((s, r) => s + (r.order?.amount || 0), 0),
    count: orders.filter(r => r.order?.status === "completed").length,
    pending: pendingCount,
    failed: orders.filter(r => r.order?.status === "failed").length,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Credit Audit Modal */}
      {auditOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000,
          display: "flex", alignItems: "flex-start", justifyContent: "center",
          padding: "1rem", overflowY: "auto",
        }}>
          <div style={{
            background: "#0f172a", border: "1px solid #334155", borderRadius: "1rem",
            padding: "1.5rem", width: "100%", maxWidth: "780px", margin: "auto",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div>
                <h3 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "1rem", margin: 0 }}>
                  🔍 Credit Audit — PayHero Orders
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  Verify each completed M-Pesa order against PayHero. Reverse credits for any that were never paid.
                </p>
              </div>
              <button onClick={() => setAuditOpen(false)} style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: "0.5rem", padding: "0.3rem 0.75rem", fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit" }}>✕ Close</button>
            </div>

            {auditLoading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
                <div style={{ width: "1.5rem", height: "1.5rem", border: "2px solid #ef4444", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 0.75rem" }} />
                Loading PayHero orders…
              </div>
            ) : auditOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#22c55e", fontSize: "0.9rem", fontWeight: 600 }}>
                ✅ No completed PayHero credit orders found.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginTop: "1rem" }}>
                <p style={{ color: "#94a3b8", fontSize: "0.75rem", margin: 0 }}>
                  {auditOrders.length} completed PayHero credit order{auditOrders.length !== 1 ? "s" : ""} found.
                  Click <strong style={{ color: "#f1f5f9" }}>Verify</strong> to check each one against PayHero, then <strong style={{ color: "#ef4444" }}>Reverse</strong> any that were never paid.
                </p>
                {auditOrders.map(ao => {
                  const isReversible = ao.verdict === "CANCELLED" || ao.verdict === "FAILED" || ao.verdict === "PENDING"
                  const verdictColor = ao.verdict === "SUCCESS" ? "#22c55e" : isReversible ? "#ef4444" : "#94a3b8"
                  const verdictLabel = ao.verdict === "SUCCESS" ? "✅ Paid" : ao.verdict === "CANCELLED" ? "❌ Cancelled" : ao.verdict === "FAILED" ? "❌ Failed" : ao.verdict === "PENDING" ? "❌ Not Paid (STK abandoned)" : ao.verdict === "UNKNOWN" ? "❓ Unknown" : undefined
                  return (
                    <div key={ao.order.id} style={{ background: "#1e293b", border: `1px solid ${isReversible ? "#ef4444" : ao.verdict === "SUCCESS" ? "#22c55e" : "#334155"}`, borderRadius: "0.75rem", padding: "0.875rem", display: "flex", alignItems: "center", gap: "0.875rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: "0.82rem" }}>#{ao.order.id}</span>
                          <span style={{ color: "#a855f7", fontSize: "0.72rem", fontWeight: 600, background: "rgba(168,85,247,0.12)", padding: "1px 6px", borderRadius: "999px" }}>
                            {ao.order.credits || "?"} credits
                          </span>
                          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>
                            {ao.order.currency} {ao.order.amount?.toFixed(0)} · {ao.order.stripeSessionId}
                          </span>
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                          {ao.user ? <><strong style={{ color: "#e2e8f0" }}>{ao.user.name}</strong> · {ao.user.email} · balance: {ao.user.credits} cr</> : "Unknown user"}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "0.7rem", marginTop: "0.1rem" }}>
                          {new Date((ao.order.time || 0) * 1000).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap" }}>
                        {verdictLabel && (
                          <span style={{ color: verdictColor, fontWeight: 700, fontSize: "0.8rem" }}>{verdictLabel}</span>
                        )}
                        {!ao.verdict && (
                          <button
                            onClick={() => verifyOrder(ao.order.id)}
                            disabled={ao.verifying}
                            style={{ background: "#334155", color: "#f1f5f9", border: "none", borderRadius: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, cursor: ao.verifying ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: ao.verifying ? 0.6 : 1 }}
                          >
                            {ao.verifying ? "⏳ Checking…" : "🔍 Verify"}
                          </button>
                        )}
                        {isReversible && (
                          <button
                            onClick={() => reverseOrder(ao.order.id)}
                            disabled={ao.reversing}
                            style={{ background: ao.reversing ? "#334155" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.35rem 0.875rem", fontSize: "0.75rem", fontWeight: 700, cursor: ao.reversing ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: ao.reversing ? 0.6 : 1 }}
                          >
                            {ao.reversing ? "⏳ Reversing…" : `↩ Reverse ${ao.order.credits || "?"} Credits`}
                          </button>
                        )}
                        {ao.verdict === "SUCCESS" && (
                          <span style={{ color: "#475569", fontSize: "0.72rem" }}>No action needed</span>
                        )}
                        {ao.verdict === "UNKNOWN" && (
                          <button
                            onClick={() => verifyOrder(ao.order.id)}
                            disabled={ao.verifying}
                            style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            ↺ Re-check
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {!auditLoading && auditOrders.length > 0 && (
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={loadAudit} style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>↺ Reload</button>
                <button onClick={() => setAuditOpen(false)} style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓ Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Grant Modal */}
      {grantModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
        }}>
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "1rem", padding: "1.5rem", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ color: "#f1f5f9", fontWeight: 800, marginBottom: "0.25rem", fontSize: "1rem" }}>
              💰 Manually Grant Credits
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.78rem", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Use this when a user paid outside the system (e.g. direct Mpesa transfer, bank wire) and you need to credit them manually.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>User Email *</label>
                <input
                  type="email"
                  value={grantEmail}
                  onChange={e => setGrantEmail(e.target.value)}
                  placeholder="shivonaonyango@gmail.com"
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.6rem 0.875rem", color: "#f1f5f9", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Credits to Add *</label>
                <input
                  type="number"
                  value={grantCredits}
                  onChange={e => setGrantCredits(e.target.value)}
                  placeholder="e.g. 250"
                  min={1}
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.6rem 0.875rem", color: "#f1f5f9", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Note (optional)</label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={e => setGrantNote(e.target.value)}
                  placeholder="e.g. Mpesa payment KES 1300 ref: QDF123XY"
                  style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.6rem 0.875rem", color: "#f1f5f9", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                onClick={() => { setGrantModal(false); setGrantEmail(""); setGrantCredits(""); setGrantNote("") }}
                style={{ flex: 1, background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.6rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancel
              </button>
              <button
                onClick={handleGrant}
                disabled={granting || !grantEmail.trim() || !grantCredits}
                style={{
                  flex: 2, background: granting || !grantEmail.trim() || !grantCredits ? "#334155" : "linear-gradient(135deg,#22c55e,#16a34a)",
                  color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.6rem",
                  fontSize: "0.82rem", fontWeight: 700, cursor: granting ? "not-allowed" : "pointer", fontFamily: "inherit",
                }}
              >
                {granting ? "Granting…" : `✓ Grant ${grantCredits || "?"} Credits`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
          Orders &amp; Revenue
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={openAudit}
            style={{
              background: "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff", border: "none", borderRadius: "0.5rem",
              padding: "0.4rem 0.875rem", fontSize: "0.78rem",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "0.35rem",
            }}
          >
            🔍 Credit Audit
          </button>
          <button
            onClick={() => setGrantModal(true)}
            style={{
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", border: "none", borderRadius: "0.5rem",
              padding: "0.4rem 0.875rem", fontSize: "0.78rem",
              fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: "0.35rem",
            }}
          >
            💰 Grant Credits
          </button>
          <button
            onClick={backfillUsd}
            disabled={backfilling}
            title="Calculate USD value for historical orders using current exchange rates"
            style={{
              background: backfilling ? "#334155" : "linear-gradient(135deg,#0ea5e9,#0284c7)",
              color: "#fff", border: "none", borderRadius: "0.5rem",
              padding: "0.4rem 0.875rem", fontSize: "0.78rem",
              fontWeight: 700, cursor: backfilling ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.35rem",
              opacity: backfilling ? 0.7 : 1,
            }}
          >
            {backfilling ? "⏳ Backfilling…" : backfillResult ? `✅ ${backfillResult.updated} fixed` : "💱 Fix Revenue"}
          </button>
          {stats.pending > 0 && (
            <button
              onClick={reconcileAll}
              disabled={reconciling}
              style={{
                background: reconciling ? "#334155" : "linear-gradient(135deg,#f59e0b,#d97706)",
                color: "#fff", border: "none", borderRadius: "0.5rem",
                padding: "0.4rem 0.875rem", fontSize: "0.78rem",
                fontWeight: 700, cursor: reconciling ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: "0.35rem",
                opacity: reconciling ? 0.7 : 1,
              }}
            >
              {reconciling ? "⏳ Reconciling…" : `⚡ Auto-Credit ${stats.pending} Pending`}
            </button>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem" }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} style={{ accentColor: "#22c55e" }} />
            Live
          </label>
          <button
            onClick={() => load()}
            style={{ background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search by email or name…"
          style={{ flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.5rem 0.875rem", color: "#f1f5f9", fontSize: "0.82rem", outline: "none" }}
        />
        <button
          onClick={handleSearch}
          style={{ background: "#FF192C", color: "#fff", border: "none", borderRadius: "0.5rem", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          Search
        </button>
        {search && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1) }}
            style={{ background: "#334155", color: "#94a3b8", border: "none", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Pending alert */}
      {stats.pending > 0 && !search && (
        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "0.75rem", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.1rem" }}>⚠️</span>
          <div>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.82rem" }}>
              {stats.pending} pending order{stats.pending !== 1 ? "s" : ""} — credits may not have been delivered
            </div>
            <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.15rem" }}>
              Click <strong style={{ color: "#f59e0b" }}>Auto-Credit Pending</strong> to fix all at once, or use <strong style={{ color: "#f59e0b" }}>Fulfill</strong> per row. For payments made outside the system, use <strong style={{ color: "#22c55e" }}>Grant Credits</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.75rem" }}>
        {[
          { label: "Page Revenue", value: `$${stats.total.toFixed(2)}`, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
          { label: "Completed", value: stats.count, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
          { label: "Pending", value: stats.pending, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "Failed", value: stats.failed, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, background: s.bg, borderColor: s.color + "30", padding: "1rem" }}>
            <div style={{ color: s.color, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>{s.label}</div>
            <div style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.25rem", background: "#0f172a", padding: "0.3rem", borderRadius: "0.625rem", border: "1px solid #1e293b" }}>
        {FILTERS.map(f => {
          const st = f !== "all" ? getStatusStyle(f) : null
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              style={{
                flex: 1, padding: "0.45rem 0.5rem", borderRadius: "0.4rem",
                border: "none", cursor: "pointer",
                background: filter === f ? (st ? st.bg : "linear-gradient(135deg,#FF192C,#ff5f6b)") : "transparent",
                color: filter === f ? (st ? st.color : "#fff") : "#94a3b8",
                fontWeight: 600, fontSize: "0.75rem", fontFamily: "inherit", textTransform: "capitalize",
              }}
            >
              {f}
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem", color: "#475569" }}>
          <div style={{ width: "1.75rem", height: "1.75rem", border: "2px solid #FF192C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginRight: "0.75rem" }} />
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "3rem", color: "#475569" }}>
          {search ? `No orders found for "${search}"` : `No ${filter === "all" ? "" : filter} orders`}
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  {["#", "User", "Type", "Amount", "Credits", "Status", "Ref", "Time", "Action"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 0.875rem", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((row, i) => {
                  const o = row.order
                  const u = row.user
                  const statusStyle = getStatusStyle(o?.status)
                  const typeStyle = getTypeStyle(o?.type)
                  const isPending = o?.status === "pending"
                  // Parse credits from description as fallback e.g. "10 Credits" → 10
                  const parsedCreditsFromDesc = o?.description ? parseInt((o.description.match(/^(\d+)\s*credits?/i) || [])[1] || "0") : 0
                  const effectiveCredits = (o?.credits && o.credits > 0) ? o.credits : parsedCreditsFromDesc
                  const needsCreditsInput = isPending && o?.type === "credits" && effectiveCredits <= 0
                  // Auto-fill override input with parsed value when DB credits is 0
                  const creditsInputVal = overrideCredits[o?.id] !== undefined
                    ? overrideCredits[o?.id]
                    : (isPending && o?.type === "credits" && !(o?.credits && o.credits > 0) && parsedCreditsFromDesc > 0 ? String(parsedCreditsFromDesc) : "")
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        background: isPending ? "rgba(245,158,11,0.04)" : "transparent",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isPending ? "rgba(245,158,11,0.04)" : "transparent"}
                    >
                      <td style={{ padding: "0.75rem 0.875rem", color: "#475569", fontSize: "0.72rem" }}>#{o?.id}</td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{u?.name || "Unknown"}</div>
                        <div style={{ color: "#64748b", fontSize: "0.72rem" }}>{u?.email || `uid:${o?.userId}`}</div>
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", padding: "0.2rem 0.6rem", borderRadius: "999px", background: typeStyle.bg, color: typeStyle.color, fontSize: "0.72rem", fontWeight: 700 }}>
                          {o?.type}
                          {o?.description && <span style={{ opacity: 0.7 }}>· {o.description}</span>}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <div style={{ color: "#f1f5f9", fontWeight: 700 }}>
                          {o?.currency === "MANUAL" ? "Manual" : `$${(o?.amount || 0).toFixed(2)}`}
                        </div>
                        {o?.currency && o.currency !== "USD" && o.currency !== "MANUAL" && (
                          <div style={{ color: "#475569", fontSize: "0.7rem" }}>{o.currency}</div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        {effectiveCredits > 0 ? (
                          <span style={{ color: "#a855f7", fontWeight: 700 }}>
                            {effectiveCredits} cr
                            {!(o?.credits && o.credits > 0) && parsedCreditsFromDesc > 0 && (
                              <span title="Parsed from description" style={{ color: "#64748b", fontSize: "0.65rem", fontWeight: 400, marginLeft: "0.2rem" }}>(desc)</span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "#334155" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", background: statusStyle.bg, color: statusStyle.color, fontSize: "0.72rem", fontWeight: 700 }}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem" }}>
                        {o?.stripeSessionId ? (
                          <div style={{ color: "#475569", fontSize: "0.68rem", fontFamily: "monospace", maxWidth: "130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.stripeSessionId}
                          </div>
                        ) : <span style={{ color: "#334155" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem", color: "#64748b", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                        {timeAgo(o?.time)}
                      </td>
                      <td style={{ padding: "0.75rem 0.875rem", minWidth: "160px" }}>
                        {isPending ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                            {needsCreditsInput && (
                              <input
                                type="number"
                                value={creditsInputVal}
                                onChange={e => setOverrideCredits(prev => ({ ...prev, [o.id]: e.target.value }))}
                                placeholder="credits #"
                                min={1}
                                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.35rem", padding: "0.3rem 0.5rem", color: "#f1f5f9", fontSize: "0.75rem", outline: "none", boxSizing: "border-box" }}
                              />
                            )}
                            <button
                              onClick={() => fulfillOrder(o.id, effectiveCredits, o?.type)}
                              disabled={fulfilling === o.id || (needsCreditsInput && !creditsInputVal)}
                              style={{
                                background: (fulfilling === o.id || (needsCreditsInput && !creditsInputVal)) ? "#334155" : "rgba(34,197,94,0.15)",
                                color: (fulfilling === o.id || (needsCreditsInput && !creditsInputVal)) ? "#64748b" : "#22c55e",
                                border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: "0.35rem", padding: "0.3rem 0.6rem",
                                fontSize: "0.75rem", fontWeight: 700,
                                cursor: (fulfilling === o.id || (needsCreditsInput && !creditsInputVal)) ? "not-allowed" : "pointer",
                                fontFamily: "inherit", whiteSpace: "nowrap", width: "100%",
                              }}
                            >
                              {fulfilling === o.id ? "…" : (o?.type === "premium" ? "✓ Grant Premium" : `✓ Fulfill${o.credits ? ` (${o.credits} cr)` : ""}`)}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#334155", fontSize: "0.72rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
          style={{ background: "#1e293b", color: page === 1 ? "#334155" : "#94a3b8", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600, cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          ← Previous
        </button>
        <span style={{ color: "#475569", fontSize: "0.82rem" }}>Page {page}</span>
        <button
          disabled={orders.length < 50}
          onClick={() => setPage(p => p + 1)}
          style={{ background: "#1e293b", color: orders.length < 50 ? "#334155" : "#94a3b8", border: "1px solid #334155", borderRadius: "0.5rem", padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600, cursor: orders.length < 50 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
