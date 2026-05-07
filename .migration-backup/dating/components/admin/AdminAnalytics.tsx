'use client'
import { Users, MessageCircle, DollarSign, Globe } from 'lucide-react'

interface Props { stats: any }

export default function AdminAnalytics({ stats }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'New Users (7d)', value: stats.newUsersWeek, icon: <Users size={18} />, color: 'text-blue-500' },
          { label: 'New Users (30d)', value: stats.newUsersMonth, icon: <Users size={18} />, color: 'text-blue-600' },
          { label: 'Messages (7d)', value: stats.messagesWeek.toLocaleString(), icon: <MessageCircle size={18} />, color: 'text-green-500' },
          { label: 'Messages (30d)', value: stats.messagesMonth.toLocaleString(), icon: <MessageCircle size={18} />, color: 'text-green-600' },
          { label: 'Revenue (7d)', value: `$${(stats.revenueWeek || 0).toFixed(2)}`, icon: <DollarSign size={18} />, color: 'text-brand-500' },
          { label: 'Revenue (30d)', value: `$${(stats.revenueMonth || 0).toFixed(2)}`, icon: <DollarSign size={18} />, color: 'text-brand-600' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Globe size={18} className="text-brand-500" /> Top Countries</h3>
        <div className="space-y-2">
          {stats.topCountries?.map((c: any, i: number) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-4">{i+1}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-sm font-medium text-gray-700">{c.country || 'Unknown'}</span>
                  <span className="text-sm text-gray-500">{Number(c.cnt).toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full gradient-brand rounded-full" style={{ width: `${Math.min(100, (Number(c.cnt) / Number(stats.topCountries[0]?.cnt)) * 100)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
