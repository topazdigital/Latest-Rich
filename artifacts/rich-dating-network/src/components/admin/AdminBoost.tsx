import { useState, useEffect } from 'react'
import { Zap, Save, Loader2, Clock, Coins, Users } from 'lucide-react'
import { authFetch } from '../../lib/auth'
import toast from 'react-hot-toast'
import { getPhotoUrl } from '../../lib/utils'

interface BoostRecord {
  boost: { id: number; userId: number; startTime: number; endTime: number; creditsSpent: number; active: number }
  user: { id: number; name: string; email: string; photo: string } | null
}

export default function AdminBoost() {
  const [config, setConfig] = useState({ boost_credits: '50', boost_duration_minutes: '30' })
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<BoostRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    authFetch('/api/admin/config').then(r => r.json()).then(data => {
      setConfig(prev => ({
        boost_credits: data.boost_credits || prev.boost_credits,
        boost_duration_minutes: data.boost_duration_minutes || prev.boost_duration_minutes,
      }))
    }).catch(() => {})

    authFetch('/api/boost/history').then(r => r.json()).then(data => {
      setHistory(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoadingHistory(false))
  }, [])

  async function saveConfig() {
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (res.ok) toast.success('Boost settings saved!')
      else toast.error('Failed to save')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  function timeAgo(ts: number) {
    const diff = Math.floor(Date.now() / 1000) - ts
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(ts * 1000).toLocaleDateString()
  }

  function isActive(b: BoostRecord['boost']) {
    return b.active === 1 && b.endTime > Math.floor(Date.now() / 1000)
  }

  return (
    <div className="space-y-6">
      {/* Config card */}
      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Zap size={20} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-gray-900 font-bold">Boost Configuration</h2>
            <p className="text-gray-400 text-sm">Set the price and duration for profile boosts</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
              <Coins size={14} className="text-amber-400" /> Credits Required
            </label>
            <input
              type="number"
              min={1}
              value={config.boost_credits}
              onChange={e => setConfig(p => ({ ...p, boost_credits: e.target.value }))}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
              placeholder="50"
            />
            <p className="text-xs text-gray-500 mt-1.5">Credits a user must spend to activate a boost</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
              <Clock size={14} className="text-blue-400" /> Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={config.boost_duration_minutes}
              onChange={e => setConfig(p => ({ ...p, boost_duration_minutes: e.target.value }))}
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
              placeholder="30"
            />
            <p className="text-xs text-gray-500 mt-1.5">How long a boost stays active</p>
          </div>
        </div>

        <div className="bg-gray-100/50 rounded-xl p-4 mb-5 text-sm text-gray-400 border border-gray-200">
          <strong className="text-gray-200">Preview:</strong> Users pay <span className="text-orange-400 font-bold">{config.boost_credits} credits</span> for <span className="text-blue-400 font-bold">{config.boost_duration_minutes} minutes</span> of top placement in the discovery feed.
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save Settings
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Boosts', value: history.length, icon: Zap, color: 'text-orange-400' },
          { label: 'Active Now', value: history.filter(h => isActive(h.boost)).length, icon: Users, color: 'text-green-400' },
          { label: 'Credits Earned', value: history.reduce((s, h) => s + (h.boost.creditsSpent || 0), 0), icon: Coins, color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-center">
            <s.icon size={20} className={`${s.color} mx-auto mb-2`} />
            <div className="text-2xl font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-gray-900 font-bold flex items-center gap-2">
            <Clock size={16} className="text-gray-400" /> Boost History
          </h3>
        </div>
        {loadingHistory ? (
          <div className="p-8 flex justify-center"><Loader2 size={24} className="animate-spin text-gray-500" /></div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No boosts yet</div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {history.map((record) => (
              <div key={record.boost.id} className="flex items-center gap-4 p-4 hover:bg-gray-100/30 transition-colors">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {record.user?.photo ? (
                    <img src={getPhotoUrl(record.user.photo)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-sm">
                      {record.user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-medium text-sm truncate">{record.user?.name || 'Unknown'}</span>
                    {isActive(record.boost) && (
                      <span className="flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{record.user?.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                    <Coins size={12} /> {record.boost.creditsSpent}
                  </div>
                  <div className="text-xs text-gray-500">{timeAgo(record.boost.startTime)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
