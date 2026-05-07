'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Heart, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { signIn } from 'next-auth/react'

const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Kenya','Nigeria','South Africa','Germany','France','India','Brazil','Mexico','Spain','Italy','Netherlands','Sweden','Norway','Denmark','Finland','Switzerland','Japan','South Korea','Singapore','UAE','Saudi Arabia','Other']

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '', gender: '1', lookingFor: '2',
    birthday: '', city: '', country: 'United States',
  })

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
      await signIn('credentials', { email: form.email, password: form.password, redirect: false })
      router.push('/home')
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
          {/* Progress */}
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
                    className="input-field pr-12" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!isStep1Valid}
                className="btn-primary w-full flex items-center justify-center gap-2">
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">About You</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['1','Man'],['2','Woman']].map(([v, l]) => (
                    <button key={v} onClick={() => update('gender', v)}
                      className={`py-3 rounded-xl border-2 font-medium transition-all ${form.gender === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Looking for</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['1','Men'],['2','Women'],['0','Both']].map(([v, l]) => (
                    <button key={v} onClick={() => update('lookingFor', v)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${form.lookingFor === v ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Birthday</label>
                <input type="date" value={form.birthday} onChange={e => update('birthday', e.target.value)}
                  className="input-field" max={new Date(Date.now() - 18*365*24*60*60*1000).toISOString().split('T')[0]} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-outline flex-1 flex items-center justify-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={() => setStep(3)} disabled={!isStep2Valid} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-900">Location</h2>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">City</label>
                <input type="text" value={form.city} onChange={e => update('city', e.target.value)}
                  className="input-field" placeholder="Your city" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Country</label>
                <select value={form.country} onChange={e => update('country', e.target.value)} className="input-field">
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-400">By creating an account, you agree to our <Link href="/terms" className="text-brand-500">Terms</Link> and <Link href="/privacy" className="text-brand-500">Privacy Policy</Link>.</p>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-outline flex-1 flex items-center justify-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
                <button onClick={submit} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : '🎉 Join Now'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-500 font-semibold hover:text-brand-600">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
