import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"

interface AdminUser {
  id: number; name: string; email: string; city: string; country: string
  gender: number; age: number; fake: number; admin: number; banned: number
  premium: number; credits: number; verified: number; created: number; photo: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
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

  const FILTERS = ["all", "real", "fake", "premium", "banned", "admin"]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Search users..." className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 w-48" />
          <button onClick={load} className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">Search</button>
        </div>
      </div>

      <div className="text-gray-400 text-sm">{total} users total</div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-800">
                <tr className="text-gray-400 text-left">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Premium</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={getPhotoUrl(u.photo)} alt="" className="w-9 h-9 rounded-full object-cover bg-gray-700" onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
                        <div>
                          <div className="text-white font-medium">{u.name}</div>
                          <div className="text-gray-500 text-xs">{u.email} · #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{u.city}, {u.country}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.admin ? "bg-yellow-500/20 text-yellow-400" : u.fake ? "bg-purple-500/20 text-purple-400" : "bg-green-500/20 text-green-400"}`}>
                        {u.admin ? "Admin" : u.fake ? "Fake" : "User"}
                      </span>
                      {u.banned === 1 && <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Banned</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{u.credits}</span>
                        <div className="flex items-center gap-1">
                          <input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} className="w-14 bg-gray-800 text-white text-xs px-1.5 py-1 rounded border border-gray-700" />
                          <button onClick={() => addCredits(u)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">+</button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${u.premium ? "text-yellow-400" : "text-gray-500"}`}>{u.premium ? "✓ Premium" : "Free"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => banUser(u)} className={`px-2 py-1 rounded text-xs transition-colors ${u.banned ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white"}`}>
                          {u.banned ? "Unban" : "Ban"}
                        </button>
                        <button onClick={() => deleteUser(u)} className="px-2 py-1 rounded text-xs bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white transition-colors">Del</button>
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
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-40">Previous</button>
        <span className="text-gray-400 text-sm">Page {page}</span>
        <button disabled={users.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}
