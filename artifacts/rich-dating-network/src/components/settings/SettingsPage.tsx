import { useState, useRef } from 'react'
import { User, Camera, Lock, LogOut, Save, Loader2, X, Shield, Trash2, Bell, MapPin } from 'lucide-react'
import { getPhotoUrl } from '../../lib/utils'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import LocationAutocomplete from '../ui/LocationAutocomplete'

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
    countryCode: initialUser?.countryCode || '',
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
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Profile' && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field" />
            </div>
            <div className="col-span-full">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Bio</label>
              <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
                rows={3} placeholder="Tell people about yourself..."
                className="input-field resize-none" />
            </div>

            {/* Location with autocomplete */}
            <div className="col-span-full">
              <LocationAutocomplete
                label="City"
                value={form.city}
                country={form.country}
                onChange={(city, country, countryCode) => {
                  setForm(p => ({ ...p, city, country: country || p.country, countryCode: countryCode || p.countryCode }))
                }}
                placeholder="Search your city..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country</label>
              <input type="text" value={form.country} onChange={e => update('country', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Birthday</label>
              <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} className="input-field"
                max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0,10)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Looking For</label>
              <select value={form.looking} onChange={e => update('looking', e.target.value)} className="input-field">
                <option value="1">Men</option>
                <option value="2">Women</option>
                <option value="3">Everyone</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />
          <h3 className="text-sm font-semibold text-gray-700">More About You</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Occupation</label>
              <input type="text" value={form.occupation} onChange={e => update('occupation', e.target.value)} className="input-field" placeholder="e.g. Entrepreneur" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Education</label>
              <input type="text" value={form.education} onChange={e => update('education', e.target.value)} className="input-field" placeholder="e.g. Masters Degree" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Height</label>
              <input type="text" value={form.height} onChange={e => update('height', e.target.value)} className="input-field" placeholder="e.g. 5'10&quot;" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Body Type</label>
              <select value={form.bodyType} onChange={e => update('bodyType', e.target.value)} className="input-field">
                <option value="">Select...</option>
                {['Slim', 'Athletic', 'Average', 'Curvy', 'Full figured'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Ethnicity</label>
              <select value={form.ethnicity} onChange={e => update('ethnicity', e.target.value)} className="input-field">
                <option value="">Prefer not to say</option>
                {['Asian', 'Black/African', 'Caucasian', 'Hispanic/Latino', 'Middle Eastern', 'Mixed', 'Native American', 'Pacific Islander', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Religion</label>
              <select value={form.religion} onChange={e => update('religion', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                {['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Smoking</label>
              <select value={form.smoking} onChange={e => update('smoking', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                {['Never', 'Occasionally', 'Socially', 'Regularly'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Drinking</label>
              <select value={form.drinking} onChange={e => update('drinking', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                {['Never', 'Occasionally', 'Socially', 'Regularly'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Children</label>
              <select value={form.children} onChange={e => update('children', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                {['No children', 'Have children', 'Want children', 'Don\'t want children', 'Open to it'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Relationship Goal</label>
              <select value={form.relationship} onChange={e => update('relationship', e.target.value)} className="input-field">
                <option value="">Not specified</option>
                {['Long-term', 'Short-term', 'Casual', 'Marriage', 'Friendship', 'Open to anything'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Profile
          </button>
        </div>
      )}

      {tab === 'Photos' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">My Photos</h3>
              <p className="text-sm text-gray-500 mt-0.5">Upload up to 10 photos</p>
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
              Add Photo
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {photos.map((p: any) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden group shadow-sm">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => deletePhoto(p.id)}
                    className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <button onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-brand-400 hover:bg-brand-50 transition-all col-span-2">
                <Camera size={24} className="text-gray-300 mb-2" />
                <span className="text-xs text-gray-400">Upload your first photo</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          <p className="text-xs text-gray-400 mt-4">Photos are reviewed before being shown publicly. Supported formats: JPG, PNG, WebP</p>
        </div>
      )}

      {tab === 'Password' && (
        <div className="card p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Lock size={17} className="text-brand-500" /> Change Password</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Current Password</label>
            <input type="password" value={pass.current} onChange={e => setPass(p => ({ ...p, current: e.target.value }))} className="input-field" placeholder="••••••••" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</label>
            <input type="password" value={pass.newPass} onChange={e => setPass(p => ({ ...p, newPass: e.target.value }))} className="input-field" placeholder="Min. 6 characters" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm New Password</label>
            <input type="password" value={pass.confirm} onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} className="input-field" placeholder="Repeat new password" />
          </div>
          <button onClick={changePassword} disabled={saving || !pass.current || !pass.newPass || !pass.confirm}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            Change Password
          </button>
          <hr className="border-gray-100" />
          <button onClick={logout} className="flex items-center gap-2 text-red-500 text-sm font-semibold hover:text-red-600 transition-colors">
            <LogOut size={16} /> Sign Out of Account
          </button>
        </div>
      )}

      {tab === 'Privacy' && (
        <div className="space-y-4">
          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Shield size={17} className="text-brand-500" /> Privacy Settings</h3>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Show online status', desc: 'Let others see when you are active', key: 'showOnline' },
                { label: 'Show profile visitors', desc: 'Allow others to see that you viewed their profile', key: 'showVisits' },
                { label: 'Allow messages from all members', desc: 'Let any member send you messages', key: 'openMessages' },
                { label: 'Show distance/location', desc: 'Display your city on your profile', key: 'showLocation' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Bell size={17} className="text-brand-500" /> Notifications</h3>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'New messages', key: 'notifMessages' },
                { label: 'New likes', key: 'notifLikes' },
                { label: 'Profile visitors', key: 'notifVisits' },
                { label: 'Matches', key: 'notifMatches' },
                { label: 'Gifts received', key: 'notifGifts' },
                { label: 'Marketing emails', key: 'notifMarketing' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2.5">
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input type="checkbox" className="sr-only peer" defaultChecked={item.key !== 'notifMarketing'} />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 border border-red-100">
            <h3 className="font-semibold text-red-600 flex items-center gap-2 mb-2"><Trash2 size={17} /> Danger Zone</h3>
            <p className="text-sm text-gray-500 mb-4">Permanently delete your account. This action is irreversible.</p>
            <button onClick={async () => {
              if (!confirm('Are you sure you want to permanently delete your account?')) return
              if (!confirm('This will delete all your data, messages, and matches. Continue?')) return
              try {
                await fetch('/api/users/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                logout()
                toast.success('Account deleted')
              } catch { toast.error('Failed to delete account') }
            }} className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-200">
              <Trash2 size={15} /> Delete My Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
