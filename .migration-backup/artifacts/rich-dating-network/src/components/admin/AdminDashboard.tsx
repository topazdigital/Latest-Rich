import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

interface Stats {
  totalUsers: number
  fakeUsers: number
  realUsers: number
  newToday: number
  premiumUsers: number
  onlineUsers: number
  totalRevenue: number
  todayRevenue: number
  totalMessages: number
  totalLikes: number
}

function StatCard({ label, value, icon, sub, color = "blue" }: { label: string; value: string | number; icon: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    purple: "bg-purple-500/10 text-purple-400",
    pink: "bg-pink-500/10 text-pink-400",
  }
  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{typeof value === "number" && value > 0 && label.includes("Revenue") ? `$${value.toFixed(2)}` : value.toLocaleString()}</div>
      <div className="text-gray-400 text-sm">{label}</div>
      {sub && <div className="text-gray-500 text-xs mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    authFetch("/api/admin/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  const triggerAutoMessages = async () => {
    setTriggering(true)
    try {
      const r = await authFetch("/api/admin/trigger-auto-messages", { method: "POST" })
      const d = await r.json()
      toast.success(`Sent ${d.sent} auto messages`)
    } catch { toast.error("Failed") } finally { setTriggering(false) }
  }

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Overview</h2>
        <button onClick={triggerAutoMessages} disabled={triggering}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {triggering ? "Sending..." : "🤖 Trigger Auto Messages"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="blue" />
        <StatCard icon="🟢" label="Online Now" value={stats.onlineUsers} color="green" />
        <StatCard icon="✨" label="New Today" value={stats.newToday} color="purple" />
        <StatCard icon="👑" label="Premium" value={stats.premiumUsers} color="yellow" />
        <StatCard icon="🤖" label="Fake Users" value={stats.fakeUsers} color="red" />
        <StatCard icon="👤" label="Real Users" value={stats.realUsers} color="blue" />
        <StatCard icon="💬" label="Messages Sent" value={stats.totalMessages} color="pink" />
        <StatCard icon="❤️" label="Total Likes" value={stats.totalLikes} color="red" />
        <StatCard icon="💰" label="Total Revenue" value={stats.totalRevenue} color="green" />
        <StatCard icon="📅" label="Today Revenue" value={stats.todayRevenue} color="green" />
      </div>
    </div>
  )
}
