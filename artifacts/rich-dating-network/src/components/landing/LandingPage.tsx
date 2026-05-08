import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Shield, Star, Users, MessageCircle, Crown, MapPin, Zap, Check, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

declare global {
  interface Window { google?: any; handleGoogleOneTapLanding?: (r: any) => void }
}

const FEATURES = [
  { icon: MapPin, title: 'Location-Based Matches', desc: 'Find singles near you or explore worldwide with advanced location filters.' },
  { icon: Shield, title: 'Verified Profiles', desc: 'Every member is verified to ensure authenticity and your safety.' },
  { icon: Zap, title: 'Real-Time Messaging', desc: 'Instant chat with typing indicators and zero delays.' },
  { icon: Star, title: 'Elite Matching', desc: 'Advanced algorithms connect you with compatible, successful singles.' },
  { icon: Crown, title: 'VIP Features', desc: 'Stand out with superlikes, profile boosts, and priority placement.' },
  { icon: Heart, title: 'Real Connections', desc: 'Thousands of success stories. Find meaningful love that lasts.' },
]

const TESTIMONIALS = [
  { name: 'Sarah M.', city: 'New York', text: 'Found my dream partner in just 2 weeks! The quality of members here is incredible.', rating: 5 },
  { name: 'James K.', city: 'London', text: 'Finally a dating platform that matches serious, successful people. Worth every penny.', rating: 5 },
  { name: 'Priya R.', city: 'Dubai', text: 'Location-based matching is genius. Met someone amazing just 10 miles away!', rating: 5 },
]

const STATS = [
  { n: '7,000+', l: 'Members' },
  { n: '50K+', l: 'Connections' },
  { n: '180+', l: 'Countries' },
  { n: '98%', l: 'Satisfaction' },
]

// Quick mini registration form embedded in hero
function HeroRegisterForm() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [gender, setGender] = useState('1')
  const [loading, setLoading] = useState(false)
  const [socialConfig, setSocialConfig] = useState({ googleClientId: '' })

  useEffect(() => {
    fetch('/api/auth/social/config').then(r => r.json()).then(d => setSocialConfig(d)).catch(() => {})
  }, [])

  function goRegister(e: React.FormEvent) {
    e.preventDefault()
    // Pass prefill to register page
    const params = new URLSearchParams()
    if (email) params.set('email', email)
    if (gender) params.set('gender', gender)
    setLocation(`/register?${params.toString()}`)
  }

  function handleGoogle() {
    setLocation('/register?social=google')
  }

  return (
    <div className="space-y-3">
      {socialConfig.googleClientId && (
        <button onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
          <svg width="17" height="17" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>
      )}

      <form onSubmit={goRegister} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[['1','👨 Man'],['2','👩 Woman']].map(([v,l]) => (
            <button key={v} type="button" onClick={() => setGender(v)}
              className={`py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${gender === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 bg-white hover:border-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white placeholder-gray-400"
          placeholder="Your email address" />
        <div className="relative">
          <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white pr-11 placeholder-gray-400"
            placeholder="Choose a password (min. 6 chars)" minLength={6} />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Create Free Account <ChevronRight size={16} />
        </button>
      </form>

      <p className="text-xs text-gray-400 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-500 font-semibold hover:text-brand-600">Sign In</Link>
      </p>
      <p className="text-xs text-gray-300 text-center">
        By joining you agree to our{' '}
        <Link href="/terms" className="underline">Terms</Link> &{' '}
        <Link href="/privacy" className="underline">Privacy Policy</Link>
      </p>
    </div>
  )
}

// Quick login form embedded in hero
function HeroLoginForm() {
  const [, setLocation] = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      const { setStoredAuth } = await import('../../lib/auth')
      setStoredAuth({ user: data.user, token: data.token })
      window.location.href = '/discover'
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-3">
      <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required
        className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white placeholder-gray-400"
        placeholder="Email, username or phone" autoComplete="username" />
      <div className="relative">
        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white pr-11 placeholder-gray-400"
          placeholder="Password" />
        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <div className="flex items-center justify-end">
        <Link href="/forgot-password" className="text-xs text-brand-500 font-semibold hover:text-brand-600">Forgot password?</Link>
      </div>
      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        Sign In
      </button>
      <p className="text-xs text-gray-400 text-center">
        No account yet?{' '}
        <Link href="/register" className="text-brand-500 font-semibold hover:text-brand-600">Join Free</Link>
      </p>
    </form>
  )
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register')
  const [heroBg, setHeroBg] = useState('')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    fetch('/api/admin/config/public').then(r => r.json()).then(d => {
      if (d.hero_bg_url) setHeroBg(d.hero_bg_url)
    }).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Sticky header */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <span className={`text-xl font-bold transition-colors ${scrolled ? 'text-gray-900' : 'text-white'}`}>
              Rich <span className={scrolled ? 'text-brand-500' : 'text-yellow-300'}>Dating</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={`font-medium text-sm px-4 py-2 rounded-xl transition-all hidden sm:block ${scrolled ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-white/90 hover:text-white hover:bg-white/10'}`}>
              Sign In
            </Link>
            <Link href="/register" className={`font-semibold text-sm px-5 py-2 rounded-xl transition-all ${scrolled ? 'gradient-brand text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' : 'bg-white text-brand-500 shadow-md hover:shadow-lg hover:-translate-y-0.5'}`}>
              Join Free
            </Link>
          </div>
        </div>
      </header>

      {/* SPLIT HERO */}
      <section className="min-h-screen flex flex-col lg:flex-row">
        {/* LEFT: Marketing */}
        <div className="relative lg:w-[55%] xl:w-[58%] flex flex-col justify-center overflow-hidden"
          style={{
            background: heroBg
              ? 'none'
              : 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)',
            minHeight: '100vh',
          }}>
          {heroBg && (
            <>
              <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
            </>
          )}
          {!heroBg && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {['❤️', '💎', '✨', '👑', '🥂', '💝', '🌹', '💫'].map((e, i) => (
                <div key={i} className="absolute text-3xl opacity-15 animate-bounce select-none"
                  style={{ left: `${8 + i * 11}%`, top: `${15 + (i % 4) * 20}%`, animationDelay: `${i * 0.4}s`, animationDuration: `${2.5 + i * 0.3}s` }}>
                  {e}
                </div>
              ))}
              <div className="absolute top-20 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            </div>
          )}

          <div className="relative z-10 p-8 sm:p-12 lg:p-16 xl:p-20 pt-28 lg:pt-16">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 text-sm text-white">
              <Crown className="w-3.5 h-3.5 text-yellow-300" />
              <span>Exclusive Luxury Dating Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white mb-6 leading-[1.1]">
              Where Affluent<br />Singles Find{' '}
              <span className="text-yellow-300 relative">
                Real Love
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" preserveAspectRatio="none" style={{ height: '5px' }}>
                  <path d="M0 6 Q50 0 100 4 Q150 8 200 2" stroke="#fde047" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="text-lg text-white/80 max-w-lg mb-10 leading-relaxed">
              Join thousands of successful, verified singles. Real-time matching based on your location, lifestyle, and preferences.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70 mb-10">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> 100% Free to Join</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> Verified Profiles</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> 180+ Countries</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-300" /> Real-Time Messaging</span>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-md">
              {STATS.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-white">{s.n}</div>
                  <div className="text-white/50 text-xs mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Auth Form */}
        <div className="lg:w-[45%] xl:w-[42%] flex items-center justify-center bg-white px-6 py-16 lg:py-0 min-h-[60vh] lg:min-h-screen">
          <div className="w-full max-w-sm">
            {/* Logo on mobile */}
            <div className="lg:hidden mb-8 flex justify-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg">
                  <Heart className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="font-bold text-lg text-gray-900">Rich Dating</span>
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
              <button onClick={() => setActiveTab('register')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'register' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                Create Account
              </button>
              <button onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'login' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                Sign In
              </button>
            </div>

            {activeTab === 'register' ? (
              <>
                <div className="mb-5">
                  <h2 className="text-2xl font-black text-gray-900 mb-1">Join for free</h2>
                  <p className="text-sm text-gray-500">Start your love story today — it takes 30 seconds</p>
                </div>
                <HeroRegisterForm />
              </>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-2xl font-black text-gray-900 mb-1">Welcome back 👋</h2>
                  <p className="text-sm text-gray-500">Sign in to continue to your matches</p>
                </div>
                <HeroLoginForm />
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Star size={14} /> Why Choose Us
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Find Love</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">A premium dating experience built for successful people who know what they want.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-lg transition-all hover:-translate-y-1 group border border-gray-100">
                <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform shadow-md">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Zap size={14} /> Simple Process
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12">Find Love in 3 Easy Steps</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Your Profile', desc: 'Sign up free and tell us about yourself — your interests, location, and what you\'re looking for.', icon: '📝' },
              { step: '02', title: 'Discover Matches', desc: 'See compatible singles near you first, or explore profiles worldwide with smart filters.', icon: '🔍' },
              { step: '03', title: 'Connect & Meet', desc: 'Chat in real-time, send gifts, and plan your first date. Love is just a message away!', icon: '❤️' },
            ].map((s, i) => (
              <div key={i} className="relative">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-brand-200 to-transparent z-0 -translate-y-1/2" />
                )}
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{s.icon}</div>
                  <div className="text-xs font-bold text-brand-500 mb-2 tracking-widest">STEP {s.step}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Real Success Stories</h2>
            <p className="text-gray-500">Join thousands who found their perfect match</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card p-6 border border-gray-100">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-lg font-bold text-brand-600">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin size={10} /> {t.city}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 gradient-brand text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <div className="text-5xl mb-6">💝</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Find Your Perfect Match?</h2>
          <p className="text-white/80 mb-8 text-lg">Join the most exclusive dating network for successful singles. Free to join, always.</p>
          <Link href="/register"
            className="bg-white text-brand-600 font-bold text-lg px-10 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all hover:-translate-y-1 inline-flex items-center gap-3">
            Create Free Account <ChevronRight size={20} />
          </Link>
          <p className="text-white/60 text-sm mt-5">No credit card required • Join in 30 seconds</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-gray-950 text-gray-400">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="text-white font-bold">Rich Dating Network</span>
            </div>
            <div className="flex flex-wrap gap-6 text-sm justify-center">
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-white transition-colors">Join Free</Link>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Rich Dating Network. All rights reserved.</p>
            <p>Built with ❤️ for successful singles worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
