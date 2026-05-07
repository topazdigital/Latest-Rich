'use client'
import { useState } from 'react'
import { getPhotoUrl, genderLabel, timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, UserX, UserCheck, Crown, Shield, Trash2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props { user: any }

export default function AdminUserEdit({ user }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    age: user.age || 25,
    city: user.city || '',
    country: user.country || '',
    credits: user.credits || 0,
    premium: user.premium || 0,
    verified: user.verified || 0,
    fake: user.fake || 0,
    blocked: user.blocked || 0,
    suspend: user.suspend || 0,
    admin: user.admin || 0,
  })

  function update(k: string, v: any) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) toast.success('User updated!')
      else toast.error('Failed to update')
    } catch { toast.error('Error') }
    finally { setSaving(false) }
  }

  async function quickAction(action: string, extra?: any) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.ok) { toast.success(`Action: ${action}`); router.refresh() }
      else toast.error('Action failed')
    } catch { toast.error('Error') }
  }

  async function deleteUser() {
    if (!confirm('Delete this user permanently?')) return
    await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    toast.success('User deleted')
    router.push('/admin/users')
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="btn-ghost flex items-center gap-2">
          <ArrowLeft size={16} /> Users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
      </div>

      {/* Profile header */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
          <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            {user.fake === 1 && <span className="badge bg-purple-100 text-purple-600">Bot</span>}
            {user.premium === 1 && <span className="badge bg-yellow-100 text-yellow-600">VIP</span>}
            {user.verified === 1 && <span className="badge bg-blue-100 text-blue-600">Verified</span>}
            {user.admin === 1 && <span className="badge bg-red-100 text-red-600">Admin</span>}
          </div>
          <p className="text-gray-500 text-sm">{user.email}</p>
          <p className="text-gray-400 text-xs mt-1">ID: {user.id} · Joined: {user.joinDate} · Last seen: {timeAgo(user.lastAccess)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={`/chat/${user.id}`} className="btn-outline text-sm py-2 px-3 flex items-center gap-1">
            <MessageCircle size={14} /> Message
          </Link>
          <button onClick={deleteUser} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1 p-2 rounded-lg hover:bg-red-50">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card p-4 flex flex-wrap gap-2">
        <button onClick={() => quickAction(form.blocked ? 'unblock' : 'block')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${form.blocked ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
          {form.blocked ? <><UserCheck size={14} /> Unblock</> : <><UserX size={14} /> Block</>}
        </button>
        <button onClick={() => quickAction('verify')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100">
          <Shield size={14} /> Verify
        </button>
        <button onClick={() => quickAction('premium', { days: 30 })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-600 hover:bg-yellow-100">
          <Crown size={14} /> Grant 30d Premium
        </button>
        <button onClick={() => quickAction('add_credits', { amount: 100 })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand-50 text-brand-600 hover:bg-brand-100">
          + 100 Credits
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Edit form */}
        <div className="card p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Edit Details</h3>
          {[['name','Name','text'],['email','Email','email'],['age','Age','number'],['city','City','text'],['country','Country','text'],['credits','Credits','number']].map(([k, l, t]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{l}</label>
              <input type={t} value={(form as any)[k]} onChange={e => update(k, t === 'number' ? parseInt(e.target.value) : e.target.value)} className="input-field py-2 text-sm" />
            </div>
          ))}
          {[['premium','Premium'],['verified','Verified'],['fake','Fake/Bot'],['blocked','Blocked'],['suspend','Suspended'],['admin','Admin']].map(([k, l]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{l}</span>
              <button onClick={() => update(k, (form as any)[k] ? 0 : 1)}
                className={`w-12 h-6 rounded-full transition-all ${(form as any)[k] ? 'bg-brand-500' : 'bg-gray-200'} relative`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${(form as any)[k] ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
          <button onClick={save} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} Save Changes
          </button>
        </div>

        {/* Orders history */}
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Recent Orders</h3>
          {user.orders.length === 0 ? <p className="text-gray-400 text-sm">No orders</p> : (
            <div className="space-y-3">
              {user.orders.map((o: any) => (
                <div key={o.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{o.type}</p>
                    <p className="text-xs text-gray-400">{o.gateway} · {new Date(o.time * 1000).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${o.amount}</p>
                    <span className={`badge text-xs ${o.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3 className="font-bold text-gray-900 mb-4 mt-6">Photos ({user.photos.length})</h3>
          <div className="grid grid-cols-4 gap-2">
            {user.photos.map((p: any) => (
              <div key={p.id} className="aspect-square rounded-lg overflow-hidden">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
