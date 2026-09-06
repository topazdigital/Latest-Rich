import { useCallback, useEffect, useState } from "react"
import { CalendarDays, DollarSign, RefreshCw, Save, Users } from "lucide-react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

interface PayrollRow {
  id: number
  name: string
  email: string
  role: string
  messages: number
  messagesAllTime: number
  payout: number
}

interface PayrollData {
  rate: number
  from: number
  to: number
  moderators: PayrollRow[]
  totalMessages: number
  totalMessagesAllTime: number
  totalPayout: number
}

function startOfCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export default function AdminModeratorPayroll() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [rate, setRate] = useState("0")
  const [from, setFrom] = useState(startOfCurrentMonth)
  const [to, setTo] = useState(todayInputValue)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const fromTs = Math.floor(new Date(`${from}T00:00:00`).getTime() / 1000)
      const toTs = Math.floor(new Date(`${to}T23:59:59`).getTime() / 1000)
      const res = await authFetch(`/api/admin/moderator-payroll?from=${fromTs}&to=${toTs}`)
      if (!res.ok) throw new Error("Could not load moderator payroll")
      const result = await res.json()
      setData(result)
      setRate(String(result.rate ?? 0))
    } catch (error: any) {
      toast.error(error.message || "Could not load moderator payroll")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [from, to])

  useEffect(() => { load() }, [load])

  async function saveRate() {
    const numericRate = Number(rate)
    if (!Number.isFinite(numericRate) || numericRate < 0) {
      toast.error("Enter a valid non-negative rate")
      return
    }
    setSaving(true)
    try {
      const res = await authFetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderator_pay_per_message: numericRate.toFixed(2) }),
      })
      if (!res.ok) throw new Error("Could not save the agreed rate")
      toast.success("Agreed pay per message saved")
      await load(true)
    } catch (error: any) {
      toast.error(error.message || "Could not save the agreed rate")
    } finally {
      setSaving(false)
    }
  }

  const money = (value: number) => `$${value.toFixed(2)}`

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.25rem" }}>Moderator Payroll</h2>
          <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>Review account-attributed replies and calculate pay from the agreed per-message rate.</p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} style={{
          display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.55rem 0.8rem",
          border: "1px solid #334155", borderRadius: "0.6rem", background: "#1e293b",
          color: "#cbd5e1", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
        }}>
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(220px, 1fr)", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <DollarSign size={17} color="#22c55e" />
            <h3 style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>Agreed pay per message</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ color: "#94a3b8", fontSize: "1rem" }}>$</span>
            <input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
              style={{ width: "130px", padding: "0.55rem 0.65rem", background: "#0f172a", border: "1px solid #475569", borderRadius: "0.5rem", color: "#fff", fontSize: "0.9rem", outline: "none" }} />
            <button onClick={saveRate} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.55rem 0.7rem",
              background: "#16a34a", color: "#fff", border: "none", borderRadius: "0.5rem",
              fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1,
            }}><Save size={12} /> {saving ? "Saving..." : "Save rate"}</button>
          </div>
          <p style={{ color: "#64748b", fontSize: "0.7rem", lineHeight: 1.5, margin: "0.7rem 0 0" }}>
            Set this only after confirming the payment agreement. Payroll totals below update from this rate.
          </p>
        </div>

        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", padding: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <CalendarDays size={16} color="#60a5fa" />
            <h3 style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>Pay period</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ padding: "0.55rem 0.65rem", background: "#0f172a", border: "1px solid #475569", borderRadius: "0.5rem", color: "#fff", fontSize: "0.78rem", outline: "none" }} />
            <span style={{ color: "#64748b", fontSize: "0.75rem" }}>to</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ padding: "0.55rem 0.65rem", background: "#0f172a", border: "1px solid #475569", borderRadius: "0.5rem", color: "#fff", fontSize: "0.78rem", outline: "none" }} />
          </div>
          <p style={{ color: "#64748b", fontSize: "0.7rem", margin: "0.7rem 0 0" }}>Only replies sent from moderator accounts during this period are counted.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: "3rem" }}>Loading payroll…</div>
      ) : data && (
        <>
           <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              { label: "Messages in period", value: data.totalMessages, color: "#60a5fa", icon: <Users size={16} /> },
              { label: "All-time replies", value: data.totalMessagesAllTime, color: "#a78bfa", icon: <Users size={16} /> },
              { label: "Agreed rate", value: money(data.rate), color: "#22c55e", icon: <DollarSign size={16} /> },
              { label: "Total pay due", value: money(data.totalPayout), color: "#f59e0b", icon: <DollarSign size={16} /> },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "0.8rem", padding: "0.9rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
                <div style={{ color: stat.color }}>{stat.icon}</div>
                <div><div style={{ color: stat.color, fontSize: "1.05rem", fontWeight: 800 }}>{stat.value}</div><div style={{ color: "#64748b", fontSize: "0.68rem" }}>{stat.label}</div></div>
              </div>
            ))}
          </div>

          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", overflow: "hidden" }}>
            <div style={{ padding: "0.9rem 1rem", borderBottom: "1px solid #1f2937", color: "#e2e8f0", fontSize: "0.82rem", fontWeight: 700 }}>Moderator accounts</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
                <thead><tr style={{ color: "#64748b", fontSize: "0.68rem", textAlign: "left" }}>
                  <th style={{ padding: "0.7rem 1rem" }}>Account</th>
                  <th style={{ padding: "0.7rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>In period</th>
                  <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>All time</th>
                  <th style={{ padding: "0.7rem 1rem", textAlign: "right" }}>Pay due</th>
                </tr></thead>
                <tbody>{data.moderators.map(row => (
                  <tr key={row.id} style={{ borderTop: "1px solid #1f2937", color: "#e2e8f0", fontSize: "0.78rem" }}>
                    <td style={{ padding: "0.75rem 1rem" }}><div style={{ fontWeight: 700 }}>{row.name}</div><div style={{ color: "#64748b", fontSize: "0.68rem" }}>{row.email}</div></td>
                    <td style={{ padding: "0.75rem 1rem" }}><span style={{ color: row.role === "Admin" ? "#f59e0b" : "#60a5fa", background: row.role === "Admin" ? "#451a03" : "#172554", padding: "0.2rem 0.45rem", borderRadius: "999px", fontSize: "0.65rem", fontWeight: 700 }}>{row.role}</span></td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700 }}>{row.messages}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#c4b5fd", fontWeight: 700 }}>{row.messagesAllTime}</td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#4ade80", fontWeight: 800 }}>{money(row.payout)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {data.moderators.length === 0 && <div style={{ padding: "2rem", color: "#64748b", textAlign: "center", fontSize: "0.8rem" }}>No moderator accounts found.</div>}
          </div>
        </>
      )}
    </div>
  )
}