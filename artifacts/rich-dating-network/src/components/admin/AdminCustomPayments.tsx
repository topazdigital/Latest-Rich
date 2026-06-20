import { useState, useEffect, useCallback } from "react"
import { authFetch } from "../../lib/auth"
import { timeAgo } from "../../lib/utils"

const GATEWAY_TYPES = [
  { value: 1, label: "Credits Only" },
  { value: 2, label: "Premium Only" },
  { value: 3, label: "Credits & Premium" },
]

function GatewayForm({ initial, onSave, onCancel }: { initial?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    logo: initial?.logo || "",
    description: initial?.description || "",
    status: initial?.status ?? 1,
    reviewTime: initial?.reviewTime ?? 24,
    externalUrl: initial?.externalUrl || "",
    country: initial?.country || "",
    type: initial?.type ?? 1,
    proofLabel: initial?.proofLabel || "Transaction ID / Screenshot",
  })

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "1rem", padding: "1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {[
          { key: "name", label: "Gateway Name *", placeholder: "e.g. M-Pesa Kenya" },
          { key: "logo", label: "Logo URL / Emoji", placeholder: "📱 or https://..." },
          { key: "externalUrl", label: "External URL (optional)", placeholder: "https://mpesa.safaricom.co.ke" },
          { key: "country", label: "Country Codes (comma-separated)", placeholder: "KE, TZ, UG or leave blank for all" },
          { key: "proofLabel", label: "Proof Field Label", placeholder: "Transaction ID / Screenshot" },
        ].map(field => (
          <div key={field.key} style={{ gridColumn: field.key === "description" ? "1/-1" : undefined }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>{field.label}</label>
            <input
              value={(form as any)[field.key]}
              onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              style={{ width: "100%", padding: "0.6rem 0.875rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        ))}
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>Review Time (hours)</label>
          <input
            type="number" value={form.reviewTime}
            onChange={e => setForm(p => ({ ...p, reviewTime: parseInt(e.target.value) || 24 }))}
            style={{ width: "100%", padding: "0.6rem 0.875rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>Payment Type</label>
          <select value={form.type} onChange={e => setForm(p => ({ ...p, type: parseInt(e.target.value) }))}
            style={{ width: "100%", padding: "0.6rem 0.875rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.85rem", outline: "none", fontFamily: "inherit" }}>
            {GATEWAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>Payment Instructions</label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Instructions shown to users, e.g. 'Send payment to Safaricom Till No. 123456. Send screenshot as proof.'"
            rows={3}
            style={{ width: "100%", padding: "0.6rem 0.875rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", color: "#94a3b8", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.3rem" }}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: parseInt(e.target.value) }))}
            style={{ padding: "0.6rem 0.875rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.85rem", fontFamily: "inherit" }}>
            <option value={1}>Active</option>
            <option value={0}>Disabled</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
        <button onClick={() => onSave(form)} style={{ padding: "0.6rem 1.25rem", borderRadius: "0.625rem", border: "none", background: "#FF192C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {initial ? "Update" : "Create"} Gateway
        </button>
        <button onClick={onCancel} style={{ padding: "0.6rem 1.25rem", borderRadius: "0.625rem", border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminCustomPayments() {
  const [tab, setTab] = useState<"gateways" | "orders">("gateways")
  const [gateways, setGateways] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loadingG, setLoadingG] = useState(true)
  const [loadingO, setLoadingO] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [orderFilter, setOrderFilter] = useState("pending")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({})

  const loadGateways = useCallback(async () => {
    setLoadingG(true)
    const r = await authFetch("/api/custom-payments/admin/gateways")
    const d = await r.json()
    setGateways(Array.isArray(d) ? d : [])
    setLoadingG(false)
  }, [])

  const loadOrders = useCallback(async () => {
    setLoadingO(true)
    const r = await authFetch(`/api/custom-payments/admin/orders?status=${orderFilter}`)
    const d = await r.json()
    setOrders(Array.isArray(d) ? d : [])
    setLoadingO(false)
  }, [orderFilter])

  useEffect(() => { loadGateways() }, [loadGateways])
  useEffect(() => { loadOrders() }, [loadOrders])

  async function handleCreate(data: any) {
    await authFetch("/api/custom-payments/admin/gateways", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    setShowForm(false)
    loadGateways()
  }

  async function handleUpdate(data: any) {
    await authFetch(`/api/custom-payments/admin/gateways/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    setEditing(null)
    loadGateways()
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this gateway?")) return
    await authFetch(`/api/custom-payments/admin/gateways/${id}`, { method: "DELETE" })
    loadGateways()
  }

  async function handleApprove(id: number) {
    setProcessingId(id)
    await authFetch(`/api/custom-payments/admin/orders/${id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
    setProcessingId(null)
    loadOrders()
  }

  async function handleReject(id: number) {
    setProcessingId(id)
    await authFetch(`/api/custom-payments/admin/orders/${id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: rejectNote[id] || "" }) })
    setProcessingId(null)
    setRejectNote(p => { const n = { ...p }; delete n[id]; return n })
    loadOrders()
  }

  const pendingCount = orders.filter((o: any) => o.order?.status === "pending").length

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.35rem" }}>Manual Payment Gateways</h2>
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Add custom payment methods like M-Pesa Till, bank transfers, etc. Users submit proof and you approve manually.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #1f2937", paddingBottom: "0" }}>
        {[
          { id: "gateways", label: "Payment Gateways", badge: gateways.length },
          { id: "orders", label: "Pending Orders", badge: pendingCount, badgeColor: "#ef4444" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: "0.6rem 1.25rem", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit",
            color: tab === t.id ? "#FF192C" : "#6b7280", fontWeight: 700, fontSize: "0.875rem",
            borderBottom: `2px solid ${tab === t.id ? "#FF192C" : "transparent"}`,
            display: "flex", alignItems: "center", gap: "0.5rem", position: "relative", top: "1px",
          }}>
            {t.label}
            {(t.badge ?? 0) > 0 && (
              <span style={{ background: t.badgeColor || "#374151", color: "#fff", fontSize: "0.65rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "999px" }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Gateways Tab */}
      {tab === "gateways" && (
        <div>
          {!showForm && !editing && (
            <button onClick={() => setShowForm(true)} style={{ marginBottom: "1rem", padding: "0.6rem 1.25rem", borderRadius: "0.75rem", border: "none", background: "#FF192C", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.875rem" }}>
              + Add Gateway
            </button>
          )}
          {showForm && !editing && <GatewayForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}

          {loadingG ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Loading...</div>
          ) : gateways.length === 0 ? (
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", padding: "3rem", textAlign: "center", color: "#6b7280" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>💳</div>
              <p style={{ fontWeight: 700, color: "#6b7280", marginBottom: "0.5rem" }}>No manual gateways yet</p>
              <p style={{ fontSize: "0.82rem" }}>Add your first custom payment method above</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {gateways.map((g: any) => (
                <div key={g.id}>
                  {editing?.id === g.id ? (
                    <GatewayForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
                  ) : (
                    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                        {g.logo?.startsWith("http") ? <img src={g.logo} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "0.5rem" }} /> : (g.logo || "💳")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                          <p style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem" }}>{g.name}</p>
                          <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "0.1rem 0.4rem", borderRadius: "999px", background: g.status === 1 ? "#166534" : "#374151", color: g.status === 1 ? "#86efac" : "#9ca3af" }}>
                            {g.status === 1 ? "ACTIVE" : "DISABLED"}
                          </span>
                          <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "999px", background: "#1e293b", color: "#94a3b8" }}>
                            {GATEWAY_TYPES.find(t => t.value === g.type)?.label || "Credits"}
                          </span>
                        </div>
                        <p style={{ color: "#6b7280", fontSize: "0.78rem" }}>
                          {g.country ? `🌍 ${g.country}` : "🌍 All countries"} · ⏱ {g.reviewTime}h review
                        </p>
                        {g.description && <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "400px" }}>{g.description}</p>}
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                        <button onClick={() => { setEditing(g); setShowForm(false) }} style={{ padding: "0.4rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                        <button onClick={() => handleDelete(g.id)} style={{ padding: "0.4rem 0.875rem", borderRadius: "0.5rem", border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {["pending", "completed", "rejected", "all"].map(s => (
              <button key={s} onClick={() => setOrderFilter(s)} style={{
                padding: "0.4rem 0.875rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: orderFilter === s ? "#FF192C" : "#1e293b",
                color: orderFilter === s ? "#fff" : "#94a3b8",
                fontWeight: 700, fontSize: "0.78rem", textTransform: "capitalize",
              }}>{s}</button>
            ))}
          </div>

          {loadingO ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Loading...</div>
          ) : orders.length === 0 ? (
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "1rem", padding: "3rem", textAlign: "center", color: "#6b7280" }}>
              <p style={{ fontWeight: 700, color: "#6b7280" }}>No {orderFilter} orders</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {orders.map((row: any) => {
                const o = row.order
                const u = row.user
                const g = row.gateway
                return (
                  <div key={o?.id} style={{ background: "#111827", border: `1px solid ${o?.status === "pending" ? "#854d0e" : o?.status === "completed" ? "#166534" : "#7f1d1d"}`, borderRadius: "1rem", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <p style={{ color: "#fff", fontWeight: 700 }}>{u?.name || "Unknown"}</p>
                          <span style={{ color: "#6b7280", fontSize: "0.78rem" }}>({u?.email})</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.72rem", background: "#1e293b", color: "#94a3b8", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>{g?.name}</span>
                          <span style={{ fontSize: "0.72rem", background: o?.type === "premium" ? "#78350f" : "#1e3a8a", color: o?.type === "premium" ? "#fde68a" : "#93c5fd", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>{o?.type}</span>
                          <span style={{ fontSize: "0.72rem", background: "#1e293b", color: "#94a3b8", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>Package #{o?.packageId}</span>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{o?.currency} {o?.amount}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: "999px", background: o?.status === "pending" ? "#78350f" : o?.status === "completed" ? "#166534" : "#7f1d1d", color: o?.status === "pending" ? "#fde68a" : o?.status === "completed" ? "#86efac" : "#fca5a5" }}>
                          {o?.status?.toUpperCase()}
                        </span>
                        <p style={{ color: "#6b7280", fontSize: "0.72rem", marginTop: "0.25rem" }}>{timeAgo(o?.time)}</p>
                      </div>
                    </div>

                    {/* Proof */}
                    <div style={{ background: "#0f172a", borderRadius: "0.625rem", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
                      <p style={{ color: "#94a3b8", fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.35rem" }}>PAYMENT PROOF</p>
                      <p style={{ color: "#e2e8f0", fontSize: "0.85rem", wordBreak: "break-all" }}>{o?.proof || "No text proof"}</p>
                      {o?.proofImage && (
                        <a href={o.proofImage} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.5rem", color: "#60a5fa", fontSize: "0.78rem", fontWeight: 700 }}>
                          📷 View Screenshot
                        </a>
                      )}
                    </div>

                    {/* Approve / Reject */}
                    {o?.status === "pending" && (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                        <button onClick={() => handleApprove(o.id)} disabled={processingId === o.id} style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", opacity: processingId === o.id ? 0.5 : 1 }}>
                          ✓ Approve & Credit
                        </button>
                        <input
                          value={rejectNote[o.id] || ""}
                          onChange={e => setRejectNote(p => ({ ...p, [o.id]: e.target.value }))}
                          placeholder="Rejection reason (optional)"
                          style={{ flex: 1, minWidth: "160px", padding: "0.5rem 0.75rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "0.625rem", color: "#fff", fontSize: "0.82rem", outline: "none", fontFamily: "inherit" }}
                        />
                        <button onClick={() => handleReject(o.id)} disabled={processingId === o.id} style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "1px solid #7f1d1d", background: "transparent", color: "#f87171", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", opacity: processingId === o.id ? 0.5 : 1 }}>
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    {o?.status !== "pending" && o?.reviewNote && (
                      <p style={{ color: "#6b7280", fontSize: "0.78rem", fontStyle: "italic" }}>Note: {o.reviewNote}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
