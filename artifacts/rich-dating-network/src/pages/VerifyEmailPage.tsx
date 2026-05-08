import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { setStoredAuth } from '../lib/auth'

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation()
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('pending')
  const [message, setMessage] = useState('')
  const [resending, setResending] = useState(false)
  const [resendEmail, setResendEmail] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      verifyToken(token)
    } else {
      setStatus('pending')
    }
  }, [])

  async function verifyToken(token: string) {
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      } else {
        setStatus('success')
        setMessage(data.message || 'Email verified!')
        if (data.token && data.user) {
          setStoredAuth({ token: data.token, user: data.user })
          toast.success('Email verified! Welcome back 🎉')
          setTimeout(() => setLocation('/discover'), 2000)
        }
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail && !user?.email) { toast.error('Enter your email'); return }
    setResending(true)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail || user?.email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Verification email sent! Check your inbox.')
      } else {
        toast.error(data.error || 'Failed to resend')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF192C, transparent)' }} />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14 justify-center">
          <div className="text-6xl mb-6">✉️</div>
          <h2 className="text-4xl font-black text-white mb-4">Almost there!</h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            Verifying your email keeps your account safe and helps us confirm you're a real person — not a bot.
          </p>
          <div className="mt-10 space-y-3">
            {['Your account stays protected', 'Unlock full access instantly', 'Get matches from real people'].map((t, i) => (
              <div key={i} className="flex items-center gap-3 text-white/60 text-sm">
                <CheckCircle size={16} className="text-green-400 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="max-w-md mx-auto w-full">
          <div className="lg:hidden mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-gray-900">Rich Dating</span>
            </Link>
          </div>

          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900">Verifying your email...</h1>
              <p className="text-gray-500 mt-2">Just a moment</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">Verified! 🎉</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              <p className="text-sm text-gray-400">Redirecting you to your matches...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-3">Link Expired</h1>
              <p className="text-gray-500 mb-8">{message} Please request a new verification link.</p>
              <form onSubmit={handleResend} className="space-y-4 text-left">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Your email address</label>
                  <input type="email" value={resendEmail || user?.email || ''} onChange={e => setResendEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-gray-50"
                    placeholder="your@email.com" required />
                </div>
                <button type="submit" disabled={resending}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {resending && <Loader2 size={17} className="animate-spin" />}
                  Resend Verification Email
                </button>
              </form>
            </div>
          )}

          {status === 'pending' && (
            <div className="py-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
                <Mail className="w-8 h-8 text-brand-500" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">Check your inbox</h1>
              <p className="text-gray-500 mb-2 text-base leading-relaxed">
                We sent a verification email to <strong>{user?.email || 'your email'}</strong>.
                Click the link in that email to verify your account and start meeting people!
              </p>
              <p className="text-gray-400 text-sm mb-8">Can't find it? Check your spam folder.</p>

              <form onSubmit={handleResend} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Didn't receive it? Resend to:</label>
                  <input type="email" value={resendEmail || user?.email || ''} onChange={e => setResendEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-gray-50"
                    placeholder="your@email.com" required />
                </div>
                <button type="submit" disabled={resending}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {resending && <Loader2 size={17} className="animate-spin" />}
                  Resend Email
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                <Link href="/discover" className="text-brand-500 hover:text-brand-600 font-semibold">Skip for now →</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
