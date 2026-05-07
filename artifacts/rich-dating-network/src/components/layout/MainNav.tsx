import { Link, useLocation } from 'wouter'
import { Home, Search, Flame, MessageCircle, Heart, Gift, Eye, Settings, Crown, Zap } from 'lucide-react'
import { getPhotoUrl } from '../../lib/utils'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import NotificationDropdown from './NotificationDropdown'

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
  const { chatUnread } = useNotifications()

  return (
    <>
      {/* Top header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        height: '3.5rem',
        boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 1rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <div style={{ width: '2rem', height: '2rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg,#FF192C,#ff5f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(255,25,44,0.3)' }}>
              <Heart size={14} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontWeight: 900, color: '#111827', fontSize: '0.9rem', letterSpacing: '-0.02em' }}>
              Rich <span style={{ color: '#FF192C' }}>Dating</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="desktop-nav">
            {navItems.map(item => {
              const active = location.startsWith(item.href)
              const badge = item.href === '/chat' ? chatUnread : 0
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 0.875rem', borderRadius: '0.75rem',
                  fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none',
                  position: 'relative', transition: 'all 0.15s',
                  background: active ? '#fff0f1' : 'transparent',
                  color: active ? '#FF192C' : '#6b7280',
                }}>
                  <item.icon size={15} />
                  {item.label}
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '16px', height: '16px', background: '#FF192C', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
            <Link href="/visitors" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', background: location.startsWith('/visitors') ? '#fff0f1' : 'transparent', color: location.startsWith('/visitors') ? '#FF192C' : '#6b7280' }}>
              <Eye size={15} /> Visitors
            </Link>
            <Link href="/gifts" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', background: location.startsWith('/gifts') ? '#fff0f1' : 'transparent', color: location.startsWith('/gifts') ? '#FF192C' : '#6b7280' }}>
              <Gift size={15} /> Gifts
            </Link>
          </nav>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {user && user.fake !== 1 && (
              <Link href="/boost" style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                borderRadius: '0.75rem', padding: '0.35rem 0.75rem',
                fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none', transition: 'all 0.15s',
                background: location.startsWith('/boost') ? 'linear-gradient(135deg,#f97316,#ef4444)' : '#fff7ed',
                color: location.startsWith('/boost') ? '#fff' : '#ea580c',
                border: location.startsWith('/boost') ? 'none' : '1px solid #fed7aa',
                boxShadow: location.startsWith('/boost') ? '0 3px 10px rgba(249,115,22,0.35)' : 'none',
              }} className="boost-btn">
                <Zap size={12} fill={location.startsWith('/boost') ? '#fff' : 'none'} /> Boost
              </Link>
            )}

            {user && user.fake !== 1 && (
              <Link href="/credits" style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                background: '#fffbeb', border: '1px solid #fde68a',
                color: '#b45309', borderRadius: '0.75rem', padding: '0.35rem 0.75rem',
                fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none',
              }} className="credits-btn">
                💳 {user.credits || 0}
              </Link>
            )}

            {user?.premium === 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: '0.75rem', padding: '0.35rem 0.75rem', fontSize: '0.72rem', fontWeight: 800 }} className="vip-badge">
                <Crown size={11} /> VIP
              </span>
            )}

            {/* Notification bell with dropdown */}
            <NotificationDropdown />

            {user?.admin === 1 && (
              <Link href="/admin" style={{ width: '2.25rem', height: '2.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', color: '#6b7280', textDecoration: 'none', transition: 'all 0.15s' }}
                title="Admin Panel">
                <Settings size={17} />
              </Link>
            )}

            <Link href="/profile" style={{ width: '2rem', height: '2rem', borderRadius: '50%', overflow: 'hidden', outline: '2px solid #ffc5c9', outlineOffset: '1px', flexShrink: 0, display: 'block' }}>
              <img
                src={getPhotoUrl(user?.photoThumb || user?.photo)}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg' }}
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
      }} className="mobile-nav">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: '4rem' }}>
          {navItems.map(item => {
            const active = location.startsWith(item.href)
            const badge = item.href === '/chat' ? chatUnread : 0
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.2rem', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.02em',
                textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', position: 'relative',
                color: active ? '#FF192C' : '#9ca3af', paddingTop: '0.5rem', transition: 'color 0.15s',
              }}>
                <div style={{ position: 'relative' }}>
                  {active && <div style={{ position: 'absolute', inset: '-6px', background: '#fff0f1', borderRadius: '0.75rem' }} />}
                  <div style={{ position: 'relative' }}>
                    <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '14px', height: '14px', background: '#FF192C', color: '#fff', fontSize: '9px', fontWeight: 800, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span style={{ color: active ? '#FF192C' : '#9ca3af' }}>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <style>{`
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .boost-btn { display: none !important; }
          .credits-btn { display: none !important; }
          .vip-badge { display: none !important; }
        }
        @media (min-width: 768px) {
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </>
  )
}
