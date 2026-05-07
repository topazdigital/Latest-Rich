'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Home, Search, Heart, MessageCircle, User, Bell, Flame } from 'lucide-react'
import { getPhotoUrl } from '@/lib/utils'
import { useNotifications } from '@/hooks/useNotifications'

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/discover', icon: Search, label: 'Discover' },
  { href: '/meet', icon: Flame, label: 'Meet' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
  { href: '/profile', icon: User, label: 'Profile' },
]

export default function MainNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { unread, chatUnread } = useNotifications()

  return (
    <>
      {/* Top bar (desktop + mobile) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-14">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block">Rich <span className="text-brand-500">Dating</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const active = pathname.startsWith(item.href)
              const badge = item.href === '/chat' ? chatUnread : 0
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${active ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <item.icon size={18} />
                  {item.label}
                  {badge > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              {unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <Link href="/settings" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-brand-200 hover:ring-brand-400 transition-all">
              <img src={getPhotoUrl((session?.user as any)?.image)} alt="avatar" className="w-full h-full object-cover" />
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            const badge = item.href === '/chat' ? chatUnread : 0
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item pt-2 relative ${active ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className="relative">
                  <item.icon size={22} className={active ? 'fill-brand-50' : ''} />
                  {badge > 0 && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-500 text-white text-[10px] rounded-full flex items-center justify-center">{badge > 9 ? '9+' : badge}</span>}
                </div>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
