import { useState, useEffect } from 'react'
import { Link } from 'wouter'
import { Cookie, X } from 'lucide-react'

const STORAGE_KEY = 'rdn_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return
    const t = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(t)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'all')
    setVisible(false)
  }

  function necessary() {
    localStorage.setItem(STORAGE_KEY, 'necessary')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(calc(100vw - 2rem), 560px)',
        background: '#111827',
        borderRadius: '1.25rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(1rem); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div style={{
        width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem',
        background: 'rgba(255,25,44,0.15)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '0.1rem',
      }}>
        <Cookie size={16} color="#FF192C" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f9fafb', marginBottom: '0.3rem' }}>
          We use cookies
        </p>
        <p style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.5, marginBottom: '0.875rem' }}>
          We use cookies to improve your experience, remember your preferences, and keep you signed in.
          See our{' '}
          <Link href="/privacy" style={{ color: '#FF192C', textDecoration: 'underline' }}>
            Privacy Policy
          </Link>{' '}
          for details.
        </p>

        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={accept}
            style={{
              background: '#FF192C', color: '#fff', border: 'none',
              borderRadius: '0.75rem', padding: '0.5rem 1.1rem',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Accept All
          </button>
          <button
            onClick={necessary}
            style={{
              background: 'rgba(255,255,255,0.08)', color: '#d1d5db',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '0.75rem', padding: '0.5rem 1.1rem',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
          >
            Necessary Only
          </button>
        </div>
      </div>

      <button
        onClick={necessary}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6b7280', padding: '0.2rem', flexShrink: 0,
          borderRadius: '0.5rem', transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#d1d5db')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
        title="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}
