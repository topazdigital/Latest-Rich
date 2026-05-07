'use client'
import { useState } from 'react'
import { Mail, Loader2, Send, Users } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminEmails() {
  const [form, setForm] = useState({ to: 'all', subject: '', body: '', gender: 'all', premium: 'all' })
  const [sending, setSending] = useState(false)

  async function sendCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.body) return toast.error('Subject and body required')
    setSending(true)
    try {
      const res = await fetch('/api/admin/emails/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok) toast.success(`Campaign queued for ${data.count} users!`)
      else toast.error(data.error || 'Failed')
    } catch { toast.error('Failed') }
    finally { setSending(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Email Campaigns</h1>
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
            <Mail size={20} className="text-brand-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Send Bulk Email</h2>
            <p className="text-sm text-gray-500">Send emails to your members</p>
          </div>
        </div>
        <form onSubmit={sendCampaign} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Send To</label>
            <div className="grid grid-cols-3 gap-3">
              {[['all','All Users'],['real','Real Users'],['premium','Premium']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, to: v }))}
                  className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.to === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Subject</label>
            <input type="text" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field" placeholder="Email subject..." required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Message (HTML supported)</label>
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={8} className="input-field resize-none font-mono text-sm" placeholder="<h1>Hello!</h1><p>Your message here...</p>" required />
          </div>
          <button type="submit" disabled={sending} className="btn-primary w-full flex items-center justify-center gap-2 py-4">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send size={16} /> Send Campaign</>}
          </button>
        </form>
      </div>
      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-3">Campaign Templates</h3>
        <div className="space-y-2">
          {[
            { name: 'Welcome Back', subject: 'We miss you! Come back to Rich Dating Network', body: '<h2>Hey there! 👋</h2><p>It\'s been a while since we\'ve seen you. Come back and discover amazing matches waiting for you!</p><a href="https://richdatingnetwork.com" style="background:#FF192C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;font-weight:bold;">Find Matches Now</a>' },
            { name: 'New Matches', subject: 'You have new matches on Rich Dating Network! ❤️', body: '<h2>You have new potential matches!</h2><p>People are viewing your profile and liking you. Don\'t miss out — come see who\'s interested in you!</p>' },
            { name: 'Premium Offer', subject: 'Special offer: Get Premium at 50% off! 👑', body: '<h2>Exclusive Premium Offer!</h2><p>For a limited time, upgrade to Premium and get <strong>50% off</strong>. Unlock unlimited messages, see who viewed you, and more!</p>' },
          ].map(t => (
            <button key={t.name} onClick={() => setForm(p => ({ ...p, subject: t.subject, body: t.body }))}
              className="w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors">
              <p className="text-sm font-medium text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400 truncate">{t.subject}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
