import { Link, useLocation } from 'wouter'
import { Home, Search, Flame, MessageCircle, User, Bell, Heart, Gift, Eye, Settings, Crown, Coins } from 'lucide-react'
import { getPhotoUrl } from '../../lib/utils'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/discover', icon: Search, label: 'Discover' },
  { href: '/meet', icon: Flame, label: 'Meet' },
  { href: '/likes', icon: Heart, label: 'Likes' },
  { href: '/chat', icon: MessageCircle, label: 'Chat' },
]

export default function MainNav() {
  const [location] = useLocation()
  const { user } = useAuth()
  const { unread, chatUnread } = useNotifications()

  return (
    <>
      {/* Top header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 h-14 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </div>
            <span className="font-bold text-gray-900 hidden sm:block text-sm">Rich <span className="text-brand-500">Dating</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(item => {
              const active = location.startsWith(item.href)
              const badge = item.href === '/chat' ? chatUnread : 0
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all relative ${active ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <item.icon size={17} />
                  {item.label}
                  {badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
            <Link href="/visitors"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${location.startsWith('/visitors') ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
              <Eye size={17} /> Visitors
            </Link>
            <Link href="/gifts"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${location.startsWith('/gifts') ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
              <Gift size={17} /> Gifts
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Credits indicator */}
            {user && user.fake !== 1 && (
              <Link href="/credits"
                className="hidden sm:flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors">
                💳 {user.credits || 0}
              </Link>
            )}

            {/* Premium badge */}
            {user?.premium === 1 && (
              <span className="hidden sm:flex items-center gap-1 bg-amber-500 text-white rounded-lg px-2.5 py-1.5 text-xs font-bold">
                <Crown size={11} /> VIP
              </span>
            )}

            {/* Notifications */}
            <Link href="/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
              <Bell size={19} />
              {unread > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>

            {/* Admin */}
            {user?.admin === 1 && (
              <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500" title="Admin Panel">
                <Settings size={18} />
              </Link>
            )}

            {/* Profile avatar */}
            <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-brand-200 hover:ring-brand-400 transition-all flex-shrink-0">
              <img
                src={getPhotoUrl(user?.photoThumb || user?.photo)}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={e => (e.currentTarget.src = '/images/default-avatar.svg')}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 md:hidden mobile-nav-safe shadow-lg">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(item => {
            const active = location.startsWith(item.href)
            const badge = item.href === '/chat' ? chatUnread : 0
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item pt-2 relative transition-colors ${active ? 'text-brand-500' : 'text-gray-400 hover:text-gray-600'}`}>
                <div className="relative">
                  {active && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-brand-50" />
                    </div>
                  )}
                  <div className="relative">
                    <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={active ? 'text-brand-500' : ''}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
