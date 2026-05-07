import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Loader2, ArrowLeft, Mail, CheckCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation()
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      // If token is returned (dev mode), auto-fill it
      if (data.token) setToken(data.token)
      setStep('reset')
      toast.success('Reset link generated!')
    } catch {
      toast.error('Something went wrong')
    } finally { setLoading(false) }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed'); return }
      setStep('done')
      toast.success('Password updated!')
    } catch {
      toast.error('Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col"
        style={{ background: 'linear-gradient(145deg, #1a0a0e 0%, #3d0d1a 40%, #7a1226 70%, #FF192C 100%)' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #FF192C, transparent)' }} />
          <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #ff8c94, transparent)' }} />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10 xl:p-14 justify-center">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-4xl font-black text-white mb-4">Forgot your password?</h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            No worries! Enter your email and we'll help you get back into your account in seconds.
          </p>
          <div className="mt-10 flex items-center gap-3 text-white/40 text-sm">
            <CheckCircle size={16} className="text-green-400" />
            Safe & secure password reset
          </div>
          <div className="mt-3 flex items-center gap-3 text-white/40 text-sm">
            <CheckCircle size={16} className="text-green-400" />
            Works with all legacy accounts
          </div>
        </div>
      </div>

      {/* Right panel */}
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

          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft size={16} /> Back to sign in
          </Link>

          {step === 'request' && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <Mail className="w-7 h-7 text-brand-500" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Reset Password</h1>
                <p className="text-gray-500">Enter the email linked to your account</p>
              </div>
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                    placeholder="your@email.com" required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {loading && <Loader2 size={17} className="animate-spin" />}
                  Send Reset Link
                </button>
              </form>
            </>
          )}

          {step === 'reset' && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">Set New Password</h1>
                <p className="text-gray-500">Enter your reset token and choose a new password</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reset Token</label>
                  <input type="text" value={token} onChange={e => setToken(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white font-mono placeholder-gray-400"
                    placeholder="Paste your reset token" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white pr-12 placeholder-gray-400"
                      placeholder="Min. 6 characters" required />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {loading && <Loader2 size={17} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">All Done! 🎉</h1>
              <p className="text-gray-500 mb-8">Your password has been updated successfully. You can now sign in with your new password.</p>
              <button onClick={() => setLocation('/login')}
                className="btn-primary px-8 py-3.5 text-sm font-bold rounded-2xl">
                Sign In Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
