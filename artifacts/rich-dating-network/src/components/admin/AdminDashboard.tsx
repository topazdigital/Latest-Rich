import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl, timeAgo } from "../../lib/utils"
import toast from "react-hot-toast"

interface Stats {
  totalUsers: number; fakeUsers: number; realUsers: number; newToday: number
  premiumUsers: number; onlineUsers: number; totalRevenue: number; todayRevenue: number
  totalMessages: number; totalLikes: number; bannedUsers: number
}

const ACT_ICONS: Record<string, string> = { like: "❤️", message: "💬", admin: "⚙️", purchase: "💰", visit: "👁️", system: "🔧", login: "🔐", default: "📋" }
const ACT_TABS = [
  { key: "all", label: "All" },
  { key: "message", label: "Chat" },
  { key: "like", label: "Likes" },
  { key: "visit", label: "Visits" },
  { key: "purchase", label: "Sales" },
  { key: "system", label: "System" },
]

function StatCard({ label, value, icon, color = "#3b82f6" }: { label: string; value: string | number; icon: string; color?: string }) {
  const isRevenue = label.toLowerCase().includes("revenue")
  const display = isRevenue ? `$${Number(value).toFixed(2)}` : Number(value).toLocaleString()
  return (
    <div style={{ background: '#111827', borderRadius: '0.75rem', padding: '0.75rem 1rem', border: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.6rem', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.1 }}>{display}</div>
        <div style={{ color: '#6b7280', fontSize: '0.68rem', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [actFilter, setActFilter] = useState("all")
  const [actLoading, setActLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    authFetch("/api/admin/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    setActLoading(true)
    authFetch(`/api/admin/activity?filter=${actFilter}&limit=20`)
      .then(r => r.json()).then(d => { setActivity(Array.isArray(d) ? d : []); setActLoading(false) })
      .catch(() => setActLoading(false))
  }, [actFilter])

  const triggerAutoMessages = async () => {
    setTriggering(true)
    try {
      const r = await authFetch("/api/admin/trigger-auto-messages", { method: "POST" })
      const d = await r.json()
      toast.success(`Sent ${d.sent} auto messages`)
    } catch { toast.error("Failed") } finally { setTriggering(false) }
  }

  const syncPhotos = async () => {
    setSyncing(true)
    try {
      const r = await authFetch("/api/admin/sync-photos", { method: "POST" })
      const d = await r.json()
      toast.success(`Synced photos for ${d.updated} users`)
    } catch { toast.error("Failed to sync photos") } finally { setSyncing(false) }
  }

  if (!stats) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '16rem' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  const statCards = [
    { icon: "👥", label: "Total Users", value: stats.totalUsers, color: "#3b82f6" },
    { icon: "🟢", label: "Online Now", value: stats.onlineUsers, color: "#22c55e" },
    { icon: "✨", label: "New Today", value: stats.newToday, color: "#a855f7" },
    { icon: "👑", label: "Premium", value: stats.premiumUsers, color: "#f59e0b" },
    { icon: "🤖", label: "Fake Users", value: stats.fakeUsers, color: "#ef4444" },
    { icon: "👤", label: "Real Users", value: stats.realUsers, color: "#3b82f6" },
    { icon: "💬", label: "Messages", value: stats.totalMessages, color: "#ec4899" },
    { icon: "❤️", label: "Total Likes", value: stats.totalLikes, color: "#ef4444" },
    { icon: "💰", label: "Total Revenue", value: stats.totalRevenue, color: "#22c55e" },
    { icon: "📅", label: "Today Revenue", value: stats.todayRevenue, color: "#22c55e" },
  ]

  return (
    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
      {/* Left: Stats + Actions */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>Overview</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={syncPhotos} disabled={syncing} style={{
              padding: '0.375rem 0.875rem', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
              borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: syncing ? 0.6 : 1,
            }}>
              {syncing ? "Syncing..." : "🖼️ Sync Photos"}
            </button>
            <button onClick={triggerAutoMessages} disabled={triggering} style={{
              padding: '0.375rem 0.875rem', background: '#FF192C', color: '#fff',
              border: 'none', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: triggering ? 0.6 : 1,
            }}>
              {triggering ? "Sending..." : "🤖 Auto Messages"}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }} className="stats-grid">
          {statCards.map(c => <StatCard key={c.label} {...c} />)}
        </div>
      </div>

      {/* Right: Recent Activity */}
      <div style={{ width: '17rem', flexShrink: 0 }} className="activity-panel">
        <div style={{ background: '#0f172a', borderRadius: '0.875rem', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>Recent Activity</span>
            <span style={{ color: '#475569', fontSize: '0.65rem' }}>Live</span>
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 0.75rem', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
            {ACT_TABS.map(t => (
              <button key={t.key} onClick={() => setActFilter(t.key)} style={{
                padding: '0.2rem 0.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                fontSize: '0.65rem', fontWeight: 600, fontFamily: 'inherit',
                background: actFilter === t.key ? '#FF192C' : '#1e293b',
                color: actFilter === t.key ? '#fff' : '#64748b',
                transition: 'all 0.1s',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Activity list */}
          <div style={{ maxHeight: '28rem', overflowY: 'auto' }}>
            {actLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ width: '1.25rem', height: '1.25rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#475569', fontSize: '0.75rem' }}>No activity yet</div>
            ) : (
              activity.map((row: any, i: number) => {
                let preview = row.activity?.message || ''
                try {
                  const parsed = JSON.parse(preview)
                  if (parsed.message) preview = parsed.message
                  else if (parsed.u1 && parsed.u2) preview = `${parsed.u1.name} → ${parsed.u2.name}`
                } catch {}
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.75rem', borderBottom: '1px solid #1e293b', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1e293b'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ width: '1.75rem', height: '1.75rem', flexShrink: 0, position: 'relative' }}>
                      {row.user?.photo ? (
                        <img src={getPhotoUrl(row.user.photo)} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>
                          {ACT_ICONS[row.activity?.type] || ACT_ICONS.default}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', fontSize: '0.55rem', lineHeight: 1 }}>
                        {ACT_ICONS[row.activity?.type] || ''}
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#e2e8f0', fontSize: '0.72rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.activity?.title || 'Activity'}
                      </div>
                      {preview && (
                        <div style={{ color: '#64748b', fontSize: '0.65rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                          {preview.replace(/&#039;/g, "'").replace(/u2019/g, "'").replace(/u2026/g, '…').slice(0, 60)}
                        </div>
                      )}
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.6rem', flexShrink: 0, textAlign: 'right', marginTop: '0.1rem' }}>
                      {timeAgo(row.activity?.time)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .activity-panel { display: none !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 901px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1200px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
