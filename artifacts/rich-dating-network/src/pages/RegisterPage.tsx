import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft, Crown, Shield, Users, Check, Camera, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { getStoredAuth } from '../lib/auth'
import LocationAutocomplete from '../components/ui/LocationAutocomplete'

declare global {
  interface Window { google?: any; handleGoogleRegister?: (response: any) => void }
}

const STATS = [
  { value: '2M+', label: 'Active Members' },
  { value: '94%', label: 'Match Rate' },
  { value: '180+', label: 'Countries' },
]

export default function RegisterPage() {
  const [, setLocation] = useLocation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [socialConfig, setSocialConfig] = useState({ googleClientId: '', facebookAppId: '' })
  const [uploadedPhoto, setUploadedPhoto] = useState<{ url: string; filename: string } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
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
        if (!res.ok) throw new Error(data.error || 'Google sign up failed')
        const { setStoredAuth } = await import('../lib/auth')
        setStoredAuth({ user: data.user, token: data.token })
        window.location.href = '/home'
      } catch (err: any) {
        toast.error(err.message || 'Google sign up failed')
      } finally { setSocialLoading(false) }
    }
  }, [socialConfig.googleClientId])

  function initAndPrompt() {
    if (!window.google?.accounts) { toast.error('Google SDK not loaded'); return }
    window.google.accounts.id.initialize({ client_id: socialConfig.googleClientId, callback: window.handleGoogleRegister })
    window.google.accounts.id.prompt()
  }

  function handleGoogleSignUp() {
    if (!socialConfig.googleClientId) { toast.error('Google login not configured'); return }
    const existing = document.getElementById('google-gsi-script')
    if (!existing) {
      const script = document.createElement('script')
      script.id = 'google-gsi-script'; script.src = 'https://accounts.google.com/gsi/client'; script.async = true
      document.head.appendChild(script)
      script.onload = () => initAndPrompt()
    } else { initAndPrompt() }
  }

  function update(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) { toast.error('Photo must be under 10MB'); return }

    const preview = URL.createObjectURL(file)
    setPreviewUrl(preview)

    setPhotoUploading(true)
    try {
      const auth = getStoredAuth()
      if (!auth?.token) { toast.error('Please complete registration first'); setPhotoUploading(false); return }

      const formData = new FormData()
      formData.append('photo', file)
      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setPreviewUrl(null)
        toast.error(data.error || 'Upload failed')
        return
      }
      setUploadedPhoto({ url: `/api/uploads/${data.photo.photo}`, filename: data.photo.photo })
      toast.success('Photo uploaded!')
    } catch {
      setPreviewUrl(null)
      toast.error('Upload failed')
    } finally { setPhotoUploading(false) }
  }

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

      const { setStoredAuth } = await import('../lib/auth')
      setStoredAuth({ user: data.user, token: data.token })

      toast.success('Account created! Add your photo...')
      setStep(4)
    } catch { toast.error('Something went wrong') }
    finally { setLoading(false) }
  }

  async function finishRegistration() {
    if (!uploadedPhoto) {
      toast.error('Please upload a profile photo to continue')
      return
    }
    const auth = getStoredAuth()
    if (!auth?.user) { setLocation('/login'); return }

    if (auth.user.emailVerified === 0) {
      const requireVerify = await fetch('/api/admin/config/public').then(r => r.json()).then(d => d.require_email_verification === '1').catch(() => false)
      if (requireVerify) {
        setLocation('/verify-email')
        return
      }
    }

    localStorage.setItem('show_welcome', '1')
    setLocation('/home')
  }

  const isStep1Valid = form.name.trim().length >= 2 && form.email.includes('@') && form.password.length >= 6
  const isStep2Valid = !!form.birthday && !!form.gender

  const steps = ['Account', 'About You', 'Location', 'Photo']

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[42%] xl:w-[40%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF192C, transparent)' }} />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #ff8c94, transparent)' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-10 xl:p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Rich Dating</span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            <div className="mb-3">
              <span className="bg-white/10 backdrop-blur border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
                100% Free to Join
              </span>
            </div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Start Your<br />Love Story<br />
              <span className="text-yellow-300">Today</span>
            </h2>
            <p className="text-white/60 text-sm mb-10 leading-relaxed">
              Join the most exclusive dating network for successful, ambitious singles worldwide.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {STATS.map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{s.value}</div>
                  <div className="text-white/50 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {[
                { icon: <Shield size={14} />, text: 'Verified & safe profiles only' },
                { icon: <Crown size={14} />, text: 'Premium matching algorithm' },
                { icon: <Users size={14} />, text: 'Millions of real members' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-white/70 text-sm">
                  <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white/60">{f.icon}</div>
                  {f.text}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center">
            <p className="text-white/40 text-xs">Already have an account?{' '}
              <Link href="/login" className="text-white/70 font-semibold hover:text-white transition-colors">Sign In</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white overflow-y-auto">
        <div className="min-h-screen flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14 xl:px-16 max-w-lg mx-auto w-full">
          <div className="lg:hidden mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-bold text-gray-900">Rich Dating</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-gray-900 mb-1.5">Create your account</h1>
            <p className="text-gray-500 text-sm">Find your perfect match — free, fast, and secure</p>
          </div>

          <div className="flex items-center gap-1 mb-8 overflow-x-auto">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > i + 1 ? 'bg-brand-500 text-white' :
                    step === i + 1 ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {step > i + 1 ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block whitespace-nowrap ${step === i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-4 sm:w-6 transition-all ${step > i + 1 ? 'bg-brand-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              {socialConfig.googleClientId && (
                <>
                  <button onClick={handleGoogleSignUp} disabled={socialLoading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3.5 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50">
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
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                    <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 font-medium">or register with email</span></div>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                  placeholder="Your full name" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                  placeholder="your@email.com" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white pr-12 placeholder-gray-400"
                    placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!isStep1Valid}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-brand-500/20"
                style={{ background: isStep1Valid ? 'linear-gradient(135deg, #FF192C, #ff5f6b)' : '#d1d5db' }}>
                Continue <ChevronRight size={17} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['1','👨 Man'],['2','👩 Woman']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('gender', v)}
                      className={`py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all ${form.gender === v ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-md shadow-brand-500/10' : 'border-gray-100 text-gray-600 hover:border-gray-200 bg-gray-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Looking for</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[['1','👨 Men'],['2','👩 Women'],['3','💑 Both']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('lookingFor', v)}
                      className={`py-3 rounded-2xl border-2 font-semibold text-xs transition-all ${form.lookingFor === v ? 'border-brand-500 bg-brand-50 text-brand-600 shadow-md shadow-brand-500/10' : 'border-gray-100 text-gray-600 hover:border-gray-200 bg-gray-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Date of Birth</label>
                <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white"
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0,10)} />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-500 text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!isStep2Valid}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow-lg shadow-brand-500/20"
                  style={{ background: isStep2Valid ? 'linear-gradient(135deg, #FF192C, #ff5f6b)' : '#d1d5db' }}>
                  Continue <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 -mt-2">Help us show you matches near you</p>

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
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Country</label>
                <input type="text" value={form.country} onChange={e => update('country', e.target.value)}
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white"
                  placeholder="Your country" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-gray-500 text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {loading && <Loader2 size={17} className="animate-spin" />}
                  Continue <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-gray-900 mb-1">Add Your Profile Photo</h2>
                <p className="text-sm text-gray-500">Profiles with photos get 10x more matches. This is required to continue.</p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`w-40 h-40 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                    previewUrl ? 'border-brand-500 shadow-lg shadow-brand-500/20' : 'border-gray-300 hover:border-brand-400 bg-gray-50 hover:bg-brand-50'
                  }`}>
                  {photoUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                      <span className="text-xs text-gray-400">Uploading...</span>
                    </div>
                  ) : previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      <Camera className="w-10 h-10 text-gray-300" />
                      <span className="text-xs text-gray-400">Tap to upload</span>
                    </div>
                  )}
                </div>

                {previewUrl && uploadedPhoto && (
                  <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                    <Check size={16} />
                    Photo uploaded!
                  </div>
                )}

                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
                  <Upload size={16} />
                  {previewUrl ? 'Change Photo' : 'Choose Photo'}
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700 space-y-1">
                <p className="font-semibold">Photo guidelines:</p>
                <ul className="space-y-0.5 text-amber-600 text-xs">
                  <li>• Your face must be clearly visible</li>
                  <li>• No phone numbers, emails, or social handles</li>
                  <li>• No explicit or inappropriate content</li>
                  <li>• Real photos only — no avatars or cartoons</li>
                </ul>
              </div>

              <button
                onClick={finishRegistration}
                disabled={!uploadedPhoto || photoUploading}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-40"
                style={{ background: uploadedPhoto ? 'linear-gradient(135deg, #FF192C, #ff5f6b)' : '#d1d5db' }}>
                Find My Matches 💝
              </button>

              <p className="text-center text-xs text-gray-400">
                By registering you agree to our{' '}
                <Link href="/terms" className="text-brand-500">Terms</Link> &{' '}
                <Link href="/privacy" className="text-brand-500">Privacy Policy</Link>
              </p>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-500 hover:text-brand-600 font-bold">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
