import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl, timeAgo } from "../../lib/utils"

const FILTERS = ["all", "like", "message", "admin", "purchase", "visit", "system"]

export default function AdminActivity() {
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  const load = async () => {
    setLoading(true)
    const r = await authFetch(`/api/admin/activity?filter=${filter}`)
    const d = await r.json()
    setActivity(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const ICONS: Record<string, string> = {
    like: "❤️", message: "💬", admin: "⚙️", purchase: "💰", visit: "👁️", system: "🔧", default: "📋"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {activity.map((row: any, i) => (
            <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-start gap-3">
              <div className="text-2xl">{ICONS[row.activity?.type] || ICONS.default}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {row.user?.photo && (
                    <img src={getPhotoUrl(row.user.photo)} alt="" className="w-6 h-6 rounded-full object-cover" onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                  )}
                  <span className="text-white text-sm font-medium">{row.user?.name || "System"}</span>
                </div>
                <div className="text-gray-300 text-sm mt-0.5">{row.activity?.title}</div>
                <div className="text-gray-500 text-xs mt-0.5">{row.activity?.message}</div>
              </div>
              <div className="text-gray-500 text-xs shrink-0">{timeAgo(row.activity?.time * 1000)}</div>
            </div>
          ))}
          {activity.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📋</div>
              <p>No activity yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
