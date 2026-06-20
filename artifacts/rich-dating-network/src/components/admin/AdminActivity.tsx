import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl, timeAgo } from "../../lib/utils"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "message", label: "💬 Messages" },
  { key: "like", label: "❤️ Likes" },
  { key: "visit", label: "👁️ Visits" },
  { key: "purchase", label: "💰 Sales" },
  { key: "admin", label: "⚙️ Admin" },
  { key: "system", label: "🔧 System" },
]

const ICONS: Record<string, string> = {
  like: "❤️", message: "💬", admin: "⚙️", purchase: "💰", visit: "👁️", system: "🔧", login: "🔐", default: "📋",
}

const TYPE_COLORS: Record<string, string> = {
  like: "#ef4444", message: "#3b82f6", admin: "#f59e0b", purchase: "#22c55e",
  visit: "#a855f7", system: "#64748b", login: "#ec4899", default: "#475569",
}

export default function AdminActivity() {
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [limit, setLimit] = useState(100)

  const load = async (lim = limit) => {
    setLoading(true)
    try {
      const r = await authFetch(`/api/admin/activity?filter=${filter}&limit=${lim}`)
      const d = await r.json()
      setActivity(Array.isArray(d) ? d : [])
    } catch { setActivity([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Activity Log</h2>
          <p className="text-gray-500 text-xs">{activity.length} events loaded</p>
        </div>
        <button onClick={() => load()}
          className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-200 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === f.key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activity.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No activity</p>
          <p className="text-sm mt-1">Events will appear here as users interact with the platform</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {activity.map((row: any, i) => {
              const type = row.activity?.type || 'default'
              const color = TYPE_COLORS[type] || TYPE_COLORS.default
              const icon = ICONS[type] || ICONS.default
              let preview = row.activity?.message || ''
              try {
                const parsed = JSON.parse(preview)
                if (parsed.message) preview = parsed.message
              } catch {}

              // If admin replied as a fake user, show the fake user's name from the title
              const title = row.activity?.title || ''
              const modMatch = title.match(/^Moderator reply as (.+)$/)
              const actorName = modMatch ? modMatch[1] : (row.user?.name || 'System')
              const showPhoto = !modMatch && !!row.user?.photo

              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${i < activity.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  {/* Avatar / icon */}
                  <div className="relative flex-shrink-0">
                    {showPhoto ? (
                      <img src={getPhotoUrl(row.user.photo)} alt=""
                        className="w-8 h-8 rounded-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">
                        {modMatch ? '🤖' : icon}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none" title={type}>
                      {icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-gray-900 text-sm font-semibold">{actorName}</span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: color + '22', color }}>
                        {modMatch ? `as fake user` : (row.activity?.title || type)}
                      </span>
                    </div>
                    {preview && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{preview.replace(/&#039;/g, "'").slice(0, 100)}</p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="text-gray-600 text-xs flex-shrink-0 text-right">
                    {timeAgo(row.activity?.time)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {activity.length >= limit && (
            <div className="text-center">
              <button onClick={() => { const nl = limit + 100; setLimit(nl); load(nl) }}
                className="px-6 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-200 transition-colors">
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
