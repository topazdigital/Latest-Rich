import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { authFetch } from "../lib/auth"
import { getPhotoUrl, timeAgo } from "../lib/utils"
import { Eye, Crown, Lock } from "lucide-react"
import { useAuth } from "../hooks/useAuth"

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const isPremium = user?.premium === 1

  useEffect(() => {
    authFetch("/api/visits").then(r => r.json()).then(d => { setVisitors(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/home")}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Profile Visitors</h1>
          <p className="text-xs text-gray-500">{visitors.length} people viewed your profile</p>
        </div>
        {isPremium && (
          <div className="ml-auto flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <Crown size={12} /> VIP
          </div>
        )}
      </div>

      {/* Premium gate */}
      {!isPremium && visitors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-5 text-center">
          <Lock size={28} className="text-amber-500 mx-auto mb-2" />
          <div className="font-bold text-gray-900 text-sm mb-1">See Who Viewed You</div>
          <p className="text-gray-500 text-xs mb-3 leading-relaxed">
            {visitors.length} people visited your profile. Upgrade to Premium to see exactly who they are.
          </p>
          <button onClick={() => setLocation("/premium")}
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl font-bold text-white text-sm shadow-lg shadow-brand-500/20"
            style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
            <Crown size={14} /> Upgrade to Premium
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visitors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Eye size={28} className="text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">No visitors yet</h3>
          <p className="text-sm text-gray-500">When people view your profile, they'll appear here</p>
          <button onClick={() => setLocation("/discover")}
            className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-white text-sm shadow-md"
            style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
            Discover People
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {visitors.map((row, i) => (
            <div key={i}
              className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 transition-all ${!isPremium && i > 0 ? 'relative overflow-hidden' : ''}`}>
              {/* Blur for non-premium after first */}
              {!isPremium && i > 0 && (
                <div className="absolute inset-0 backdrop-blur-sm bg-white/70 flex items-center justify-center z-10 rounded-2xl">
                  <button onClick={() => setLocation("/premium")}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-500 bg-white border border-brand-200 px-3 py-1.5 rounded-full shadow-sm hover:shadow-md transition-all">
                    <Crown size={12} /> Premium to unlock
                  </button>
                </div>
              )}

              <div className="relative flex-shrink-0">
                <img src={getPhotoUrl(row.visitor?.photo)} alt=""
                  className="w-14 h-14 rounded-2xl object-cover bg-gray-100"
                  onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                {row.visitor?.online ? (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{row.visitor?.name || "Unknown"}</div>
                <div className="text-sm text-gray-500">
                  {[row.visitor?.age, row.visitor?.city, row.visitor?.country].filter(Boolean).join(' · ')}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{timeAgo(row.visit?.time)}</div>
              </div>
              <button onClick={() => setLocation(`/profile/${row.visitor?.id}`)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:shadow-md flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
