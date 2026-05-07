'use client'
import { useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { User, Camera, Lock, Bell, Shield, LogOut, Trash2, Save, Loader2, Upload, X, Check } from 'lucide-react'
import { getPhotoUrl, genderLabel } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Props { user: any }
const TABS = ['Profile', 'Photos', 'Password', 'Preferences', 'Privacy']

export default function SettingsPage({ user }: Props) {
  const [tab, setTab] = useState('Profile')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio?.replace(/<[^>]*>/g, '') || '',
    city: user?.city || '',
    country: user?.country || '',
    birthday: user?.birthday || '',
    looking: String(user?.looking || 1),
    occupation: user?.userExtended?.occupation || '',
    education: user?.userExtended?.education || '',
    height: user?.userExtended?.height || '',
    bodyType: user?.userExtended?.bodyType || '',
    ethnicity: user?.userExtended?.ethnicity || '',
    religion: user?.userExtended?.religion || '',
    smoking: user?.userExtended?.smoking || '',
    drinking: user?.userExtended?.drinking || '',
    children: user?.userExtended?.children || '',
    relationship: user?.userExtended?.relationship || '',
  })
  const [pass, setPass] = useState({ current: '', newPass: '', confirm: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [photos, setPhotos] = useState(user?.photos || [])

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) toast.success('Profile saved!')
      else toast.error('Failed to save')
    } catch { toast.error('Error saving') }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (pass.newPass !== pass.confirm) return toast.error('Passwords do not match')
    if (pass.newPass.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      const res = await fetch('/api/users/me/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pass) })
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
      const res = await fetch('/api/photos/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { setPhotos((p: any[]) => [...p, data.photo]); toast.success('Photo uploaded!') }
      else toast.error(data.error || 'Upload failed')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  async function deletePhoto(photoId: number) {
    try {
      await fetch(`/api/photos/${photoId}`, { method: 'DELETE' })
      setPhotos((p: any[]) => p.filter(ph => ph.id !== photoId))
      toast.success('Photo deleted')
    } catch { toast.error('Failed') }
  }

  async function setPrimary(photoId: number) {
    try {
      await fetch(`/api/photos/${photoId}/primary`, { method: 'PUT' })
      setPhotos((p: any[]) => p.map(ph => ({ ...ph, isPrimary: ph.id === photoId ? 1 : 0 })))
      toast.success('Profile photo updated!')
    } catch { toast.error('Failed') }
  }

  const selectOptions: Record<string, string[]> = {
    looking: ['Men', 'Women', 'Both'],
    education: ['High School', 'Some College', "Bachelor's", "Master's", 'PhD', 'Trade School'],
    bodyType: ['Slim', 'Athletic', 'Average', 'Curvy', 'Heavy-set'],
    smoking: ['Non-smoker', 'Smoker', 'Occasionally'],
    drinking: ['Non-drinker', 'Social drinker', 'Regularly'],
    children: ['No children', 'Have children', 'Want children', "Don't want"],
    relationship: ['Single', 'Divorced', 'Widowed', 'Separated'],
    ethnicity: ['Asian', 'Black', 'Hispanic', 'White', 'Mixed', 'Other'],
    religion: ['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Atheist', 'Other'],
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="section-title mb-6">Settings</h1>

      {/* Avatar */}
      <div className="card p-5 mb-6 flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-brand-200">
            <img src={getPhotoUrl(user?.photoThumb || user?.photo)} alt={user?.name} className="w-full h-full object-cover" />
          </div>
          <label className="absolute bottom-0 right-0 w-7 h-7 gradient-brand rounded-full flex items-center justify-center cursor-pointer shadow-md">
            <Camera size={14} className="text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </label>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <div className="flex gap-2 mt-2">
            {user?.premium === 1 && <span className="badge bg-gold-100 text-gold-600">👑 VIP</span>}
            {user?.verified === 1 && <span className="badge bg-blue-100 text-blue-600">✓ Verified</span>}
            <span className="badge bg-brand-50 text-brand-600">{user?.credits || 0} credits</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'Profile' && (
        <div className="card p-5 space-y-4">
          {[
            { k: 'name', l: 'Display Name', t: 'text' },
            { k: 'city', l: 'City', t: 'text' },
            { k: 'country', l: 'Country', t: 'text' },
            { k: 'birthday', l: 'Birthday', t: 'date' },
          ].map(f => (
            <div key={f.k}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{f.l}</label>
              <input type={f.t} value={(form as any)[f.k]} onChange={e => update(f.k, e.target.value)} className="input-field" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">About Me</label>
            <textarea value={form.bio} onChange={e => update('bio', e.target.value)} rows={4} className="input-field resize-none" placeholder="Tell people about yourself..." />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Looking for</label>
            <select value={form.looking} onChange={e => update('looking', e.target.value)} className="input-field">
              <option value="1">Men</option><option value="2">Women</option><option value="0">Both</option>
            </select>
          </div>
          <h3 className="font-semibold text-gray-900 pt-2 border-t border-gray-100">Extended Profile</h3>
          {Object.entries(selectOptions).filter(([k]) => k !== 'looking').map(([k, opts]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block capitalize">{k.replace(/([A-Z])/g, ' $1')}</label>
              <select value={(form as any)[k]} onChange={e => update(k, e.target.value)} className="input-field">
                <option value="">Prefer not to say</option>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {['occupation', 'height'].map(k => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block capitalize">{k}</label>
              <input type="text" value={(form as any)[k]} onChange={e => update(k, e.target.value)} className="input-field" placeholder={k === 'height' ? 'e.g. 5\'10"' : ''} />
            </div>
          ))}
          <button onClick={saveProfile} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save size={16} /> Save Profile</>}
          </button>
        </div>
      )}

      {/* Photos tab */}
      {tab === 'Photos' && (
        <div className="card p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {photos.map((p: any) => (
              <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => setPrimary(p.id)} title="Set as main" className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Check size={14} className={p.isPrimary ? 'text-green-500' : 'text-gray-600'} />
                  </button>
                  <button onClick={() => deletePhoto(p.id)} className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
                {p.isPrimary === 1 && <div className="absolute top-1 left-1 bg-brand-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">Main</div>}
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all">
              {uploading ? <Loader2 size={24} className="animate-spin text-brand-500" /> : <><Upload size={24} className="text-gray-400 mb-1" /><span className="text-xs text-gray-400">Add Photo</span></>}
              <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-gray-400 text-center">Upload up to 10 photos. First photo is your profile picture.</p>
        </div>
      )}

      {/* Password tab */}
      {tab === 'Password' && (
        <div className="card p-5 space-y-4">
          {[['current', 'Current Password'], ['newPass', 'New Password'], ['confirm', 'Confirm New Password']].map(([k, l]) => (
            <div key={k}>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">{l}</label>
              <input type="password" value={(pass as any)[k]} onChange={e => setPass(p => ({ ...p, [k]: e.target.value }))} className="input-field" />
            </div>
          ))}
          <button onClick={changePassword} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock size={16} />} Change Password
          </button>
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'Preferences' && (
        <div className="card p-5 space-y-4">
          <p className="text-sm text-gray-500">Notification and display preferences coming soon.</p>
        </div>
      )}

      {/* Privacy tab */}
      {tab === 'Privacy' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Account Actions</h3>
            <div className="space-y-3">
              <Link href="/credits" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700">
                💳 <span>Buy Credits</span>
              </Link>
              <Link href="/premium" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-gray-700">
                👑 <span>Upgrade to Premium</span>
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 transition-colors text-red-500 w-full text-left">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
          <div className="card p-5 border border-red-100">
            <h3 className="font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-3">Permanently delete your account and all data.</p>
            <button className="text-sm text-red-500 hover:text-red-700 flex items-center gap-2 font-medium">
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
