import { useState, useRef } from 'react'
import { User, Camera, Lock, LogOut, Save, Loader2, X, Shield, Trash2, Bell } from 'lucide-react'
import { getPhotoUrl } from '../../lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props { user: any }
const TABS = ['Profile', 'Photos', 'Password', 'Privacy']

export default function SettingsPage({ user: initialUser }: Props) {
  const [tab, setTab] = useState('Profile')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: initialUser?.name || '',
    bio: initialUser?.bio?.replace(/<[^>]*>/g, '') || '',
    city: initialUser?.city || '',
    country: initialUser?.country || '',
    birthday: initialUser?.birthday || '',
    looking: String(initialUser?.looking || 1),
    occupation: initialUser?.userExtended?.occupation || '',
    education: initialUser?.userExtended?.education || '',
    height: initialUser?.userExtended?.height || '',
    bodyType: initialUser?.userExtended?.bodyType || '',
    ethnicity: initialUser?.userExtended?.ethnicity || '',
    religion: initialUser?.userExtended?.religion || '',
    smoking: initialUser?.userExtended?.smoking || '',
    drinking: initialUser?.userExtended?.drinking || '',
    children: initialUser?.userExtended?.children || '',
    relationship: initialUser?.userExtended?.relationship || '',
  })
  const [pass, setPass] = useState({ current: '', newPass: '', confirm: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState(initialUser?.photos || [])
  const { token, logout, refreshUser } = useAuth()

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      if (res.ok) { toast.success('Profile saved!'); await refreshUser() }
      else toast.error('Failed to save')
    } catch { toast.error('Error saving') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (pass.newPass !== pass.confirm) return toast.error('Passwords do not match')
    if (pass.newPass.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pass),
      })
      const data = await res.json()
      if (res.ok) { toast.success('Password changed!'); setPass({ current: '', newPass: '', confirm: '' }) }
      else toast.error(data.error || 'Failed')
    } catch { toast.error('Error') }
    finally { setSaving(false) }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('photo', file)
    try {
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (res.ok) { setPhotos((p: any[]) => [...p, data.photo]); toast.success('Photo uploaded!') }
      else toast.error(data.error || 'Upload failed')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  async function deletePhoto(photoId: number) {
    try {
      await fetch(`/api/photos/${photoId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      setPhotos((p: any[]) => p.filter((ph: any) => ph.id !== photoId))
      toast.success('Photo deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="section-title mb-6">Settings</h1>
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bio</label>
              <textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={3} className="input-field resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">City</label>
              <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country</label>
              <input type="text" value={form.country} onChange={e => update('country', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Birthday</label>
              <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Looking For</label>
              <select value={form.looking} onChange={e => update('looking', e.target.value)} className="input-field">
                <option value="1">Men</option>
                <option value="2">Women</option>
                <option value="3">Everyone</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Occupation</label>
              <input type="text" value={form.occupation} onChange={e => update('occupation', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Education</label>
              <input type="text" value={form.education} onChange={e => update('education', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Height</label>
              <input type="text" value={form.height} onChange={e => update('height', e.target.value)} className="input-field" placeholder="e.g. 5'10&quot;" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Body Type</label>
              <select value={form.bodyType} onChange={e => update('bodyType', e.target.value)} className="input-field">
                <option value="">Select...</option>
                {['Slim', 'Athletic', 'Average', 'Curvy', 'Full'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </div>
      )}

      {tab === 'Photos' && (
        <div className="card p-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {photos.map((p: any) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => deletePhoto(p.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-brand-400 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 size={20} className="animate-spin text-gray-400" /> : <>
                <Camera size={20} className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Add Photo</span>
              </>}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </div>
      )}

      {tab === 'Password' && (
        <div className="card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Current Password</label>
            <input type="password" value={pass.current} onChange={e => setPass(p => ({ ...p, current: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</label>
            <input type="password" value={pass.newPass} onChange={e => setPass(p => ({ ...p, newPass: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm Password</label>
            <input type="password" value={pass.confirm} onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} className="input-field" />
          </div>
          <button onClick={changePassword} disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Change Password
          </button>
          <hr className="border-gray-100 my-2" />
          <button onClick={logout} className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-600">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      {tab === 'Privacy' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Shield size={18} className="text-brand-500" /> Privacy Settings</h3>
            <div className="space-y-3">
              {[
                { label: 'Show online status', desc: 'Let others see when you are active', key: 'showOnline' },
                { label: 'Show profile visitors', desc: 'Allow others to see that you viewed their profile', key: 'showVisits' },
                { label: 'Allow messages from non-matches', desc: 'Let any member send you messages', key: 'openMessages' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Bell size={18} className="text-brand-500" /> Notification Preferences</h3>
            <div className="space-y-3">
              {[
                { label: 'New messages', key: 'notifMessages' },
                { label: 'New likes', key: 'notifLikes' },
                { label: 'Profile visitors', key: 'notifVisits' },
                { label: 'Matches', key: 'notifMatches' },
                { label: 'Gifts received', key: 'notifGifts' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-1.5">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 border-red-100">
            <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-3"><Trash2 size={18} /> Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
            <button onClick={async () => {
              if (!confirm('Are you absolutely sure you want to delete your account? This cannot be undone.')) return
              if (!confirm('Final confirmation: Delete account permanently?')) return
              try {
                await fetch('/api/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                logout()
                toast.success('Account deleted')
              } catch { toast.error('Failed to delete account') }
            }} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">
              <Trash2 size={16} /> Delete My Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
