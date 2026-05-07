import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { useAuth } from "../hooks/useAuth"
import AdminDashboard from "../components/admin/AdminDashboard"
import AdminUsers from "../components/admin/AdminUsers"
import AdminActivity from "../components/admin/AdminActivity"
import AdminFakeMessages from "../components/admin/AdminFakeMessages"
import AdminSettings from "../components/admin/AdminSettings"
import AdminOrders from "../components/admin/AdminOrders"
import AdminFakeUsers from "../components/admin/AdminFakeUsers"
import AdminBoost from "../components/admin/AdminBoost"
import AdminPayments from "../components/admin/AdminPayments"

const MENU = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "users", label: "Manage Users", icon: "👥" },
  { key: "fake-users", label: "Fake Users", icon: "🤖" },
  { key: "fake-messages", label: "Fake Messages", icon: "💬" },
  { key: "boost", label: "Boost Config", icon: "⚡" },
  { key: "payments", label: "Payment Providers", icon: "💳" },
  { key: "activity", label: "Activity Log", icon: "📋" },
  { key: "orders", label: "Orders / Revenue", icon: "💰" },
  { key: "settings", label: "Settings", icon: "⚙️" },
]

export default function AdminPage() {
  const [tab, setTab] = useState("dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    if (user && user.admin !== 1) setLocation("/home")
  }, [user])

  if (!user || user.admin !== 1) return null

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed', inset: '0 auto 0 0', zIndex: 50,
        width: '16rem', background: '#0f172a',
        borderRight: '1px solid #1e293b',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s',
        display: 'flex', flexDirection: 'column',
      }} className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.875rem', background: 'linear-gradient(135deg,#FF192C,#ff5f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(255,25,44,0.35)' }}>❤️</div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>Rich Dating Network</p>
              <p style={{ color: '#FF192C', fontSize: '0.7rem', fontWeight: 700 }}>Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Admin user */}
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '0.875rem', border: '1px solid #334155' }}>
            <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '50%', background: '#FF192C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
              <p style={{ color: '#FF192C', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em' }}>ADMINISTRATOR</p>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {MENU.map(m => (
              <button key={m.key} onClick={() => { setTab(m.key); setSidebarOpen(false) }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 0.875rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                background: tab === m.key ? 'linear-gradient(135deg,#FF192C,#ff5f6b)' : 'transparent',
                color: tab === m.key ? '#fff' : '#94a3b8',
                fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', transition: 'all 0.15s',
                fontFamily: 'inherit',
                boxShadow: tab === m.key ? '0 4px 12px rgba(255,25,44,0.3)' : 'none',
              }}
                onMouseEnter={e => { if (tab !== m.key) (e.currentTarget as HTMLElement).style.background = '#1e293b' }}
                onMouseLeave={e => { if (tab !== m.key) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #1e293b' }}>
            <button onClick={() => setLocation("/home")} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.875rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
              background: 'transparent', color: '#94a3b8', fontSize: '0.82rem', fontFamily: 'inherit', fontWeight: 600,
            }}>
              <span>🏠</span> Back to App
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.6)' }} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }} className="admin-main">
        <header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.875rem', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }} className="sidebar-toggle">
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{MENU.find(m => m.key === tab)?.label}</h1>
            <p style={{ color: '#475569', fontSize: '0.72rem' }}>Rich Dating Network · Admin</p>
          </div>
        </header>

        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "users" && <AdminUsers />}
          {tab === "fake-users" && <AdminFakeUsers />}
          {tab === "fake-messages" && <AdminFakeMessages />}
          {tab === "boost" && <AdminBoost />}
          {tab === "payments" && <AdminPayments />}
          {tab === "activity" && <AdminActivity />}
          {tab === "orders" && <AdminOrders />}
          {tab === "settings" && <AdminSettings />}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .admin-sidebar { transform: translateX(0) !important; position: relative !important; }
          .admin-main { margin-left: 0; }
          .sidebar-toggle { display: none !important; }
        }
      `}</style>
    </div>
  )
}
