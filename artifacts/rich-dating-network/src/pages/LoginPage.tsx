import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2, Crown, Shield, MapPin, Star, Mail, AtSign, Phone, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

const DIAL_CODES = [
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'KE', dial: '+254', name: 'Kenya' },
  { code: 'NG', dial: '+234', name: 'Nigeria' },
  { code: 'ZA', dial: '+27', name: 'South Africa' },
  { code: 'GH', dial: '+233', name: 'Ghana' },
  { code: 'UG', dial: '+256', name: 'Uganda' },
  { code: 'TZ', dial: '+255', name: 'Tanzania' },
  { code: 'RW', dial: '+250', name: 'Rwanda' },
  { code: 'ET', dial: '+251', name: 'Ethiopia' },
  { code: 'EG', dial: '+20', name: 'Egypt' },
  { code: 'MA', dial: '+212', name: 'Morocco' },
  { code: 'ZM', dial: '+260', name: 'Zambia' },
  { code: 'ZW', dial: '+263', name: 'Zimbabwe' },
  { code: 'CM', dial: '+237', name: 'Cameroon' },
  { code: 'AE', dial: '+971', name: 'UAE' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'PK', dial: '+92', name: 'Pakistan' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'IT', dial: '+39', name: 'Italy' },
  { code: 'ES', dial: '+34', name: 'Spain' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'BR', dial: '+55', name: 'Brazil' },
  { code: 'MX', dial: '+52', name: 'Mexico' },
  { code: 'SG', dial: '+65', name: 'Singapore' },
  { code: 'CN', dial: '+86', name: 'China' },
  { code: 'JP', dial: '+81', name: 'Japan' },
  { code: 'KR', dial: '+82', name: 'South Korea' },
  { code: 'ZZ', dial: '', name: 'Other' },
]

function getFlagEmoji(code: string) {
  if (!code || code === 'ZZ') return '🌍'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

declare global {
  interface Window {
    google?: any
    handleGoogleOneTap?: (response: any) => void
  }
}

const PROFILE_POOLS: Record<string, { name: string; age: number; city: string; img: string; tag: string }[]> = {
  KE: [
    { name: 'Amara', age: 26, city: 'Nairobi', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Looking for successful men' },
    { name: 'Lucia', age: 29, city: 'Mombasa', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', tag: 'Ready for love 💕' },
    { name: 'Grace', age: 24, city: 'Nairobi', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', tag: 'Loves adventure' },
    { name: 'David', age: 52, city: 'Nairobi', img: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=120&h=120&fit=crop&crop=face', tag: 'Successful entrepreneur' },
    { name: 'James', age: 48, city: 'Nairobi', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&crop=face', tag: 'Looking for true love' },
  ],
  NG: [
    { name: 'Chioma', age: 27, city: 'Lagos', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Ambitious & beautiful' },
    { name: 'Blessing', age: 25, city: 'Abuja', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', tag: 'Ready to mingle 😊' },
    { name: 'Emmanuel', age: 45, city: 'Lagos', img: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=120&h=120&fit=crop&crop=face', tag: 'Successful businessman' },
  ],
  ZA: [
    { name: 'Lerato', age: 28, city: 'Johannesburg', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', tag: 'Looking for real love' },
    { name: 'Nomvula', age: 31, city: 'Cape Town', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Beach lover 🌊' },
    { name: 'Trevor', age: 50, city: 'Cape Town', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&crop=face', tag: 'Wine & dine kind of guy' },
  ],
  GB: [
    { name: 'Sophie', age: 28, city: 'London', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', tag: 'Coffee & conversation' },
    { name: 'Emma', age: 31, city: 'Manchester', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Art & culture lover' },
    { name: 'Oliver', age: 44, city: 'London', img: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=120&h=120&fit=crop&crop=face', tag: 'Gentleman & professional' },
  ],
  AE: [
    { name: 'Fatima', age: 27, city: 'Dubai', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', tag: 'Ready for something real' },
    { name: 'Sara', age: 29, city: 'Abu Dhabi', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', tag: 'Luxury lifestyle ✨' },
    { name: 'Khalid', age: 47, city: 'Dubai', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&h=120&fit=crop&crop=face', tag: 'Business & adventure' },
  ],
  IN: [
    { name: 'Priya', age: 26, city: 'Mumbai', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', tag: 'Smart & ambitious 💼' },
    { name: 'Ananya', age: 28, city: 'Delhi', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Culture & family values' },
    { name: 'Raj', age: 51, city: 'Bangalore', img: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=120&h=120&fit=crop&crop=face', tag: 'Tech founder, loves travel' },
  ],
  DEFAULT: [
    { name: 'Sophie', age: 28, city: 'New York', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=120&h=120&fit=crop&crop=face', tag: 'Looking for real connection' },
    { name: 'Emma', age: 31, city: 'London', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&h=120&fit=crop&crop=face', tag: 'Art, travel & love ✈️' },
    { name: 'Priya', age: 26, city: 'Dubai', img: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=120&h=120&fit=crop&crop=face', tag: 'Ready to find my person' },
    { name: 'James', age: 48, city: 'Toronto', img: 'https://images.unsplash.com/photo-1542178243-bc20204b769f?w=120&h=120&fit=crop&crop=face', tag: 'Successful & caring' },
  ],
}

function getProfiles(countryCode: string) {
  const pool = PROFILE_POOLS[countryCode] || PROFILE_POOLS.DEFAULT
  const offset = Math.floor(Date.now() / 60000) % pool.length
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)]
  return rotated.slice(0, 3)
}

type LoginTab = 'email' | 'username' | 'phone'

const TABS: { id: LoginTab; label: string; icon: React.ReactNode; placeholder: string; type: string; autoComplete: string }[] = [
  { id: 'email', label: 'Email', icon: <Mail size={14} />, placeholder: 'you@example.com', type: 'email', autoComplete: 'email' },
  { id: 'username', label: 'Username', icon: <AtSign size={14} />, placeholder: '@yourusername', type: 'text', autoComplete: 'username' },
  { id: 'phone', label: 'Phone', icon: <Phone size={14} />, placeholder: '+254 700 000 000', type: 'tel', autoComplete: 'tel' },
]

export default function LoginPage() {
  const [, setLocation] = useLocation()
  const [activeTab, setActiveTab] = useState<LoginTab>('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [socialConfig, setSocialConfig] = useState({ googleClientId: '', facebookAppId: '' })
  const [profiles, setProfiles] = useState(PROFILE_POOLS.DEFAULT.slice(0, 3))
  // Phone tab dial picker
  const [selectedDial, setSelectedDial] = useState(DIAL_CODES[2]) // default Kenya
  const [phoneLocal, setPhoneLocal] = useState('')
  const [showDialPicker, setShowDialPicker] = useState(false)
  const [dialSearch, setDialSearch] = useState('')
  const dialRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/social/config').then(r => r.json()).then(d => setSocialConfig(d)).catch(() => {})
    fetch('/api/location/detect').then(r => r.json()).then(d => {
      if (d.countryCode) {
        setProfiles(getProfiles(d.countryCode))
        const found = DIAL_CODES.find(c => c.code === d.countryCode)
        if (found) setSelectedDial(found)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) setShowDialPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
        window.location.href = '/discover'
      } catch (err: any) {
        toast.error(err.message || 'Google login failed')
      } finally { setSocialLoading(null) }
    }
    const existing = document.getElementById('google-gsi-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'google-gsi-script'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true
      document.head.appendChild(script)
    }
    const initGoogle = () => {
      if (!window.google?.accounts) return
      window.google.accounts.id.initialize({ client_id: socialConfig.googleClientId, callback: window.handleGoogleOneTap, auto_select: false })
    }
    if (window.google?.accounts) initGoogle()
    else { const s = document.getElementById('google-gsi-script'); if (s) (s as HTMLScriptElement).onload = initGoogle }
    return () => window.google?.accounts?.id?.cancel()
  }, [socialConfig.googleClientId])

  function handleTabChange(tab: LoginTab) {
    setActiveTab(tab)
    setIdentifier('')
    setPhoneLocal('')
  }

  const filteredDials = DIAL_CODES.filter(d =>
    d.name.toLowerCase().includes(dialSearch.toLowerCase()) || d.dial.includes(dialSearch)
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const effectiveIdentifier = activeTab === 'phone'
      ? (selectedDial.dial + phoneLocal.replace(/\D/g, ''))
      : identifier.trim()
    if (!effectiveIdentifier || (activeTab === 'phone' && phoneLocal.trim().length < 5)) {
      toast.error(`Please enter your phone number`)
      return
    }
    if (activeTab !== 'phone' && !identifier.trim()) {
      toast.error(`Please enter your ${activeTab}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: effectiveIdentifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      const { setStoredAuth } = await import('../lib/auth')
      setStoredAuth({ user: data.user, token: data.token })
      window.location.href = '/discover'
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)!

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF192C, transparent)' }} />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #ff8c94, transparent)' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Rich Dating Network</span>
          </Link>

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

            <div className="flex flex-col gap-3 max-w-xs">
              {profiles.map((p, i) => (
                <div key={`${p.name}-${i}`}
                  className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 transition-all"
                  style={{ transform: `translateX(${i * 14}px)` }}>
                  <img src={p.img} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-white/40"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-semibold">{p.name}, {p.age}</span>
                      <Shield size={11} className="text-blue-300 fill-blue-300 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-1 text-white/50 text-xs truncate">
                      <MapPin size={9} /> {p.city}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5 truncate">{p.tag}</div>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-10 pt-8 border-t border-white/10">
            {[
              { icon: <Shield size={14} />, label: 'Verified Profiles' },
              { icon: <Star size={14} />, label: '4.9★ Rating' },
              { icon: <Crown size={14} />, label: 'VIP Members' },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-white/50 text-xs">{t.icon} {t.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col min-h-screen bg-white overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20 max-w-md mx-auto w-full">
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-lg">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">Rich Dating Network</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome back 👋</h1>
            <p className="text-gray-500">Sign in to your account</p>
          </div>

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
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-medium">or sign in with</span></div>
            </div>
          )}

          {/* Login method tabs */}
          <div className="flex rounded-2xl bg-gray-100 p-1 mb-5 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {activeTabConfig.label}
              </label>
              {activeTab === 'phone' ? (
                <div className="flex gap-2">
                  {/* Dial code picker */}
                  <div ref={dialRef} className="relative flex-shrink-0">
                    <button type="button" onClick={() => setShowDialPicker(v => !v)}
                      className="h-[50px] px-3 border border-gray-200 rounded-2xl text-sm font-semibold flex items-center gap-1.5 bg-gray-50 hover:bg-white transition-all min-w-[96px]">
                      <span className="text-base leading-none">{getFlagEmoji(selectedDial.code)}</span>
                      <span className="text-gray-700">{selectedDial.dial || '+'}</span>
                      <ChevronDown size={12} className="text-gray-400" />
                    </button>
                    {showDialPicker && (
                      <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 w-64 overflow-hidden">
                        <div className="p-2 border-b border-gray-100">
                          <input autoFocus placeholder="Search country..."
                            value={dialSearch} onChange={e => setDialSearch(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border-0 outline-none placeholder-gray-400"
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredDials.map(d => (
                            <button key={d.code + d.dial} type="button"
                              onClick={() => { setSelectedDial(d); setShowDialPicker(false); setDialSearch('') }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${selectedDial.code === d.code ? 'bg-red-50 text-brand-600' : 'text-gray-700'}`}>
                              <span className="text-base leading-none w-6">{getFlagEmoji(d.code)}</span>
                              <span className="flex-1 font-medium">{d.name}</span>
                              <span className="text-gray-400 text-xs">{d.dial}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input key="phone-local" type="tel" value={phoneLocal}
                    onChange={e => setPhoneLocal(e.target.value)}
                    placeholder="712 345 678" autoFocus autoComplete="tel-national"
                    className="flex-1 px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                  />
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {activeTabConfig.icon}
                  </div>
                  <input
                    key={activeTab}
                    type={activeTabConfig.type}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                    placeholder={activeTabConfig.placeholder}
                    required
                    autoComplete={activeTabConfig.autoComplete}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white pr-12 placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
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
