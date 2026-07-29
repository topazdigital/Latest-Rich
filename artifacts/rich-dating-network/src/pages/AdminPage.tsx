import { useState, useEffect, useRef } from "react"
import { useLocation } from "wouter"
import { useAuth } from "../hooks/useAuth"
import { authFetch } from "../lib/auth"
import AdminDashboard from "../components/admin/AdminDashboard"
import AdminUsers from "../components/admin/AdminUsers"
import AdminActivity from "../components/admin/AdminActivity"
import AdminFakeMessages from "../components/admin/AdminFakeMessages"
import AdminSettings from "../components/admin/AdminSettings"
import AdminOrders from "../components/admin/AdminOrders"
import AdminFakeUsers from "../components/admin/AdminFakeUsers"
import AdminBoost from "../components/admin/AdminBoost"
import AdminPayments from "../components/admin/AdminPayments"
import AdminPhotos from "../components/admin/AdminPhotos"
import AdminCustomPayments from "../components/admin/AdminCustomPayments"
import AdminVerifications from "../components/admin/AdminVerifications"
import AdminReports from "../components/admin/AdminReports"
import AdminEmailCampaigns from "../components/admin/AdminEmailCampaigns"
import AdminChat from "../components/admin/AdminChat"
import AdminContactMessages from "../components/admin/AdminContactMessages"
import AdminFeedback from "../components/admin/AdminFeedback"

type MenuItem = { key: string; label: string; icon: string }
type MenuGroup = { group: string; icon: string; items: MenuItem[] }
type MenuEntry = { key: string; label: string; icon: string } | MenuGroup

const MENU: MenuEntry[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  {
    group: "Users & Moderation", icon: "👥",
    items: [
      { key: "users",         label: "Manage Users",     icon: "👥" },
      { key: "verifications", label: "Verifications",    icon: "✅" },
      { key: "photos",        label: "Photo Moderation", icon: "🖼️" },
      { key: "reports",       label: "User Reports",     icon: "🚩" },
    ],
  },
  {
    group: "Fake Profiles", icon: "🤖",
    items: [
      { key: "fake-users",    label: "Fake Users",       icon: "🤖" },
      { key: "fake-messages", label: "Fake Messages",    icon: "💬" },
      { key: "fake-chat",     label: "Fake User Chat",   icon: "🗨️" },
    ],
  },
  {
    group: "Inbox", icon: "📥",
    items: [
      { key: "contact-messages", label: "Contact Messages",  icon: "📥" },
      { key: "feedback",         label: "Ratings & Feedback", icon: "⭐" },
    ],
  },
  {
    group: "Monetization", icon: "💰",
    items: [
      { key: "payments",        label: "Payment Providers", icon: "💳" },
      { key: "custom-payments", label: "Manual Gateways",   icon: "🏦" },
      { key: "boost",           label: "Boost Config",      icon: "⚡" },
      { key: "orders",          label: "Orders / Revenue",  icon: "💰" },
    ],
  },
  {
    group: "Marketing", icon: "📧",
    items: [
      { key: "email-campaigns", label: "Email Campaigns", icon: "📧" },
    ],
  },
  {
    group: "System", icon: "⚙️",
    items: [
      { key: "activity", label: "Activity Log", icon: "📋" },
      { key: "settings", label: "Settings",     icon: "⚙️" },
    ],
  },
]

// Flat list of all valid keys for URL matching
const VALID_KEYS = new Set<string>(
  MENU.flatMap(entry => 'group' in entry ? entry.items.map(i => i.key) : [entry.key])
)

// Map each key → its group label (undefined for top-level items)
const KEY_TO_GROUP = new Map<string, string>(
  MENU.flatMap(entry =>
    'group' in entry ? entry.items.map(i => [i.key, entry.group] as [string, string]) : []
  )
)

// Human-readable label for any key
const KEY_LABEL = new Map<string, string>(
  MENU.flatMap(entry => 'group' in entry ? entry.items.map(i => [i.key, i.label] as [string, string]) : [[entry.key, entry.label] as [string, string]])
)

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, loading } = useAuth()
  const [location, setLocation] = useLocation()

  // Derive tab from URL: /admin/users → "users", /admin → "dashboard"
  const tabFromUrl = location.replace(/^\/admin\/?/, "").split("/")[0]
  const tab = VALID_KEYS.has(tabFromUrl) ? tabFromUrl : "dashboard"

  // Track which groups are collapsed. Default: all open.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleGroup = (group: string) =>
    setCollapsed(prev => ({ ...prev, [group]: !prev[group] }))
  // A group is open if: not explicitly collapsed, OR the active tab lives in it
  const isGroupOpen = (group: string) =>
    !collapsed[group] || KEY_TO_GROUP.get(tab) === group

  const navigate = (key: string) => {
    setLocation(key === "dashboard" ? "/admin" : `/admin/${key}`)
    setSidebarOpen(false)
  }
  const [chatUnread, setChatUnread] = useState(0)
  const [contactPending, setContactPending] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const contactPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (loading) return
    if (user && (user.admin ?? 0) < 2) setLocation("/discover")
    if (!user) setLocation("/login")
  }, [user, loading])

  useEffect(() => {
    if (!user || (user.admin ?? 0) < 1) return
    const fetchUnread = async () => {
      try {
        const r = await authFetch("/api/moderator/unread-count")
        if (r.ok) {
          const d = await r.json()
          setChatUnread(d.count || 0)
        }
      } catch {}
    }
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [user])

  useEffect(() => {
    if (!user || (user.admin ?? 0) < 1) return
    const fetchPending = async () => {
      try {
        const r = await authFetch("/api/admin/contact-messages")
        if (r.ok) {
          const d = await r.json()
          setContactPending(Array.isArray(d) ? d.filter((m: any) => !m.replied).length : 0)
        }
      } catch {}
    }
    fetchPending()
    contactPollRef.current = setInterval(fetchPending, 30000)
    return () => { if (contactPollRef.current) clearInterval(contactPollRef.current) }
  }, [user])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '2rem', height: '2rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user || (user.admin ?? 0) < 2) return null

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed', inset: '0 auto 0 0', zIndex: 50,
        width: '16rem', background: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s',
        display: 'flex', flexDirection: 'column',
      }} className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg,#FF192C,#ff5f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', boxShadow: '0 3px 8px rgba(255,25,44,0.35)' }}>❤️</div>
            <div>
              <p style={{ color: '#1e293b', fontWeight: 800, fontSize: '0.78rem' }}>Rich Dating Network</p>
              <p style={{ color: '#FF192C', fontSize: '0.65rem', fontWeight: 700 }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Admin user */}
        <div style={{ padding: '0.625rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.625rem', padding: '0.5rem 0.625rem', background: '#fef2f2', borderRadius: '0.625rem', border: '1px solid #fecaca' }}>
            <div style={{ width: '1.875rem', height: '1.875rem', borderRadius: '50%', background: '#FF192C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#1e293b', fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ color: '#FF192C', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.05em' }}>ADMINISTRATOR</p>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            {MENU.map(entry => {
              if (!('group' in entry)) {
                // Top-level standalone item (Dashboard)
                const m = entry as MenuItem
                const active = tab === m.key
                return (
                  <button key={m.key} onClick={() => navigate(m.key)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.45rem 0.625rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
                    background: active ? 'linear-gradient(135deg,#FF192C,#ff5f6b)' : 'transparent',
                    color: active ? '#fff' : '#475569',
                    fontSize: '0.78rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    boxShadow: active ? '0 3px 8px rgba(255,25,44,0.25)' : 'none',
                  }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f1f5f9' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                    <span style={{ fontSize: '0.875rem' }}>{m.icon}</span>
                    <span style={{ flex: 1 }}>{m.label}</span>
                  </button>
                )
              }

              // Grouped section
              const g = entry as MenuGroup
              const open = isGroupOpen(g.group)
              // Badge totals for group header
              const groupChatBadge = g.items.some(i => i.key === 'fake-chat') ? chatUnread : 0
              const groupContactBadge = g.items.some(i => i.key === 'contact-messages') ? contactPending : 0
              const groupBadge = groupChatBadge + groupContactBadge
              const groupActive = g.items.some(i => i.key === tab)

              return (
                <div key={g.group}>
                  {/* Group header */}
                  <button onClick={() => toggleGroup(g.group)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.35rem 0.625rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                    background: groupActive && !open ? 'rgba(255,25,44,0.08)' : 'transparent',
                    color: groupActive ? '#FF192C' : '#94a3b8',
                    fontSize: '0.68rem', fontWeight: 700, textAlign: 'left',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    fontFamily: 'inherit', marginTop: '0.35rem', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = groupActive && !open ? 'rgba(255,25,44,0.08)' : 'transparent' }}>
                    <span style={{ fontSize: '0.75rem' }}>{g.icon}</span>
                    <span style={{ flex: 1 }}>{g.group}</span>
                    {!open && groupBadge > 0 && (
                      <span style={{
                        background: '#FF192C', color: '#fff',
                        fontSize: '0.6rem', fontWeight: 800,
                        borderRadius: '999px', padding: '1px 5px',
                        minWidth: '1.1rem', textAlign: 'center', lineHeight: '1.4', flexShrink: 0,
                      }}>{groupBadge > 99 ? '99+' : groupBadge}</span>
                    )}
                    <span style={{ fontSize: '0.6rem', opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
                  </button>

                  {/* Group items */}
                  {open && (
                    <div style={{ marginLeft: '0.5rem', borderLeft: '2px solid #f1f5f9', paddingLeft: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.1rem', marginBottom: '0.1rem' }}>
                      {g.items.map(m => {
                        const active = tab === m.key
                        return (
                          <button key={m.key} onClick={() => navigate(m.key)} style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.55rem',
                            padding: '0.4rem 0.55rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                            background: active ? 'linear-gradient(135deg,#FF192C,#ff5f6b)' : 'transparent',
                            color: active ? '#fff' : '#475569',
                            fontSize: '0.76rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
                            fontFamily: 'inherit',
                            boxShadow: active ? '0 2px 6px rgba(255,25,44,0.25)' : 'none',
                          }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f1f5f9' }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                            <span style={{ fontSize: '0.8rem' }}>{m.icon}</span>
                            <span style={{ flex: 1 }}>{m.label}</span>
                            {m.key === 'fake-chat' && chatUnread > 0 && (
                              <span style={{
                                background: active ? 'rgba(255,255,255,0.9)' : '#FF192C',
                                color: active ? '#FF192C' : '#fff',
                                fontSize: '0.6rem', fontWeight: 800,
                                borderRadius: '999px', padding: '1px 5px',
                                minWidth: '1.1rem', textAlign: 'center', lineHeight: '1.4', flexShrink: 0,
                              }}>{chatUnread > 99 ? '99+' : chatUnread}</span>
                            )}
                            {m.key === 'contact-messages' && contactPending > 0 && (
                              <span style={{
                                background: active ? 'rgba(255,255,255,0.9)' : '#FF192C',
                                color: active ? '#FF192C' : '#fff',
                                fontSize: '0.6rem', fontWeight: 800,
                                borderRadius: '999px', padding: '1px 5px',
                                minWidth: '1.1rem', textAlign: 'center', lineHeight: '1.4', flexShrink: 0,
                              }}>{contactPending > 99 ? '99+' : contactPending}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid #e2e8f0' }}>
            <button onClick={() => setLocation("/discover")} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.45rem 0.625rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#64748b', fontSize: '0.78rem', fontFamily: 'inherit', fontWeight: 600,
            }}>
              <span>🏠</span> Back to App
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.4)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="admin-main">
        <header style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex' }} className="sidebar-toggle">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 style={{ color: '#1e293b', fontWeight: 700, fontSize: '1rem' }}>{KEY_LABEL.get(tab) ?? 'Dashboard'}</h1>
            <p style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Rich Dating Network · Admin</p>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1rem 1.25rem', overflowY: 'auto' }} className="admin-content">
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "users" && <AdminUsers />}
          {tab === "verifications" && <AdminVerifications />}
          {tab === "fake-users" && <AdminFakeUsers />}
          {tab === "fake-messages" && <AdminFakeMessages />}
          {tab === "fake-chat" && <AdminChat />}
          {tab === "photos" && <AdminPhotos />}
          {tab === "reports" && <AdminReports />}
          {tab === "contact-messages" && <AdminContactMessages />}
          {tab === "feedback" && <AdminFeedback />}
          {tab === "boost" && <AdminBoost />}
          {tab === "payments" && <AdminPayments />}
          {tab === "custom-payments" && <AdminCustomPayments />}
          {tab === "email-campaigns" && <AdminEmailCampaigns />}
          {tab === "activity" && <AdminActivity />}
          {tab === "orders" && <AdminOrders />}
          {tab === "settings" && <AdminSettings />}
        </main>
      </div>

      <style>{`
        /* ── Desktop: sidebar always visible ── */
        @media (min-width: 768px) {
          .admin-sidebar { transform: translateX(0) !important; position: relative !important; flex-shrink: 0; }
          .admin-main { margin-left: 0; }
          .sidebar-toggle { display: none !important; }
        }

        /* ── Mobile: full-width content, scrollable ── */
        @media (max-width: 767px) {
          .admin-content { padding: 0.75rem !important; }
          /* All inline-style grids: collapse to single column on mobile */
          .admin-content [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .admin-content [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .admin-content [style*="grid-template-columns: repeat(2"] {
            grid-template-columns: 1fr !important;
          }
          .admin-content [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
          /* Tables: make horizontally scrollable */
          .admin-content table { display: block; overflow-x: auto; white-space: nowrap; }
          /* Flex rows that would overflow: wrap */
          .admin-content [style*="display: flex"][style*="gap"] { flex-wrap: wrap; }
        }

        /* ── Very small screens (<480px) ── */
        @media (max-width: 479px) {
          .admin-content [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }

        /* Light-theme overrides for admin content panels */
        .admin-content input:not([type="checkbox"]):not([type="radio"]),
        .admin-content select,
        .admin-content textarea {
          color: #1e293b !important;
        }
        .admin-content input:not([type="checkbox"]):not([type="radio"]).bg-gray-50,
        .admin-content input:not([type="checkbox"]):not([type="radio"]).bg-white,
        .admin-content select.bg-gray-50,
        .admin-content select.bg-white {
          background: #ffffff !important;
        }
        .admin-content .placeholder-gray-600::placeholder { color: #9ca3af; }

        /* ── Responsive overrides for known admin components ── */

        /* AdminUsers table wrapper */
        .admin-users-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

        /* Campaign stats grid: 2-col on mobile */
        @media (max-width: 640px) {
          .campaign-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .campaign-meta-grid { grid-template-columns: 1fr !important; }
        }

        /* ── AdminChat mobile: single-panel toggle ── */
        @media (max-width: 767px) {
          /* Always use single column on mobile */
          .admin-chat-grid {
            grid-template-columns: 1fr !important;
            min-height: calc(100vh - 120px) !important;
          }
          /* Hide conversation list when chat panel is showing */
          .admin-chat-grid--chat .admin-chat-list,
          .admin-chat-list--hidden {
            display: none !important;
          }
          /* Chat panel fills full height on mobile */
          .admin-chat-panel {
            max-height: calc(100vh - 120px) !important;
          }
          /* Conversation list fills full height when visible on mobile */
          .admin-chat-list {
            max-height: calc(100vh - 120px) !important;
          }
        }
      `}</style>
    </div>
  )
}
