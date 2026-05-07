import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Kenya','Nigeria','South Africa','Germany','France','India','Brazil','Mexico','Spain','Italy','Netherlands','Sweden','Norway','Denmark','Finland','Switzerland','Japan','South Korea','Singapore','UAE','Saudi Arabia','Other']

export default function RegisterPage() {
  const [, setLocation] = useLocation()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '1', lookingFor: '2',
    birthday: '', city: '', country: 'United States',
  })
  const { login } = useAuth()

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
      toast.success('Account created! Signing you in...')
      await login(form.email, form.password)
      setLocation('/home')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid = form.name && form.email && form.password.length >= 6
  const isStep2Valid = form.birthday && form.gender

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Create Account</h1>
          <p className="text-gray-500 mt-2">Join thousands of successful singles</p>
          <div className="flex gap-2 justify-center mt-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${step >= s ? 'bg-brand-500' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
        <div className="card p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">Basic Info</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  className="input-field" placeholder="Your name" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  className="input-field" placeholder="your@email.com" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)}
                    className="input-field pr-10" placeholder="Min. 6 characters" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!isStep1Valid}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">About You</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['1','Man'],['2','Woman']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('gender', v)}
                      className={`py-3 rounded-xl border-2 font-medium text-sm transition-all ${form.gender === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Looking for</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['1','Men'],['2','Women']].map(([v,l]) => (
                    <button key={v} type="button" onClick={() => update('lookingFor', v)}
                      className={`py-3 rounded-xl border-2 font-medium text-sm transition-all ${form.lookingFor === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Birthday</label>
                <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)} className="input-field" required />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-gray-500 text-sm font-medium">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!isStep2Valid}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">Location</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">City (optional)</label>
                <input type="text" value={form.city} onChange={e => update('city', e.target.value)} className="input-field" placeholder="Your city" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country</label>
                <select value={form.country} onChange={e => update('country', e.target.value)} className="input-field">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-gray-500 text-sm font-medium">
                  <ChevronLeft size={16} /> Back
                </button>
                <button onClick={submit} disabled={loading}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Create Account 💝
                </button>
              </div>
            </div>
          )}
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <Link href="/login" className="text-brand-500 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
