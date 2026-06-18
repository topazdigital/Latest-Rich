import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"
import { Check, X, AlertTriangle, User } from "lucide-react"

interface PendingPhoto {
  photo: { id: number; photo: string; thumb: string; approved: number; flagged: number; flagReason: string; created: number }
  user: { id: number; name: string } | null
}

export default function AdminPhotos() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/photos/admin/pending")
      const d = await r.json()
      setPhotos(Array.isArray(d) ? d : [])
    } catch { setPhotos([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    const res = await authFetch(`/api/photos/admin/approve/${id}`, { method: "PUT" })
    if (res.ok) { toast.success("Photo approved"); setPhotos(p => p.filter(x => x.photo.id !== id)) }
    else toast.error("Failed to approve")
  }

  const reject = async (id: number) => {
    const res = await authFetch(`/api/photos/admin/reject/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Photo rejected"); setPhotos(p => p.filter(x => x.photo.id !== id)) }
    else toast.error("Failed to reject")
  }

  const approveAll = async () => {
    if (!confirm(`Approve all ${photos.length} photos?`)) return
    for (const { photo } of photos) {
      await authFetch(`/api/photos/admin/approve/${photo.id}`, { method: "PUT" }).catch(() => {})
    }
    toast.success(`Approved ${photos.length} photos`)
    load()
  }

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>Photo Moderation</h2>
          <p style={{ color: '#475569', fontSize: '0.72rem', marginTop: '0.2rem' }}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} pending review
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {photos.length > 1 && (
            <button onClick={approveAll} style={{
              padding: '0.4rem 0.875rem', background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ✓ Approve All
            </button>
          )}
          <button onClick={load} style={{
            padding: '0.4rem 0.875rem', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
            borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div style={{ width: '2rem', height: '2rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖼️</div>
          <p style={{ color: '#94a3b8', fontWeight: 600, marginBottom: '0.5rem' }}>No pending photos</p>
          <p style={{ color: '#475569', fontSize: '0.8rem' }}>All photos have been reviewed</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
          {photos.map(({ photo, user }) => (
            <div key={photo.id} style={{ background: '#0f172a', borderRadius: '0.75rem', overflow: 'hidden', border: photo.flagged === 1 ? '1px solid #dc2626' : '1px solid #1e293b' }}>
              {/* Photo */}
              <div style={{ position: 'relative', paddingBottom: '100%', background: '#1e293b' }}>
                <img
                  src={getPhotoUrl(photo.photo)}
                  alt="Pending"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => {
                    const el = e.target as HTMLImageElement
                    if (!el.dataset.fallback) {
                      el.dataset.fallback = "1"
                      el.src = `/api/uploads/${photo.photo}`
                    } else {
                      el.style.display = 'none'
                      const parent = el.parentElement!
                      parent.style.display = 'flex'
                      parent.style.alignItems = 'center'
                      parent.style.justifyContent = 'center'
                    }
                  }}
                />
                {photo.flagged === 1 && (
                  <div style={{ position: 'absolute', top: '0.4rem', left: '0.4rem', background: '#dc2626', borderRadius: '50%', padding: '0.2rem', display: 'flex' }}>
                    <AlertTriangle size={10} color="#fff" />
                  </div>
                )}
              </div>

              {/* Info + buttons */}
              <div style={{ padding: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                  <User size={10} color="#64748b" />
                  <span style={{ color: '#e2e8f0', fontSize: '0.68rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {user?.name || "Unknown"}
                  </span>
                </div>
                {photo.flagged === 1 && photo.flagReason && (
                  <p style={{ color: '#f87171', fontSize: '0.6rem', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    ⚠️ {photo.flagReason}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button onClick={() => approve(photo.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                    padding: '0.35rem 0', background: '#16a34a', color: '#fff', border: 'none',
                    borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <Check size={9} /> OK
                  </button>
                  <button onClick={() => reject(photo.id)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem',
                    padding: '0.35rem 0', background: '#dc2626', color: '#fff', border: 'none',
                    borderRadius: '0.4rem', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <X size={9} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
