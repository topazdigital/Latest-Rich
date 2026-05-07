'use client'
import { useState } from 'react'
import { Bell, Send, Loader2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props { recent: any[] }

export default function AdminSendNotification({ recent }: Props) {
  const [form, setForm] = useState({ to: 'all', type: 'info', message: '', link: '' })
  const [sending, setSending] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) { toast.success(`Sent to ${data.count} users!`); setForm(p => ({ ...p, message: '' })) }
      else toast.error(data.error || 'Failed')
    } catch { toast.error('Failed') }
    finally { setSending(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
      <div className="card p-6">
        <form onSubmit={send} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Send To</label>
              <select value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} className="input-field">
                <option value="all">All Users</option>
                <option value="real">Real Users Only</option>
                <option value="premium">Premium Members</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                <option value="info">Info</option>
                <option value="like">Like</option>
                <option value="message">Message</option>
                <option value="premium">Premium</option>
                <option value="gift">Gift</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} className="input-field resize-none" placeholder="Notification message..." required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Link (optional)</label>
            <input type="text" value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} className="input-field" placeholder="/profile/123 or /premium" />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send size={16} /> Send Notification</>}
          </button>
        </form>
      </div>
      <div className="card">
        <div className="p-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900">Recent Notifications</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.map(n => (
            <div key={n.id} className="flex items-start gap-3 p-4">
              <Bell size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{n.message}</p>
                <p className="text-xs text-gray-400">{timeAgo(n.time)} · UID: {n.uid}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
