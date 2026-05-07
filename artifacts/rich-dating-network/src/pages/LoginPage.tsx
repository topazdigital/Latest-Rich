import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2, Crown, Shield, MapPin, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

declare global {
  interface Window {
    google?: any
    FB?: any
    handleGoogleOneTap?: (response: any) => void
  }
}

const PROFILES = [
  { name: 'Sophie, 28', city: 'New York', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', verified: true },
  { name: 'Emma, 31', city: 'London', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', verified: true },
  { name: 'Priya, 26', city: 'Dubai', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', verified: true },
]

export default function LoginPage() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [socialConfig, setSocialConfig] = useState({ googleClientId: '', facebookAppId: '' })
  const { login } = useAuth()

  useEffect(() => {
    fetch('/api/auth/social/config').then(r => r.json()).then(d => setSocialConfig(d)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socialConfig.googleClientId) return
    window.handleGoogleOneTap = async (response: any) => {
      setSocialLoading('google')
      try {
        const res = await fetch('/api/auth/social/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential, client_id: socialConfig.googleClientId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Google login failed')
        const { setStoredAuth } = await import('../lib/auth')
        setStoredAuth({ user: data.user, token: data.token })
        window.location.href = '/home'
      } catch (err: any) {
        toast.error(err.message || 'Google login failed')
      } finally { setSocialLoading(null) }
    }
    const existing = document.getElementById('google-gsi-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'google-gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const initGoogle = () => {
      if (!window.google?.accounts) return
      window.google.accounts.id.initialize({
        client_id: socialConfig.googleClientId,
        callback: window.handleGoogleOneTap,
        auto_select: false,
      })
    }
    if (window.google?.accounts) initGoogle()
    else { const s = document.getElementById('google-gsi-script'); if (s) s.onload = initGoogle }
    return () => window.google?.accounts?.id?.cancel()
  }, [socialConfig.googleClientId])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      setLocation('/home')
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)' }}>
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF192C, transparent)' }} />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #ff8c94, transparent)' }} />
          <div className="absolute top-[30%] right-[-5%] w-[40%] h-[40%] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #ffd4d8, transparent)' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Rich Dating</span>
          </Link>

          {/* Center content */}
          <div className="flex-1 flex flex-col justify-center mt-12">
            <div className="mb-3">
              <span className="bg-white/10 backdrop-blur border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
                👑 Exclusive Luxury Platform
              </span>
            </div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              Where Affluent<br />Singles Find<br />
              <span className="text-yellow-300">Real Love</span>
            </h2>
            <p className="text-white/60 text-base mb-10 leading-relaxed max-w-md">
              Join thousands of successful, verified singles. Real-time matching based on your location, lifestyle, and preferences.
            </p>

            {/* Floating profile cards */}
            <div className="flex flex-col gap-3 max-w-xs">
              {PROFILES.map((p, i) => (
                <div key={i}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3"
                  style={{ transform: `translateX(${i * 16}px)` }}>
                  <img src={p.img} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/40"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-semibold">{p.name}</span>
                      {p.verified && <Shield size={12} className="text-blue-300 fill-blue-300" />}
                    </div>
                    <div className="flex items-center gap-1 text-white/50 text-xs">
                      <MapPin size={10} /> {p.city}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom trust signals */}
          <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/10">
            {[
              { icon: <Shield size={14} />, label: 'Verified Profiles' },
              { icon: <Star size={14} />, label: '4.9★ Rating' },
              { icon: <Crown size={14} />, label: 'VIP Members' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50 text-xs">
                {t.icon} {t.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Form */}
      <div className="flex-1 flex flex-col min-h-screen bg-white overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20 max-w-md mx-auto w-full">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">Rich Dating</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome back 👋</h1>
            <p className="text-gray-500">Sign in to continue to your matches</p>
          </div>

          {/* Google sign in */}
          {socialConfig.googleClientId && (
            <button
              onClick={() => window.google?.accounts?.id?.prompt()}
              disabled={!!socialLoading}
              className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3.5 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-5 disabled:opacity-50 shadow-sm">
              {socialLoading === 'google' ? <Loader2 size={18} className="animate-spin" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
          )}

          {socialConfig.googleClientId && (
            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-medium">or sign in with email</span></div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                placeholder="your@email.com" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <button type="button" className="text-xs text-brand-500 hover:text-brand-600 font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white pr-12 placeholder-gray-400"
                  placeholder="Enter your password" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
              style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
              {loading && <Loader2 size={17} className="animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-500 hover:text-brand-600 font-bold">Join Free</Link>
          </p>

          <p className="text-center text-xs text-gray-300 mt-8">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-500 transition-colors">Terms</Link>{' '}and{' '}
            <Link href="/privacy" className="underline hover:text-gray-500 transition-colors">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
