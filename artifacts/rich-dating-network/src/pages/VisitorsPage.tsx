import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { authFetch } from "../lib/auth"
import { getPhotoUrl, timeAgo } from "../lib/utils"

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [, setLocation] = useLocation()

  useEffect(() => {
    authFetch("/api/visits").then(r => r.json()).then(d => { setVisitors(d); setLoading(false) })
  }, [])

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/home")} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Profile Visitors</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : visitors.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-5xl mb-3">👁️</div>
          <p>No visitors yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visitors.map((row, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="relative">
                <img src={getPhotoUrl(row.visitor?.photo)} alt="" className="w-14 h-14 rounded-full object-cover bg-gray-200"
                  onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                {row.visitor?.online ? <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" /> : null}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{row.visitor?.name}</div>
                <div className="text-sm text-gray-500">{row.visitor?.age} · {row.visitor?.city}, {row.visitor?.country}</div>
                <div className="text-xs text-gray-400 mt-0.5">{timeAgo(row.visit?.time)}</div>
              </div>
              <button onClick={() => setLocation(`/profile/${row.visitor?.id}`)}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-medium transition-colors">
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
