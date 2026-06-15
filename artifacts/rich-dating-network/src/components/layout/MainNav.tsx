import { Link, useLocation } from 'wouter'
import { Search, Flame, MessageCircle, Heart, Gift, Eye, Settings, Crown, Zap, Users, LogOut, User } from 'lucide-react'
import { getPhotoUrl, isOnline } from '../../lib/utils'
import { useNotifications } from '../../hooks/useNotifications'
import { useAuth } from '../../hooks/useAuth'
import NotificationDropdown from './NotificationDropdown'
import { useEffect, useState, useRef } from 'react'

export default function MainNav() {
  const [location] = useLocation()
  const { user, logout } = useAuth()
  const { chatUnread } = useNotifications()
  const [feedEnabled, setFeedEnabled] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    fetch('/api/branding/public').then(r => r.json()).then((d: Record<string, string>) => {
      setFeedEnabled(d.feed_enabled === '1')
    }).catch(() => {})
  }, [])

  const navItems = [
    ...(feedEnabled ? [{ href: '/home', icon: Heart, label: 'Feed' }] : []),
    { href: '/discover', icon: Search, label: 'Discover' },
    { href: '/meet', icon: Flame, label: 'Meet' },
    { href: '/likes', icon: Heart, label: 'Likes' },
    { href: '/chat', icon: MessageCircle, label: 'Chat' },
  ]

  const mobileItems = [
    { href: '/discover', icon: Search, label: 'Discover' },
    { href: '/meet', icon: Flame, label: 'Meet' },
    { href: '/likes', icon: Heart, label: 'Likes' },
    { href: '/visitors', icon: Eye, label: 'Visitors' },
    { href: '/chat', icon: MessageCircle, label: 'Chat', badge: chatUnread },
  ]

  return (
    <>
      {/* Top header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        height: '3rem',
        boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 0.75rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/discover" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}>
            <div style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg,#FF192C,#ff5f6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(255,25,44,0.3)' }}>
              <Heart size={12} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontWeight: 900, color: '#111827', fontSize: '0.82rem', letterSpacing: '-0.02em' }}>
              Rich <span style={{ color: '#FF192C' }}>Dating</span> Network
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }} className="desktop-nav">
            {navItems.map(item => {
              const active = location.startsWith(item.href)
              const badge = item.href === '/chat' ? chatUnread : 0
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.7rem', borderRadius: '0.6rem',
                  fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
                  position: 'relative', transition: 'all 0.15s',
                  background: active ? '#fff0f1' : 'transparent',
                  color: active ? '#FF192C' : '#6b7280',
                }}>
                  <item.icon size={14} />
                  {item.label}
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '15px', height: '15px', background: '#FF192C', color: '#fff', fontSize: '9px', fontWeight: 800, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </Link>
              )
            })}
            <Link href="/visitors" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '0.6rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', background: location.startsWith('/visitors') ? '#fff0f1' : 'transparent', color: location.startsWith('/visitors') ? '#FF192C' : '#6b7280' }}>
              <Eye size={14} /> Visitors
            </Link>
            <Link href="/gifts" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '0.6rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', background: location.startsWith('/gifts') ? '#fff0f1' : 'transparent', color: location.startsWith('/gifts') ? '#FF192C' : '#6b7280' }}>
              <Gift size={14} /> Gifts
            </Link>
            <Link href="/referrals" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.7rem', borderRadius: '0.6rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', transition: 'all 0.15s', background: location.startsWith('/referrals') ? '#fff0f1' : 'transparent', color: location.startsWith('/referrals') ? '#FF192C' : '#6b7280' }}>
              <Users size={14} /> Referrals
            </Link>
          </nav>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {user && user.fake !== 1 && (
              <Link href="/boost" style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                borderRadius: '0.6rem', padding: '0.3rem 0.6rem',
                fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none', transition: 'all 0.15s',
                background: location.startsWith('/boost') ? 'linear-gradient(135deg,#f97316,#ef4444)' : '#fff7ed',
                color: location.startsWith('/boost') ? '#fff' : '#ea580c',
                border: location.startsWith('/boost') ? 'none' : '1px solid #fed7aa',
              }} className="boost-btn">
                <Zap size={11} fill={location.startsWith('/boost') ? '#fff' : 'none'} /> Boost
              </Link>
            )}

            {user && user.fake !== 1 && (
              <Link href="/credits" style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: '#fffbeb', border: '1px solid #fde68a',
                color: '#b45309', borderRadius: '0.6rem', padding: '0.3rem 0.6rem',
                fontSize: '0.72rem', fontWeight: 800, textDecoration: 'none',
              }} className="credits-btn">
                💳 {user.credits || 0}
              </Link>
            )}

            {user?.premium === 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: '0.6rem', padding: '0.3rem 0.6rem', fontSize: '0.68rem', fontWeight: 800 }} className="vip-badge">
                <Crown size={10} /> VIP
              </span>
            )}

            <NotificationDropdown />

            {(user?.admin ?? 0) >= 1 && (
              <Link href={(user?.admin ?? 0) >= 2 ? "/admin" : "/moderator"} style={{ width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.6rem', color: '#6b7280', textDecoration: 'none', transition: 'all 0.15s' }}
                title={(user?.admin ?? 0) >= 2 ? "Admin Panel" : "Moderator Panel"}>
                <Settings size={16} />
              </Link>
            )}

            <div ref={profileMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                style={{ width: '1.875rem', height: '1.875rem', borderRadius: '50%', overflow: 'hidden', outline: `2px solid ${isOnline(user?.lastAccess) ? '#22c55e' : '#ffc5c9'}`, outlineOffset: '1px', flexShrink: 0, display: 'block', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}>
                <img
                  src={getPhotoUrl(user?.photoThumb || user?.photo)}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg' }}
                />
              </button>
              {isOnline(user?.lastAccess) && (
                <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '8px', height: '8px', background: '#22c55e', border: '1.5px solid #fff', borderRadius: '50%' }} />
              )}
              {showProfileMenu && (
                <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', borderRadius: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #f3f4f6', minWidth: '160px', zIndex: 100, overflow: 'hidden', padding: '0.375rem' }}>
                  <Link href="/profile" onClick={() => setShowProfileMenu(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textDecoration: 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <User size={14} /> My Profile
                  </Link>
                  <Link href="/settings" onClick={() => setShowProfileMenu(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textDecoration: 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f9fafb'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <Settings size={14} /> Settings
                  </Link>
                  <div style={{ height: '1px', background: '#f3f4f6', margin: '0.25rem 0' }} />
                  <button
                    onClick={() => { logout(); setShowProfileMenu(false); window.location.href = '/login' }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: 600, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fef2f2'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }} className="mobile-nav">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', height: '3.25rem' }}>
          {mobileItems.map(item => {
            const active = location.startsWith(item.href)
            const badge = (item as any).badge || 0
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '0.2rem', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.03em',
                textTransform: 'uppercase', cursor: 'pointer', textDecoration: 'none', position: 'relative',
                color: active ? '#FF192C' : '#9ca3af', transition: 'color 0.15s',
              }}>
                <div style={{ position: 'relative' }}>
                  {active && (
                    <div style={{ position: 'absolute', inset: '-6px -8px', background: 'rgba(255,25,44,0.08)', borderRadius: '0.75rem' }} />
                  )}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={19} strokeWidth={active ? 2.5 : 1.8} />
                    {badge > 0 && (
                      <span style={{ position: 'absolute', top: '-5px', right: '-6px', minWidth: '14px', height: '14px', background: '#FF192C', color: '#fff', fontSize: '8px', fontWeight: 800, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', border: '1.5px solid #fff' }}>
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color: active ? '#FF192C' : '#9ca3af', fontSize: '0.48rem', fontWeight: active ? 700 : 500 }}>{item.label}</span>
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
