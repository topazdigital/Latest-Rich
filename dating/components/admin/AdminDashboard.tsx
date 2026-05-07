'use client'
import Link from 'next/link'
import { Users, Bot, Crown, DollarSign, MessageCircle, Camera, Flag, TrendingUp, UserCheck, Zap } from 'lucide-react'
import { getPhotoUrl, timeAgo } from '@/lib/utils'

interface Props { stats: any; recentUsers: any[]; recentOrders: any[] }

export default function AdminDashboard({ stats, recentUsers, recentOrders }: Props) {
  const cards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: <Users size={20} />, color: 'bg-blue-500', link: '/admin/users' },
    { label: 'Real Users', value: stats.realUsers.toLocaleString(), icon: <UserCheck size={20} />, color: 'bg-green-500', link: '/admin/users?type=real' },
    { label: 'Fake Profiles', value: stats.fakeUsers.toLocaleString(), icon: <Bot size={20} />, color: 'bg-purple-500', link: '/admin/fake-users' },
    { label: 'Premium Members', value: stats.premiumUsers.toLocaleString(), icon: <Crown size={20} />, color: 'bg-gold-500', link: '/admin/users?type=premium' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue}`, icon: <DollarSign size={20} />, color: 'bg-brand-500', link: '/admin/payments' },
    { label: 'Total Messages', value: stats.totalMessages.toLocaleString(), icon: <MessageCircle size={20} />, color: 'bg-cyan-500', link: '/admin/chat' },
    { label: 'Pending Photos', value: stats.pendingPhotos.toString(), icon: <Camera size={20} />, color: stats.pendingPhotos > 0 ? 'bg-yellow-500' : 'bg-gray-400', link: '/admin/photos' },
    { label: 'Open Reports', value: stats.openReports.toString(), icon: <Flag size={20} />, color: stats.openReports > 0 ? 'bg-red-500' : 'bg-gray-400', link: '/admin/reports' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {stats.onlineUsers} online now
          </span>
          <span className="text-sm text-gray-500">+{stats.todayUsers} today</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <Link key={i} href={card.link} className="card p-5 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
              <TrendingUp size={14} className="text-gray-300" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/fake-users" className="card p-5 flex items-center gap-4 hover:shadow-md transition-all bg-gradient-to-br from-purple-50 to-white">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Bot size={22} className="text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Fake User Generator</p>
            <p className="text-sm text-gray-500">Create AI profiles in bulk</p>
          </div>
        </Link>
        <Link href="/admin/settings" className="card p-5 flex items-center gap-4 hover:shadow-md transition-all bg-gradient-to-br from-blue-50 to-white">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Zap size={22} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Site Settings</p>
            <p className="text-sm text-gray-500">Configure APIs & payments</p>
          </div>
        </Link>
        <Link href="/admin/emails" className="card p-5 flex items-center gap-4 hover:shadow-md transition-all bg-gradient-to-br from-green-50 to-white">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <MessageCircle size={22} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Email Campaign</p>
            <p className="text-sm text-gray-500">Send bulk notifications</p>
          </div>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="card">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Users</h3>
            <Link href="/admin/users" className="text-sm text-brand-500 hover:text-brand-600">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.map(user => (
              <div key={user.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={getPhotoUrl(user.photo)} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
                    {user.fake === 1 && <span className="badge bg-purple-100 text-purple-600">Bot</span>}
                    {user.premium === 1 && <span className="badge bg-yellow-100 text-yellow-600">VIP</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.country}</p>
                </div>
                <Link href={`/admin/users/${user.id}`} className="text-xs text-brand-500 hover:underline">Edit</Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="card">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Recent Payments</h3>
            <Link href="/admin/payments" className="text-sm text-brand-500 hover:text-brand-600">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 p-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{order.user?.name}</p>
                  <p className="text-xs text-gray-400">{order.gateway} · {order.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">${order.amount}</p>
                  <span className={`badge text-xs ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{order.status}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No payments yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
