import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import { formatDate, timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"
import { X, Shield, Crown, Ban, Trash2, Key, MessageSquare, CreditCard, User, Image, Activity, ChevronRight, AlertTriangle } from "lucide-react"

interface DetailUser {
  id: number; name: string; email: string; username?: string; phone?: string
  city: string; country: string; countryCode: string
  gender: number; age: number; birthday?: string; bio?: string
  fake: number; admin: number; banned: number
  premium: number; premiumExpiry: number; credits: number
  verified: number; verificationStatus?: string
  created: number; lastAccess: string
  photo: string; photoThumb: string
  photos?: { id: number; photo: string; thumb?: string; approved: number; main: number; created: number }[]
}

interface Order { id: number; amount: number; currency: string; type: string; description: string; status: string; time: number }

const TABS = ["Profile", "Media", "Chats", "Credits", "Admin"] as const
type Tab = typeof TABS[number]

export default function AdminUserDetail({ userId, onClose, onUpdate }: {
  userId: number
  onClose: () => void
  onUpdate?: () => void
}) {
  const [user, setUser] = useState<DetailUser | null>(null)
  const [tab, setTab] = useState<Tab>("Profile")
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [chats, setChats] = useState<any[]>([])
  const [creditsToAdd, setCreditsToAdd] = useState("100")
  const [premiumDays, setPremiumDays] = useState("30")
  const [newPassword, setNewPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [editBio, setEditBio] = useState("")
  const [editName, setEditName] = useState("")
  const [editCity, setEditCity] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch(`/api/admin/users/${userId}`)
      const d = await r.json()
      setUser(d)
      setEditBio(d.bio || "")
      setEditName(d.name || "")
      setEditCity(d.city || "")
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [userId])

  useEffect(() => {
    if (tab === "Credits") {
      authFetch(`/api/admin/users/${userId}/orders`).then(r => r.json()).then(setOrders).catch(() => {})
    }
    if (tab === "Chats") {
      authFetch(`/api/admin/users/${userId}/chats`).then(r => r.json()).then(setChats).catch(() => {})
    }
  }, [tab, userId])

  async function saveProfile() {
    setSaving(true)
    try {
      await authFetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, name: editName, bio: editBio, city: editCity }),
      })
      toast.success("Profile saved")
      load()
      onUpdate?.()
    } finally { setSaving(false) }
  }

  async function banUser() {
    const r = await authFetch(`/api/admin/users/${userId}/ban`, { method: "POST" })
    const d = await r.json()
    toast.success(d.banned ? "User banned" : "User unbanned")
    load(); onUpdate?.()
  }

  async function deleteUser() {
    if (!confirm(`Permanently delete ${user?.name}? This cannot be undone.`)) return
    await authFetch(`/api/admin/users/${userId}`, { method: "DELETE" })
    toast.success("User deleted")
    onClose(); onUpdate?.()
  }

  async function addCredits() {
    const amt = parseInt(creditsToAdd)
    if (isNaN(amt)) { toast.error("Invalid amount"); return }
    await authFetch(`/api/admin/users/${userId}/credits`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt }),
    })
    toast.success(`Added ${amt} credits`)
    load(); onUpdate?.()
  }

  async function givePremium() {
    const days = parseInt(premiumDays)
    if (isNaN(days)) { toast.error("Invalid days"); return }
    await authFetch(`/api/admin/users/${userId}/premium`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days }),
    })
    toast.success(days > 0 ? `Premium granted for ${days} days` : "Premium revoked")
    load(); onUpdate?.()
  }

  async function changePassword() {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 chars"); return }
    await authFetch(`/api/admin/users/${userId}/password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    })
    toast.success("Password changed")
    setNewPassword("")
  }

  async function setAdminLevel(level: number) {
    await authFetch(`/api/admin/users/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, admin: level }),
    })
    toast.success(level === 2 ? "Set as Admin" : level === 1 ? "Set as Moderator" : "Set as User")
    load(); onUpdate?.()
  }

  async function toggleVerify() {
    const newV = user?.verified ? 0 : 1
    await authFetch(`/api/admin/users/${userId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...user, verified: newV }),
    })
    toast.success(newV ? "User verified" : "Verification removed")
    load(); onUpdate?.()
  }

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #FF192C", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
      </div>
    )
  }

  if (!user) return null

  const isOnline = Date.now() / 1000 - parseInt(user.lastAccess || "0") < 300
  const genderLabel = user.gender === 1 ? "Male" : user.gender === 2 ? "Female" : "Other"

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: "#111827", borderRadius: 16, width: "100%", maxWidth: 900, maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid #374151", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={getPhotoUrl(user.photo)} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", background: "#374151" }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.svg" }} />
              {isOnline && <div style={{ position: "absolute", bottom: 4, right: 4, width: 12, height: 12, background: "#10b981", borderRadius: "50%", border: "2px solid #111827" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>{user.name}</span>
                {user.verified === 1 && <Shield size={16} style={{ color: "#60a5fa" }} />}
                {user.premium === 1 && <Crown size={16} style={{ color: "#facc15" }} />}
                {user.banned === 1 && <Ban size={16} style={{ color: "#f87171" }} />}
              </div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginTop: 2 }}>
                {user.email} · #{user.id} · @{user.username || "no username"}
              </div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                {genderLabel} · {user.age}y · {user.city}, {user.country} · Joined {formatDate(user.created)}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {user.fake === 1 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#7c3aed33", color: "#a78bfa" }}>Fake</span>}
                {user.admin === 2 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#78350f33", color: "#fbbf24" }}>Admin</span>}
                {user.admin === 1 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#1e3a5f", color: "#93c5fd" }}>Moderator</span>}
                {user.fake !== 1 && user.admin === 0 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#14532d33", color: "#86efac" }}>User</span>}
                {user.banned === 1 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#7f1d1d33", color: "#fca5a5" }}>Banned</span>}
                {user.premium === 1 && <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#78350f33", color: "#fde68a" }}>Premium</span>}
                <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: "#1f2937", color: "#9ca3af" }}>{user.credits} credits</span>
              </div>
            </div>
            <button onClick={onClose} style={{ color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: tab === t ? "#FF192C" : "#6b7280", background: "none", border: "none", borderBottom: tab === t ? "2px solid #FF192C" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* PROFILE TAB */}
          {tab === "Profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>DISPLAY NAME</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>CITY</label>
                  <input value={editCity} onChange={e => setEditCity(e.target.value)}
                    style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>BIO</label>
                  <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={4}
                    style={{ width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  style={{ background: "#FF192C", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving…" : "Save Profile"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Phone" value={user.phone || "—"} />
                <InfoRow label="Username" value={user.username ? `@${user.username}` : "—"} />
                <InfoRow label="Birthday" value={user.birthday || "—"} />
                <InfoRow label="Last Seen" value={timeAgo(parseInt(user.lastAccess || "0"))} />
                <InfoRow label="Status" value={isOnline ? "🟢 Online" : "⚫ Offline"} />
                <InfoRow label="Verification" value={user.verificationStatus || "none"} />
                <InfoRow label="Premium Expiry" value={user.premiumExpiry ? formatDate(user.premiumExpiry) : "—"} />
              </div>
            </div>
          )}

          {/* MEDIA TAB */}
          {tab === "Media" && (
            <div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>{user.photos?.length || 0} photo(s) on record</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                {(user.photos || []).map(p => (
                  <div key={p.id} style={{ borderRadius: 10, overflow: "hidden", border: `2px solid ${p.main ? "#FF192C" : "#374151"}`, position: "relative" }}>
                    <img src={getPhotoUrl(p.photo)} alt="" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.svg" }} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 6px", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {p.main === 1 && <span style={{ color: "#FF192C", fontSize: 9, fontWeight: 700 }}>MAIN</span>}
                      {p.approved === 0 && <span style={{ color: "#fbbf24", fontSize: 9 }}>PENDING</span>}
                      {p.approved === 1 && !p.main && <span style={{ color: "#86efac", fontSize: 9 }}>✓</span>}
                    </div>
                  </div>
                ))}
                {(!user.photos || user.photos.length === 0) && (
                  <div style={{ color: "#6b7280", fontSize: 13 }}>No photos uploaded</div>
                )}
              </div>
            </div>
          )}

          {/* CHATS TAB */}
          {tab === "Chats" && (
            <div>
              <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>Recent conversations</div>
              {chats.length === 0 ? (
                <div style={{ color: "#6b7280", fontSize: 13 }}>No conversations found</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {chats.map((c, i) => (
                    <div key={i} style={{ background: "#1f2937", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <img src={getPhotoUrl(c.other?.photo)} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = "/images/default-avatar.svg" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 600, fontSize: 14 }}>{c.other?.name || "Unknown"} (#{c.other?.id})</div>
                        <div style={{ color: "#9ca3af", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastMsg}</div>
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 11, flexShrink: 0 }}>{timeAgo(c.lastTime)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREDITS TAB */}
          {tab === "Credits" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <StatCard label="Current Credits" value={String(user.credits)} color="#facc15" />
                <StatCard label="Premium" value={user.premium ? "Active" : "Inactive"} color={user.premium ? "#10b981" : "#6b7280"} />
                <StatCard label="Total Orders" value={String(orders.length)} color="#60a5fa" />
              </div>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Add / Remove Credits</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" value={creditsToAdd} onChange={e => setCreditsToAdd(e.target.value)} placeholder="Amount (negative to remove)"
                    style={{ flex: 1, background: "#374151", border: "1px solid #4b5563", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14 }} />
                  <button onClick={addCredits} style={{ background: "#10b981", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Add</button>
                </div>
              </div>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Premium Access</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" value={premiumDays} onChange={e => setPremiumDays(e.target.value)} placeholder="Days (0 = revoke)"
                    style={{ width: 120, background: "#374151", border: "1px solid #4b5563", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14 }} />
                  <button onClick={givePremium} style={{ background: "#f59e0b", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
                    {parseInt(premiumDays) > 0 ? "Grant Premium" : "Revoke Premium"}
                  </button>
                </div>
              </div>

              {orders.length > 0 && (
                <div>
                  <div style={{ color: "#9ca3af", fontSize: 12, fontWeight: 600, marginBottom: 12 }}>ORDER HISTORY</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {orders.map(o => (
                      <div key={o.id} style={{ background: "#1f2937", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ color: "white", fontSize: 13 }}>{o.description || o.type}</span>
                          <span style={{ color: "#6b7280", fontSize: 11, marginLeft: 8 }}>{formatDate(o.time)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: "#facc15", fontSize: 13, fontWeight: 600 }}>{o.currency} {o.amount}</span>
                          <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, background: o.status === "completed" ? "#14532d33" : "#78350f33", color: o.status === "completed" ? "#86efac" : "#fde68a" }}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADMIN TAB */}
          {tab === "Admin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Account Role</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["User", 0], ["Moderator", 1], ["Admin", 2]].map(([label, level]) => (
                    <button key={level} onClick={() => setAdminLevel(level as number)}
                      style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: user.admin === level ? "#FF192C" : "#374151", color: user.admin === level ? "white" : "#9ca3af" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Verification</div>
                <button onClick={toggleVerify}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: user.verified ? "#1e3a5f" : "#14532d", color: user.verified ? "#93c5fd" : "#86efac" }}>
                  {user.verified ? "Remove Verified Badge" : "Grant Verified Badge"}
                </button>
              </div>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Change Password</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)"
                    style={{ flex: 1, background: "#374151", border: "1px solid #4b5563", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 14 }} />
                  <button onClick={changePassword} style={{ background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Set</button>
                </div>
              </div>

              <div style={{ background: "#1f2937", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "white", fontWeight: 600, marginBottom: 12 }}>Actions</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={banUser}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: user.banned ? "#14532d33" : "#7f1d1d33", color: user.banned ? "#86efac" : "#fca5a5" }}>
                    {user.banned ? "Unban User" : "Ban User"}
                  </button>
                  <button onClick={deleteUser}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer", background: "#7f1d1d33", color: "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={12} /> Delete is permanent and cannot be undone
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1f2937" }}>
      <span style={{ color: "#6b7280", fontSize: 12, fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#e5e7eb", fontSize: 13 }}>{value}</span>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#1f2937", borderRadius: 10, padding: "14px 20px", minWidth: 120 }}>
      <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
      <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  )
}
