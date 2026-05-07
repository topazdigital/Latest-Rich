'use client'
import { useState } from 'react'
import { getPhotoUrl, genderLabel, timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, UserCheck, UserX, Shield, Crown, Bot, Edit2, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { users: any[]; total: number; page: number; perPage: number; search: string; type: string }

export default function AdminUsers({ users, total, page, perPage, search, type }: Props) {
  const router = useRouter()
  const [q, setQ] = useState(search)
  const [loading, setLoading] = useState<number | null>(null)
  const totalPages = Math.ceil(total / perPage)

  function doSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(`/admin/users?search=${q}&type=${type}`)
  }

  async function actionUser(userId: number, action: string) {
    setLoading(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) { toast.success(`User ${action}d`); router.refresh() }
      else toast.error('Action failed')
    } catch { toast.error('Error') }
    finally { setLoading(null) }
  }

  async function deleteUser(userId: number) {
    if (!confirm('Delete this user permanently?')) return
    setLoading(userId)
    try {
      await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
      toast.success('User deleted')
      router.refresh()
    } catch { toast.error('Error') }
    finally { setLoading(null) }
  }

  const TYPES = [
    { v: 'all', l: 'All' }, { v: 'real', l: 'Real' }, { v: 'fake', l: 'Bots' },
    { v: 'premium', l: 'Premium' }, { v: 'blocked', l: 'Blocked' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users ({total.toLocaleString()})</h1>
        <Link href="/admin/fake-users" className="btn-primary text-sm flex items-center gap-2">
          <Bot size={16} /> Generate Fakes
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <form onSubmit={doSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email..." className="input-field pl-8 py-2 text-sm" />
          </div>
          <button type="submit" className="btn-primary text-sm py-2 px-4">Search</button>
        </form>
        <div className="flex gap-1">
          {TYPES.map(t => (
            <Link key={t.v} href={`/admin/users?type=${t.v}&search=${search}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${type === t.v ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t.l}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">Info</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Credits</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden xl:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src={getPhotoUrl(user.photo)} alt={user.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 font-medium text-gray-900">
                          {user.name}
                          {user.admin === 1 && <Shield size={12} className="text-brand-500" />}
                          {user.fake === 1 && <Bot size={12} className="text-purple-500" />}
                          {user.premium === 1 && <Crown size={12} className="text-gold-500" />}
                        </div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                    <div>{genderLabel(user.gender)}</div>
                    <div>{user.country}</div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {user.verified === 1 && <span className="badge bg-blue-100 text-blue-600">Verified</span>}
                      {user.blocked === 1 && <span className="badge bg-red-100 text-red-600">Blocked</span>}
                      {user.suspend === 1 && <span className="badge bg-orange-100 text-orange-600">Suspended</span>}
                      {user.fake === 0 && user.blocked === 0 && user.suspend === 0 && <span className="badge bg-green-100 text-green-600">Active</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-700 font-medium">{user.credits}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-gray-400 text-xs">{timeAgo(user.joinDateTime)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/users/${user.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit">
                        <Edit2 size={14} />
                      </Link>
                      <button onClick={() => actionUser(user.id, user.blocked ? 'unblock' : 'block')}
                        disabled={loading === user.id}
                        className={`p-1.5 rounded-lg transition-colors ${user.blocked ? 'hover:bg-green-50 text-green-500' : 'hover:bg-red-50 text-red-400'}`}
                        title={user.blocked ? 'Unblock' : 'Block'}>
                        {user.blocked ? <UserCheck size={14} /> : <UserX size={14} />}
                      </button>
                      <button onClick={() => deleteUser(user.id)} disabled={loading === user.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && <Link href={`/admin/users?page=${page-1}&type=${type}&search=${search}`} className="btn-ghost text-sm py-1 px-3">Previous</Link>}
              {page < totalPages && <Link href={`/admin/users?page=${page+1}&type=${type}&search=${search}`} className="btn-primary text-sm py-1 px-3">Next</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
