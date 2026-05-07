import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import LocationAutocomplete from '../components/ui/LocationAutocomplete'

declare global {
  interface Window {
    google?: any
    handleGoogleRegister?: (response: any) => void
  }
}

export default function RegisterPage() {
  const [, setLocation] = useLocation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [socialConfig, setSocialConfig] = useState({ googleClientId: '', facebookAppId: '' })
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '1', lookingFor: '2',
    birthday: '', city: '', country: 'United States', countryCode: 'US',
  })
  const { login } = useAuth()

  useEffect(() => {
    fetch('/api/auth/social/config').then(r => r.json()).then(d => setSocialConfig(d)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!socialConfig.googleClientId) return
    window.handleGoogleRegister = async (response: any) => {
      setSocialLoading(true)
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
        toast.error(err.message || 'Google sign up failed')
      } finally {
        setSocialLoading(false)
      }
    }
  }, [socialConfig.googleClientId])

  function handleGoogleSignUp() {
    if (!socialConfig.googleClientId) { toast.error('Google login not configured'); return }
    const existing = document.getElementById('google-gsi-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'google-gsi-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      document.head.appendChild(script)
      script.onload = () => initAndPrompt()
    } else {
      initAndPrompt()
    }
  }

  function initAndPrompt() {
    if (!window.google?.accounts) { toast.error('Google SDK not loaded'); return }
    window.google.accounts.id.initialize({
      client_id: socialConfig.googleClientId,
      callback: window.handleGoogleRegister,
    })
    window.google.accounts.id.prompt()
  }

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Registration failed'); return }
      toast.success('Welcome! Signing you in...')
      await login(form.email, form.password)
      setLocation('/home')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid = form.name.trim().length >= 2 && form.email.includes('@') && form.password.length >= 6
  const isStep2Valid = !!form.birthday && !!form.gender

  const steps = [
    { label: 'Account' },
    { label: 'About You' },
    { label: 'Location' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands of successful singles</p>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-brand-500 text-white' : step === i + 1 ? 'bg-brand-500 text-white ring-4 ring-brand-100' : 'bg-gray-200 text-gray-400'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${step > i + 1 ? 'bg-brand-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 shadow-md">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 text-sm">Basic Info</h2>

              {/* Social sign up */}
              {socialConfig.googleClientId && (
                <>
                  <button onClick={handleGoogleSignUp} disabled={socialLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {socialLoading ? <Loader2 size={17} className="animate-spin" /> : (
                      <svg width="17" height="17" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Sign up with Google
                  </button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or with email</span></div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  className="input-field" placeholder="Your name" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  className="input-field" placeholder="your@email.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                    className="input-field pr-10" placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!isStep1Valid}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                Continue <ChevronRight size={17} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 text-sm">About You</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">I am a</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[['1','👨 Man'],['2','👩 Woman']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('gender', v)}
                      className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${form.gender === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Looking for</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['1','Men'],['2','Women'],['3','Both']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('lookingFor', v)}
                      className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${form.lookingFor === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Date of Birth</label>
                <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)}
                  className="input-field" max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0,10)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-500 text-sm font-medium px-3">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!isStep2Valid}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  Continue <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900 text-sm">Your Location</h2>
              <p className="text-xs text-gray-500">Help us show you matches near you</p>

              <LocationAutocomplete
                label="City"
                value={form.city}
                country={form.country}
                onChange={(city, country, countryCode) => {
                  setForm(p => ({ ...p, city, country: country || p.country, countryCode: countryCode || p.countryCode }))
                }}
                placeholder="Search your city..."
              />

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country</label>
                <input type="text" value={form.country}
                  onChange={e => update('country', e.target.value)}
                  className="input-field" placeholder="Your country" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-gray-500 text-sm font-medium px-3">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={17} className="animate-spin" /> : null}
                  Create Account 💝
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-4">
            Have an account? <Link href="/login" className="text-brand-500 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
