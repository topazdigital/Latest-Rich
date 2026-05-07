'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Users, UserPlus, MessageCircle, CreditCard,
  Settings, Shield, BarChart3, Gift, Bell, Menu, X, Heart,
  Bot, Image, Flag, Mail, Zap, Crown, FileText
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/fake-users', icon: Bot, label: 'Fake Users' },
  { href: '/admin/chat', icon: MessageCircle, label: 'Chat Monitor' },
  { href: '/admin/photos', icon: Image, label: 'Photo Review' },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { href: '/admin/credits', icon: Crown, label: 'Credits & Premium' },
  { href: '/admin/gifts', icon: Gift, label: 'Gifts' },
  { href: '/admin/reports', icon: Flag, label: 'Reports' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { href: '/admin/emails', icon: Mail, label: 'Email Campaigns' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Site Settings' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 gradient-brand rounded-xl flex items-center justify-center shadow-md">
        {open ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-40 flex flex-col shadow-sm transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-5 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
              <Heart size={16} className="text-white fill-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Rich Dating</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className={`admin-nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}>
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <Link href="/home" className="admin-nav-item text-gray-500">
            <Zap size={18} /> Back to Site
          </Link>
        </div>
      </aside>
    </>
  )
}
