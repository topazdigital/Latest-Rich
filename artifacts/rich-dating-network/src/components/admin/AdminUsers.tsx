import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"
import AdminUserDetail from "./AdminUserDetail"

interface AdminUser {
  id: number; name: string; email: string; city: string; country: string
  gender: number; age: number; fake: number; admin: number; banned: number
  premium: number; credits: number; verified: number; created: number; photo: string
  lastAccess: string | null
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [detailUserId, setDetailUserId] = useState<number | null>(null)
  const [creditsAmount, setCreditsAmount] = useState("100")

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch(`/api/admin/users?page=${page}&filter=${filter}&search=${encodeURIComponent(search)}`)
      const d = await r.json()
      setUsers(d.users || [])
      setTotal(d.total || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, filter])

  const banUser = async (u: AdminUser) => {
    const r = await authFetch(`/api/admin/users/${u.id}/ban`, { method: "POST" })
    const d = await r.json()
    toast.success(d.banned ? "User banned" : "User unbanned")
    load()
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
    load()
  }

  const toggleFake = async (u: AdminUser) => {
    const newFake = u.fake === 1 ? 0 : 1
    const label = newFake === 1 ? "fake" : "real"
    if (!confirm(`Mark ${u.name} as a ${label} user?`)) return
    await authFetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, fake: newFake }),
    })
    toast.success(`${u.name} marked as ${label}`)
    load()
  }

  const FILTERS = ["all", "real", "fake", "premium", "banned", "admin"]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search users..." className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm border border-gray-300 focus:outline-none focus:border-brand-500 w-48 placeholder:text-gray-400" />
          <button onClick={load} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm">Search</button>
        </div>
      </div>

      <div className="text-gray-600 text-sm font-medium">{total} users total</div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr className="text-gray-600 text-left">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 rounded-full bg-gray-100 overflow-hidden" style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}>
                          <img src={getPhotoUrl(u.photo)} alt="" className="w-full h-full object-cover" onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                        </div>
                        <div>
                          <div className="text-gray-900 font-medium">{u.name}</div>
                          <div className="text-gray-500 text-xs">{u.email} · #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.city}{u.city && u.country ? ', ' : ''}{u.country}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {u.lastAccess && Number(u.lastAccess) > 0 ? (() => {
                        const diff = Math.floor(Date.now() / 1000) - Number(u.lastAccess)
                        if (diff < 60) return <span className="text-green-400 font-medium">Online now</span>
                        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
                        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
                        return new Date(Number(u.lastAccess) * 1000).toLocaleDateString()
                      })() : <span className="text-gray-700">Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {u.fake === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">Fake</span>
                        ) : u.admin === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Admin</span>
                        ) : u.admin === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">Moderator</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">User</span>
                        )}
                        {u.banned === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Banned</span>}
                        {u.fake !== 1 && (
                          <select
                            value={u.admin}
                            onChange={async e => {
                              const newLevel = parseInt(e.target.value)
                              await authFetch(`/api/admin/users/${u.id}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ...u, admin: newLevel }),
                              })
                              toast.success(newLevel === 2 ? "Set as Admin" : newLevel === 1 ? "Set as Moderator" : "Set as User")
                              load()
                            }}
                            className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:border-brand-500"
                          >
                            <option value="0">User</option>
                            <option value="1">Moderator</option>
                            <option value="2">Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-semibold">{u.credits}</span>
                        <div className="flex items-center gap-1">
                          <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} className="w-14 bg-white text-gray-900 text-xs px-1.5 py-1 rounded border border-gray-300" />
                          <button onClick={() => addCredits(u)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">+</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${u.premium ? "text-yellow-400" : "text-gray-500"}`}>{u.premium ? "✓ Premium" : "Free"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailUserId(u.id)} className="px-2 py-1 rounded text-xs bg-brand-600 hover:bg-brand-700 text-white transition-colors">View</button>
                        <button onClick={() => toggleFake(u)} className={`px-2 py-1 rounded text-xs transition-colors ${u.fake === 1 ? "bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white" : "bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white"}`}>
                          {u.fake === 1 ? "→Real" : "→Fake"}
                        </button>
                        <button onClick={() => banUser(u)} className={`px-2 py-1 rounded text-xs transition-colors ${u.banned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white"}`}>
                          {u.banned ? "Unban" : "Ban"}
                        </button>
                        <button onClick={() => deleteUser(u)} className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-red-600 text-gray-600 hover:text-white transition-colors">Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center gap-2 justify-center">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-gray-50 text-white rounded-lg text-sm disabled:opacity-40">Previous</button>
        <span className="text-gray-600 text-sm font-medium">Page {page}</span>
        <button disabled={users.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-gray-50 text-white rounded-lg text-sm disabled:opacity-40">Next</button>
      </div>

      {detailUserId !== null && (
        <AdminUserDetail
          userId={detailUserId}
          onClose={() => setDetailUserId(null)}
          onUpdate={load}
        />
      )}
    </div>
  )
}
