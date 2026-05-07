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

const MENU = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "users", label: "Manage Users", icon: "👥" },
  { key: "fake-users", label: "Fake Users", icon: "🤖" },
  { key: "fake-messages", label: "Fake Messages", icon: "💬" },
  { key: "boost", label: "Boost Config", icon: "⚡" },
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
    <div className="min-h-screen bg-gray-950 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-lg shadow-lg">❤️</div>
            <div>
              <div className="text-white font-bold text-sm">Rich Dating Network</div>
              <div className="text-brand-400 text-xs font-medium">Control Panel</div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-800 rounded-xl border border-gray-700">
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-white text-sm font-medium">{user.name}</div>
              <div className="text-brand-400 text-xs font-bold tracking-wide">ADMINISTRATOR</div>
            </div>
          </div>

          <nav className="space-y-1">
            {MENU.map(m => (
              <button
                key={m.key}
                onClick={() => { setTab(m.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  tab === m.key
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span className="text-base">{m.icon}</span>
                <span className="font-medium">{m.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <button onClick={() => setLocation("/home")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
              <span>🏠</span><span>Back to App</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-white font-semibold">{MENU.find(m => m.key === tab)?.label}</h1>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "users" && <AdminUsers />}
          {tab === "fake-users" && <AdminFakeUsers />}
          {tab === "fake-messages" && <AdminFakeMessages />}
          {tab === "boost" && <AdminBoost />}
          {tab === "activity" && <AdminActivity />}
          {tab === "orders" && <AdminOrders />}
          {tab === "settings" && <AdminSettings />}
        </main>
      </div>
    </div>
  )
}
