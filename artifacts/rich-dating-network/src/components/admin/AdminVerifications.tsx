import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"

interface VerificationUser {
  id: number; name: string; email: string; city: string; country: string
  age: number; photo: string; verificationPhoto: string
  verificationStatus: string; verificationNote: string; created: number
}

export default function AdminVerifications() {
  const [users, setUsers] = useState<VerificationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  const [rejectNote, setRejectNote] = useState<Record<number, string>>({})
  const [fullImg, setFullImg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch(`/api/admin/verifications?status=${filter}`)
      const d = await r.json()
      setUsers(Array.isArray(d) ? d : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const approve = async (id: number) => {
    try {
      const r = await authFetch(`/api/admin/verifications/${id}/approve`, { method: "POST" })
      if (r.ok) { toast.success("User verified ✓"); load() }
      else toast.error("Failed to approve")
    } catch { toast.error("Error") }
  }

  const reject = async (id: number) => {
    const note = rejectNote[id] || ""
    try {
      const r = await authFetch(`/api/admin/verifications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })
      if (r.ok) { toast.success("Verification rejected"); load() }
      else toast.error("Failed to reject")
    } catch { toast.error("Error") }
  }

  const FILTERS = ["pending", "approved", "rejected"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>Identity Verifications</h2>
          <p style={{ color: "#64748b", fontSize: "0.78rem", marginTop: 2 }}>
            Review selfie photos and grant the blue verification tick
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: "0.35rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.78rem",
                fontWeight: 600, cursor: "pointer", textTransform: "capitalize", border: "none",
                background: filter === f ? "#FF192C" : "#1e293b",
                color: filter === f ? "#fff" : "#94a3b8",
              }}>
              {f}
            </button>
          ))}
          <button onClick={load}
            style={{ padding: "0.35rem 0.875rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", border: "none", background: "#1e293b", color: "#94a3b8" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
          <div style={{ width: 32, height: 32, border: "2px solid #FF192C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "#64748b" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            {filter === "pending" ? "✅" : filter === "approved" ? "🏅" : "❌"}
          </div>
          <p style={{ fontWeight: 600, color: "#94a3b8" }}>
            No {filter} verifications
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {users.map(u => (
            <div key={u.id} style={{
              background: "#0f172a", borderRadius: "1rem", border: "1px solid #1e293b",
              padding: "1rem", display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap",
            }}>
              {/* Profile photo */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <img src={getPhotoUrl(u.photo)} alt=""
                    style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", background: "#1e293b" }}
                    onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                </div>
                <span style={{ color: "#64748b", fontSize: "0.7rem" }}>Profile</span>
              </div>

              {/* Verification selfie */}
              {u.verificationPhoto && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
                  <button onClick={() => setFullImg(u.verificationPhoto)} style={{ border: "none", padding: 0, cursor: "pointer", borderRadius: "0.75rem", overflow: "hidden" }}>
                    <img src={getPhotoUrl(u.verificationPhoto)} alt="Verification selfie"
                      style={{ width: 80, height: 80, objectFit: "cover", background: "#1e293b", display: "block", borderRadius: "0.75rem", border: "2px solid #334155" }}
                      onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                  </button>
                  <span style={{ color: "#64748b", fontSize: "0.7rem" }}>Selfie ↗</span>
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.92rem" }}>{u.name}</span>
                  <span style={{ color: "#64748b", fontSize: "0.75rem" }}>#{u.id}</span>
                  <span style={{
                    padding: "0.15rem 0.6rem", borderRadius: "9999px", fontSize: "0.68rem", fontWeight: 700,
                    background: u.verificationStatus === "approved" ? "#166534" : u.verificationStatus === "rejected" ? "#7f1d1d" : "#1e3a5f",
                    color: u.verificationStatus === "approved" ? "#4ade80" : u.verificationStatus === "rejected" ? "#f87171" : "#60a5fa",
                  }}>
                    {u.verificationStatus === "approved" ? "✓ Approved" : u.verificationStatus === "rejected" ? "✗ Rejected" : "⏳ Pending"}
                  </span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.78rem", marginBottom: "0.25rem" }}>{u.email}</p>
                <p style={{ color: "#64748b", fontSize: "0.75rem" }}>{u.city}, {u.country} · Age {u.age}</p>
                {u.verificationNote && (
                  <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.25rem" }}>Note: {u.verificationNote}</p>
                )}

                {filter === "pending" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={() => approve(u.id)}
                      style={{ padding: "0.4rem 1rem", borderRadius: "0.5rem", background: "#15803d", color: "#fff", fontWeight: 600, fontSize: "0.8rem", border: "none", cursor: "pointer" }}>
                      ✓ Approve
                    </button>
                    <input
                      value={rejectNote[u.id] || ""}
                      onChange={e => setRejectNote(p => ({ ...p, [u.id]: e.target.value }))}
                      placeholder="Rejection reason (optional)..."
                      style={{ padding: "0.4rem 0.75rem", borderRadius: "0.5rem", background: "#1e293b", color: "#fff", fontSize: "0.78rem", border: "1px solid #334155", flex: 1, minWidth: 150, outline: "none" }} />
                    <button onClick={() => reject(u.id)}
                      style={{ padding: "0.4rem 1rem", borderRadius: "0.5rem", background: "#991b1b", color: "#fff", fontWeight: 600, fontSize: "0.8rem", border: "none", cursor: "pointer" }}>
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full image lightbox */}
      {fullImg && (
        <div
          onClick={() => setFullImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <img src={getPhotoUrl(fullImg)} alt="Verification selfie"
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "1rem", objectFit: "contain" }} />
          <button onClick={() => setFullImg(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: "1.1rem" }}>
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
