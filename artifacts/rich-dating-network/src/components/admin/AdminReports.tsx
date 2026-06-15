import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Flag, Trash2, UserX, RefreshCw } from "lucide-react"

interface Report {
  id: number
  userId: number
  reportedId: number
  reason: string
  time: number
  reporterName?: string
  reportedName?: string
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/admin/reports")
      const d = await r.json()
      setReports(Array.isArray(d) ? d : [])
    } catch { setReports([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const banUser = async (userId: number, name: string) => {
    if (!confirm(`Ban user #${userId} (${name})?`)) return
    const r = await authFetch(`/api/admin/users/${userId}/ban`, { method: "POST" })
    if (r.ok) toast.success(`${name} has been banned`)
    else toast.error("Failed to ban user")
  }

  const deleteReport = async (id: number) => {
    await authFetch(`/api/admin/reports/${id}`, { method: "DELETE" }).catch(() => {})
    setReports(prev => prev.filter(r => r.id !== id))
    toast.success("Report dismissed")
  }

  const REASON_COLOR: Record<string, string> = {
    "Fake profile": "#8b5cf6",
    "Inappropriate photos": "#ef4444",
    "Harassment or abuse": "#dc2626",
    "Spam or scam": "#f59e0b",
    "Underage user": "#ec4899",
    "Other": "#64748b",
  }

  const grouped = reports.reduce((acc: Record<number, Report[]>, r) => {
    if (!acc[r.reportedId]) acc[r.reportedId] = []
    acc[r.reportedId].push(r)
    return acc
  }, {})

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>User Reports</h2>
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''} from {Object.keys(grouped).length} user{Object.keys(grouped).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={load} style={{
          padding: '0.4rem 0.875rem', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
          borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span>↻</span> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <p style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>No reports</p>
          <p style={{ color: '#475569', fontSize: '0.8rem' }}>Your community is in good shape</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {/* Grouped by reported user */}
          {Object.entries(grouped).map(([reportedId, reps]) => {
            const rep = reps[0]
            return (
              <div key={reportedId} style={{ background: '#0f172a', borderRadius: '0.875rem', border: '1px solid #1e293b', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '0.75rem 1rem', background: '#111827', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '1.75rem', height: '1.75rem', background: '#dc2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UserX size={14} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: '#f87171', fontWeight: 700, fontSize: '0.82rem' }}>
                        User #{reportedId}
                      </span>
                      <span style={{ color: '#475569', fontSize: '0.68rem', marginLeft: '0.5rem' }}>
                        {reps.length} report{reps.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => banUser(Number(reportedId), `#${reportedId}`)}
                    style={{
                      padding: '0.3rem 0.75rem', background: '#dc2626', color: '#fff', border: 'none',
                      borderRadius: '0.4rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}>
                    <UserX size={11} /> Ban User
                  </button>
                </div>

                {/* Individual reports */}
                <div style={{ padding: '0.5rem 0' }}>
                  {reps.map((r, i) => (
                    <div key={r.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.5rem 1rem',
                      borderBottom: i < reps.length - 1 ? '1px solid #1e293b' : 'none',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700,
                            background: (REASON_COLOR[r.reason] || '#64748b') + '22',
                            color: REASON_COLOR[r.reason] || '#64748b',
                            border: `1px solid ${(REASON_COLOR[r.reason] || '#64748b')}44`,
                          }}>
                            {r.reason}
                          </span>
                          <span style={{ color: '#475569', fontSize: '0.65rem' }}>
                            by User #{r.userId}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{ color: '#475569', fontSize: '0.62rem' }}>{timeAgo(r.time)}</span>
                        <button onClick={() => deleteReport(r.id)} style={{
                          background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.25rem',
                          display: 'flex', alignItems: 'center',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#475569'}
                          title="Dismiss report">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
