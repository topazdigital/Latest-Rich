'use client'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { Bell, Heart, MessageCircle, Eye, Gift, Crown, Star } from 'lucide-react'

const ICONS: Record<string, any> = {
  like: <Heart size={18} className="text-brand-500" />,
  match: <Heart size={18} className="text-red-500 fill-red-500" />,
  message: <MessageCircle size={18} className="text-blue-500" />,
  visit: <Eye size={18} className="text-gray-500" />,
  gift: <Gift size={18} className="text-yellow-500" />,
  premium: <Crown size={18} className="text-gold-500" />,
  superlike: <Star size={18} className="text-blue-500" />,
}

interface Props { notifications: any[] }

export default function NotificationsPage({ notifications }: Props) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="section-title mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No notifications yet</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {notifications.map(n => (
            <Link key={n.id} href={n.link || '#'}
              className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${n.read === 0 ? 'bg-brand-50/50' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                {ICONS[n.type] || <Bell size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.time)}</p>
              </div>
              {n.read === 0 && <div className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
