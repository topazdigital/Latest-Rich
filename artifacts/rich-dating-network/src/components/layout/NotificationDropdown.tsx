import { useState, useEffect, useRef } from 'react'
import { Link } from 'wouter'
import { Bell, Heart, MessageCircle, Eye, Gift, Star, X, Check } from 'lucide-react'
import { authFetch } from '../../lib/auth'
import { timeAgo, getPhotoUrl } from '../../lib/utils'

const TYPE_CONFIG: Record<string, { icon: typeof Heart; color: string; bg: string }> = {
  like: { icon: Heart, color: '#FF192C', bg: '#fff0f1' },
  message: { icon: MessageCircle, color: '#3b82f6', bg: '#eff6ff' },
  visit: { icon: Eye, color: '#8b5cf6', bg: '#f5f3ff' },
  gift: { icon: Gift, color: '#f59e0b', bg: '#fffbeb' },
  superlike: { icon: Star, color: '#f97316', bg: '#fff7ed' },
  default: { icon: Bell, color: '#6b7280', bg: '#f9fafb' },
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchCount() {
    try {
      const res = await authFetch('/api/notifications/count')
      const data = await res.json()
      setUnread(data.count || 0)
    } catch {}
  }

  async function openDropdown() {
    if (!open) {
      setOpen(true)
      setLoading(true)
      try {
        const res = await authFetch('/api/notifications?limit=10')
        const data = await res.json()
        setNotifications(Array.isArray(data) ? data : data.notifications || [])
        // Mark all as read
        authFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {})
        setUnread(0)
      } catch {}
      setLoading(false)
    } else {
      setOpen(false)
    }
  }

  function getTypeConfig(type: string) {
    return TYPE_CONFIG[type] || TYPE_CONFIG.default
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={openDropdown} style={{
        position: 'relative', width: '2.25rem', height: '2.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
        background: open ? '#fff0f1' : 'transparent',
        color: open ? '#FF192C' : '#6b7280',
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = '#f9fafb' } }}
        onMouseLeave={e => { if (!open) { (e.currentTarget as HTMLElement).style.background = 'transparent' } }}>
        <Bell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            minWidth: '16px', height: '16px',
            background: '#FF192C', color: '#fff',
            fontSize: '10px', fontWeight: 800,
            borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', boxShadow: '0 0 0 2px #fff',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '340px', maxHeight: '480px',
          background: '#fff', borderRadius: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.06)',
          zIndex: 100, overflow: 'hidden',
          animation: 'slideDown 0.2s ease',
        }}>
          <style>{`
            @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
          `}</style>

          {/* Header */}
          <div style={{ padding: '1rem 1.25rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <p style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>Notifications</p>
              {unread === 0 && notifications.length > 0 && <p style={{ fontSize: '0.72rem', color: '#9ca3af' }}>All caught up!</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link href="/notifications" onClick={() => setOpen(false)} style={{ fontSize: '0.75rem', color: '#FF192C', fontWeight: 700, textDecoration: 'none' }}>
                See all
              </Link>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ width: '1.5rem', height: '1.5rem', border: '2px solid #e5e7eb', borderTopColor: '#FF192C', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔔</div>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No notifications yet</p>
                <p style={{ color: '#d1d5db', fontSize: '0.78rem' }}>We'll let you know when something happens</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const cfg = getTypeConfig(n.type)
                const Icon = cfg.icon
                return (
                  <Link key={n.id} href={n.link || '/notifications'} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.875rem 1.25rem',
                      background: n.read === 0 ? '#fff9fa' : 'transparent',
                      borderBottom: '1px solid #f9fafb',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = n.read === 0 ? '#fff9fa' : 'transparent'}>
                      {/* Avatar or icon */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        {n.from?.photo ? (
                          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', overflow: 'hidden' }}>
                            <img src={getPhotoUrl(n.from.photoThumb || n.from.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={cfg.color} />
                          </div>
                        )}
                        {n.from?.photo && (
                          <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '1rem', height: '1rem', borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>
                            <Icon size={8} color={cfg.color} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.82rem', color: '#111827', lineHeight: '1.45', fontWeight: n.read === 0 ? 600 : 400 }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>{timeAgo(n.time)}</p>
                      </div>
                      {n.read === 0 && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF192C', flexShrink: 0, marginTop: '4px' }} />
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div style={{ padding: '0.75rem', borderTop: '1px solid #f3f4f6' }}>
              <Link href="/notifications" onClick={() => setOpen(false)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.4rem', padding: '0.5rem', borderRadius: '0.75rem',
                background: '#f9fafb', color: '#374151', fontSize: '0.8rem', fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}>
                <Check size={14} /> View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
