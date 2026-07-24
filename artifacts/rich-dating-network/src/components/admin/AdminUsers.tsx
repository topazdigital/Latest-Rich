import { useState, useEffect, useCallback, useRef } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"
import AdminUserDetail from "./AdminUserDetail"

interface AdminUser {
  id: number; name: string; email: string; city: string; country: string
  gender: number; age: number; fake: number; admin: number; banned: number
  premium: number; credits: number; verified: number; created: number; photo: string
  lastAccess: string | null; lastIp?: string; username?: string
}

interface UserStats {
  totalUsers: number; realUsers: number; fakeUsers: number
  premiumUsers: number; onlineUsers: number; verifiedUsers: number; bannedUsers: number
}

const QUICK_FILTERS = [
  { key: "all", label: "Total", statKey: "totalUsers", color: "bg-gray-900 text-white", activeColor: "bg-gray-900" },
  { key: "real", label: "Real", statKey: "realUsers", color: "bg-blue-600 text-white", activeColor: "bg-blue-600" },
  { key: "fake", label: "Fake", statKey: "fakeUsers", color: "bg-purple-600 text-white", activeColor: "bg-purple-600" },
  { key: "premium", label: "Premium", statKey: "premiumUsers", color: "bg-yellow-500 text-white", activeColor: "bg-yellow-500" },
  { key: "online", label: "Online", statKey: "onlineUsers", color: "bg-green-600 text-white", activeColor: "bg-green-600" },
  { key: "verified", label: "Verified", statKey: "verifiedUsers", color: "bg-teal-600 text-white", activeColor: "bg-teal-600" },
] as const

function relativeTime(ts: string | null) {
  if (!ts || Number(ts) === 0) return null
  const diff = Math.floor(Date.now() / 1000) - Number(ts)
  if (diff < 60) return { label: "Online now", cls: "text-green-500 font-semibold" }
  if (diff < 3600) return { label: `${Math.floor(diff / 60)}m ago`, cls: "text-gray-500" }
  if (diff < 86400) return { label: `${Math.floor(diff / 3600)}h ago`, cls: "text-gray-500" }
  if (diff < 604800) return { label: `${Math.floor(diff / 86400)}d ago`, cls: "text-gray-500" }
  return { label: new Date(Number(ts) * 1000).toLocaleDateString(), cls: "text-gray-400" }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const [creditsAmount, setCreditsAmount] = useState("100")

  // Quick-filter tab
  const [quickFilter, setQuickFilter] = useState("all")

  // Advanced filters
  const [search, setSearch] = useState("")
  const [gender, setGender] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [ageMin, setAgeMin] = useState("")
  const [ageMax, setAgeMax] = useState("")
  const [orderBy, setOrderBy] = useState("lastAccess")
  const [onlineNow, setOnlineNow] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Detected duplicate IPs in current page
  const [sharedIps, setSharedIps] = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildQuery = useCallback((p = page) => {
    const params = new URLSearchParams()
    params.set("page", String(p))
    params.set("limit", "50")
    params.set("filter", quickFilter)
    if (search) params.set("search", search)
    if (gender) params.set("gender", gender)
    if (dateFrom) params.set("dateFrom", String(Math.floor(new Date(dateFrom).getTime() / 1000)))
    if (dateTo) params.set("dateTo", String(Math.floor(new Date(dateTo).getTime() / 1000) + 86399))
    if (country) params.set("country", country)
    if (city) params.set("city", city)
    if (ageMin) params.set("ageMin", ageMin)
    if (ageMax) params.set("ageMax", ageMax)
    params.set("orderBy", orderBy)
    if (onlineNow) params.set("onlineNow", "1")
    if (verifiedOnly) params.set("verified", "1")
    return params.toString()
  }, [page, quickFilter, search, gender, dateFrom, dateTo, country, city, ageMin, ageMax, orderBy, onlineNow, verifiedOnly])

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const r = await authFetch(`/api/admin/users?${buildQuery(p)}`)
      const d = await r.json()
      const list: AdminUser[] = d.users || []
      setUsers(list)
      setTotal(d.total || 0)

      // Detect IPs shared across multiple users on this page
      const ipCount: Record<string, number> = {}
      list.forEach(u => { if (u.lastIp) ipCount[u.lastIp] = (ipCount[u.lastIp] || 0) + 1 })
      setSharedIps(new Set(Object.entries(ipCount).filter(([, c]) => c > 1).map(([ip]) => ip)))
    } finally { setLoading(false) }
  }, [buildQuery, page])

  const loadStats = async () => {
    try {
      const r = await authFetch("/api/admin/stats")
      const d = await r.json()
      setStats(d)
    } catch { /* non-fatal */ }
  }

  // Load stats once on mount
  useEffect(() => { loadStats() }, [])

  // Debounce filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { load(1); setPage(1) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [quickFilter, search, gender, dateFrom, dateTo, country, city, ageMin, ageMax, orderBy, onlineNow, verifiedOnly])

  // Page changes reload immediately
  useEffect(() => { load(page) }, [page])

  const banUser = async (u: AdminUser) => {
    const r = await authFetch(`/api/admin/users/${u.id}/ban`, { method: "POST" })
    const d = await r.json()
    toast.success(d.banned ? "User banned" : "User unbanned")
    load(); loadStats()
  }

  const addCredits = async (u: AdminUser) => {
    await authFetch(`/api/admin/users/${u.id}/credits`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: parseInt(creditsAmount) })
    })
    toast.success(`Added ${creditsAmount} credits`)
    load()
  }

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.name}? This cannot be undone.`)) return
    await authFetch(`/api/admin/users/${u.id}`, { method: "DELETE" })
    toast.success("User deleted")
    load(); loadStats()
  }

  const toggleFake = async (u: AdminUser) => {
    const newFake = u.fake === 1 ? 0 : 1
    if (!confirm(`Mark ${u.name} as a ${newFake === 1 ? "fake" : "real"} user?`)) return
    await authFetch(`/api/admin/users/${u.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, fake: newFake }),
    })
    toast.success(`${u.name} marked as ${newFake === 1 ? "fake" : "real"}`)
    load(); loadStats()
  }

  const hasActiveFilters = gender || dateFrom || dateTo || country || city || ageMin || ageMax || onlineNow || verifiedOnly || orderBy !== "lastAccess"

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => { setQuickFilter(f.key); setPage(1) }}
            className={`rounded-xl p-3 text-center transition-all border-2 ${
              quickFilter === f.key
                ? `${f.color} border-transparent shadow-lg scale-105`
                : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
            }`}
          >
            <div className={`text-xl font-bold ${quickFilter === f.key ? "text-white" : "text-gray-900"}`}>
              {stats ? (stats as any)[f.statKey]?.toLocaleString() ?? "—" : "…"}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${quickFilter === f.key ? "text-white/80" : "text-gray-500"}`}>
              {f.label}
            </div>
          </button>
        ))}
      </div>

      {/* Search + filter toggle row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 flex-1 min-w-0">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, email, username or ID…"
            className="flex-1 min-w-0 bg-white text-gray-900 px-3 py-2 rounded-lg text-sm border border-gray-300 focus:outline-none focus:border-brand-500 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Filters {hasActiveFilters ? "●" : ""}
        </button>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
              <select value={gender} onChange={e => { setGender(e.target.value); setPage(1) }}
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500">
                <option value="">All genders</option>
                <option value="1">Male</option>
                <option value="2">Female</option>
              </select>
            </div>

            {/* Register from */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Registered from</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500" />
            </div>

            {/* Register to */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Registered to</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500" />
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <input value={country} onChange={e => { setCountry(e.target.value); setPage(1) }}
                placeholder="e.g. United States"
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500 placeholder:text-gray-400" />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
              <input value={city} onChange={e => { setCity(e.target.value); setPage(1) }}
                placeholder="e.g. New York"
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500 placeholder:text-gray-400" />
            </div>

            {/* Age min */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Age min</label>
              <input type="number" min="18" max="99" value={ageMin} onChange={e => { setAgeMin(e.target.value); setPage(1) }}
                placeholder="18"
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500 placeholder:text-gray-400" />
            </div>

            {/* Age max */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Age max</label>
              <input type="number" min="18" max="99" value={ageMax} onChange={e => { setAgeMax(e.target.value); setPage(1) }}
                placeholder="99"
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500 placeholder:text-gray-400" />
            </div>

            {/* Order by */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Order by</label>
              <select value={orderBy} onChange={e => { setOrderBy(e.target.value); setPage(1) }}
                className="w-full bg-white text-gray-900 text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-brand-500">
                <option value="lastAccess">Last connection</option>
                <option value="createdDesc">Newest first</option>
                <option value="createdAsc">Oldest first</option>
                <option value="name">Name A–Z</option>
                <option value="credits">Most credits</option>
              </select>
            </div>
          </div>

          {/* Toggle filters */}
          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            {[
              { label: "Online now", value: onlineNow, set: setOnlineNow, color: "bg-green-500" },
              { label: "Verified", value: verifiedOnly, set: setVerifiedOnly, color: "bg-teal-500" },
            ].map(({ label, value, set, color }) => (
              <button
                key={label}
                onClick={() => { set(!value); setPage(1) }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  value ? `${color} text-white border-transparent` : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${value ? "bg-white" : "bg-gray-300"}`} />
                {label}
              </button>
            ))}

            <button
              onClick={() => {
                setGender(""); setDateFrom(""); setDateTo(""); setCountry(""); setCity("")
                setAgeMin(""); setAgeMax(""); setOrderBy("lastAccess"); setOnlineNow(false); setVerifiedOnly(false)
                setPage(1)
              }}
              className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      <div className="text-gray-500 text-sm">{total.toLocaleString()} users</div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/60">
                <tr className="text-gray-500 text-left text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const time = relativeTime(u.lastAccess)
                  const isDuplicateIp = !!(u.lastIp && sharedIps.has(u.lastIp))
                  return (
                    <tr key={u.id} className={`border-b border-gray-100 transition-colors ${isDuplicateIp ? "bg-orange-50 hover:bg-orange-100/60" : "hover:bg-gray-50/40"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 rounded-full bg-gray-100 overflow-hidden" style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}>
                            <img src={getPhotoUrl(u.photo)} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                          </div>
                          <div>
                            <div className="text-gray-900 font-medium">{u.name}{u.age ? `, ${u.age}` : ""}</div>
                            <div className="text-gray-400 text-xs">{u.username ? `@${u.username} · ` : ""}#{u.id}</div>
                            <div className="text-gray-400 text-xs truncate max-w-[160px]">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {u.city || u.country ? <><div>{u.city}</div><div>{u.country}</div></> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {time ? <span className={time.cls}>{time.label}</span> : <span className="text-gray-300">Never</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">
                        {u.lastIp ? (
                          <span className={`${isDuplicateIp ? "text-orange-600 font-semibold" : "text-gray-500"}`} title={isDuplicateIp ? "Multiple profiles using this IP" : undefined}>
                            {u.lastIp}
                            {isDuplicateIp && <span className="ml-1 text-orange-500">⚠</span>}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 items-center">
                          {u.fake === 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-600">Fake</span>
                          ) : u.admin === 2 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-600">Admin</span>
                          ) : u.admin === 1 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">Mod</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">User</span>
                          )}
                          {u.banned === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-500">Banned</span>}
                          {u.verified === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-teal-100 text-teal-600">✓</span>}
                          {u.premium === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-600">★</span>}
                          {u.fake !== 1 && (
                            <select
                              value={u.admin}
                              onChange={async e => {
                                const newLevel = parseInt(e.target.value)
                                await authFetch(`/api/admin/users/${u.id}`, {
                                  method: "PUT", headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ ...u, admin: newLevel }),
                                })
                                toast.success(newLevel === 2 ? "Set as Admin" : newLevel === 1 ? "Set as Moderator" : "Set as User")
                                load()
                              }}
                              className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                            >
                              <option value="0">User</option>
                              <option value="1">Moderator</option>
                              <option value="2">Admin</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-900 font-semibold w-6 text-right">{u.credits}</span>
                          <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)}
                            className="w-12 bg-white text-gray-900 text-xs px-1.5 py-1 rounded border border-gray-300" />
                          <button onClick={() => addCredits(u)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-1.5 py-1 rounded">+</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailUserId(u.id)} className="px-2 py-1 rounded text-xs bg-brand-600 hover:bg-brand-700 text-white">View</button>
                          <button onClick={() => toggleFake(u)} className={`px-2 py-1 rounded text-xs transition-colors ${u.fake === 1 ? "bg-green-100 hover:bg-green-600 text-green-600 hover:text-white" : "bg-purple-100 hover:bg-purple-600 text-purple-600 hover:text-white"}`}>
                            {u.fake === 1 ? "→Real" : "→Fake"}
                          </button>
                          <button onClick={() => banUser(u)} className={`px-2 py-1 rounded text-xs transition-colors ${u.banned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-100 hover:bg-red-600 text-red-500 hover:text-white"}`}>
                            {u.banned ? "Unban" : "Ban"}
                          </button>
                          <button onClick={() => deleteUser(u)} className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-red-600 text-gray-500 hover:text-white transition-colors">Del</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No users match these filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-center">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
          ← Previous
        </button>
        <span className="text-gray-500 text-sm px-2">Page {page}</span>
        <button disabled={users.length < 50} onClick={() => setPage(p => p + 1)}
          className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
          Next →
        </button>
      </div>

      {detailUserId !== null && (
        <AdminUserDetail
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdate={() => { load(); loadStats() }}
        />
      )}
    </div>
  )
}
