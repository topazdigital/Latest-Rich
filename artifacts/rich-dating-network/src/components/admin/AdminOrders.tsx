import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "../../lib/auth"
import { timeAgo } from "../../lib/utils"

interface OrderRow {
  order: {
    id: number
    userId: number
    type: string
    description: string
    amount: number
    status: string
    time: number
    ref?: string
    phone?: string
    gateway?: string
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
  mpesa:    { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },
  stripe:   { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
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

const FILTERS = ["all", "completed", "pending", "failed", "cancelled"] as const
type Filter = typeof FILTERS[number]

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState<Filter>("all")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await authFetch(`/api/admin/orders?page=${page}`)
      if (r.ok) {
        const d = await r.json()
        setOrders(Array.isArray(d) ? d : [])
      }
    } catch { /* silent */ }
    if (!silent) setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (autoRefresh) {
      intervalRef.current = setInterval(() => load(true), 10000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, load])

  const filtered = filter === "all" ? orders : orders.filter(r => r.order?.status === filter)

  const stats = {
    total: orders.filter(r => r.order?.status === "completed").reduce((s, r) => s + (r.order?.amount || 0), 0),
    count: orders.filter(r => r.order?.status === "completed").length,
    pending: orders.filter(r => r.order?.status === "pending").length,
    failed: orders.filter(r => r.order?.status === "failed").length,
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ color: "#f1f5f9", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>
          Orders &amp; Revenue
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              style={{ accentColor: "#22c55e" }}
            />
            Live refresh
          </label>
          <button
            onClick={() => load()}
            style={{
              background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
              borderRadius: "0.5rem", padding: "0.4rem 0.875rem", fontSize: "0.78rem",
              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: "0.75rem" }}>
        {[
          { label: "Page Revenue", value: `$${stats.total.toFixed(2)}`, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
          { label: "Completed", value: stats.count, color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
          { label: "Pending", value: stats.pending, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
          { label: "Failed", value: stats.failed, color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, background: s.bg, borderColor: s.color + "30", padding: "1rem" }}>
            <div style={{ color: s.color, fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>
              {s.label}
            </div>
            <div style={{ color: "#f1f5f9", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1 }}>
              {s.value}
            </div>
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
                flex: 1,
                padding: "0.45rem 0.5rem",
                borderRadius: "0.4rem",
                border: "none",
                cursor: "pointer",
                background: filter === f ? (st ? st.bg : "linear-gradient(135deg,#FF192C,#ff5f6b)") : "transparent",
                color: filter === f ? (st ? st.color : "#fff") : "#94a3b8",
                fontWeight: 600,
                fontSize: "0.75rem",
                fontFamily: "inherit",
                textTransform: "capitalize",
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
      ) : filtered.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: "3rem", color: "#475569" }}>
          No {filter === "all" ? "" : filter} orders on this page
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  {["User", "Type", "Amount", "Status", "Ref / Phone", "Time"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#64748b", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const o = row.order
                  const u = row.user
                  const statusStyle = getStatusStyle(o?.status)
                  const typeStyle = getTypeStyle(o?.type)
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#111827"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{u?.name || "Unknown"}</div>
                        <div style={{ color: "#64748b", fontSize: "0.72rem" }}>{u?.email || `uid:${o?.userId}`}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.25rem",
                          padding: "0.2rem 0.6rem", borderRadius: "999px",
                          background: typeStyle.bg, color: typeStyle.color,
                          fontSize: "0.72rem", fontWeight: 700,
                        }}>
                          {o?.type}
                          {o?.description && (
                            <span style={{ color: typeStyle.color, opacity: 0.7 }}>· {o.description}</span>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div style={{ color: "#f1f5f9", fontWeight: 700 }}>${(o?.amount || 0).toFixed(2)}</div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          padding: "0.2rem 0.6rem", borderRadius: "999px",
                          background: statusStyle.bg, color: statusStyle.color,
                          fontSize: "0.72rem", fontWeight: 700,
                        }}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {o?.ref && (
                          <div style={{ color: "#94a3b8", fontSize: "0.72rem", fontFamily: "monospace", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.ref}
                          </div>
                        )}
                        {o?.phone && (
                          <div style={{ color: "#64748b", fontSize: "0.72rem" }}>{o.phone}</div>
                        )}
                        {!o?.ref && !o?.phone && <span style={{ color: "#334155" }}>—</span>}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.72rem", whiteSpace: "nowrap" }}>
                        {timeAgo(o?.time)}
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
          style={{
            background: "#1e293b", color: page === 1 ? "#334155" : "#94a3b8",
            border: "1px solid #334155", borderRadius: "0.5rem",
            padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600,
            cursor: page === 1 ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          ← Previous
        </button>
        <span style={{ color: "#475569", fontSize: "0.82rem" }}>Page {page}</span>
        <button
          disabled={filtered.length < 50}
          onClick={() => setPage(p => p + 1)}
          style={{
            background: "#1e293b", color: filtered.length < 50 ? "#334155" : "#94a3b8",
            border: "1px solid #334155", borderRadius: "0.5rem",
            padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 600,
            cursor: filtered.length < 50 ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}
