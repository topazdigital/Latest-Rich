import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Loader2, Eye, EyeOff, CheckCircle, XCircle, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { setStoredAuth } from '../lib/auth'

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation()
  const [token, setToken] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      validateToken(t)
    } else {
      setTokenValid(false)
    }
  }, [])

  async function validateToken(t: string) {
    try {
      const res = await fetch(`/api/auth/reset-password/${t}`)
      const data = await res.json()
      setTokenValid(data.valid === true)
    } catch {
      setTokenValid(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Reset failed'); return }

      if (data.token && data.user) {
        setStoredAuth({ token: data.token, user: data.user })
        toast.success('Password reset! Welcome back 🎉')
        setDone(true)
        setTimeout(() => setLocation('/home'), 2000)
      } else {
        setDone(true)
        toast.success('Password updated! You can now sign in.')
      }
    } catch {
      toast.error('Something went wrong')
    } finally { setLoading(false) }
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
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-4xl font-black text-white mb-4">Create a new password</h2>
          <p className="text-white/60 text-lg leading-relaxed max-w-sm">
            Choose a strong password to keep your account secure. You'll be signed in automatically after resetting.
          </p>
          <div className="mt-10 space-y-3">
            {['Use at least 6 characters', 'Mix letters and numbers', 'Never share your password'].map((t, i) => (
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

          {tokenValid === null && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
              <p className="text-gray-500">Validating reset link...</p>
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-3">Link Expired</h1>
              <p className="text-gray-500 mb-8">This password reset link is invalid or has expired. Please request a new one.</p>
              <Link href="/forgot-password"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-2xl font-bold text-white text-sm shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                Request New Link
              </Link>
            </div>
          )}

          {tokenValid === true && !done && (
            <>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-brand-500" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-2">New Password</h1>
                <p className="text-gray-500">Choose a strong password for your account</p>
              </div>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white pr-12 placeholder-gray-400"
                      placeholder="Min. 6 characters" required minLength={6} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white placeholder-gray-400"
                    placeholder="Repeat your password" required />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">Passwords don't match</p>
                  )}
                </div>
                <button type="submit" disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
                  {loading && <Loader2 size={17} className="animate-spin" />}
                  Reset Password & Sign In
                </button>
              </form>
            </>
          )}

          {done && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 mb-3">All Done! 🎉</h1>
              <p className="text-gray-500 mb-4">Your password has been updated. Signing you in now...</p>
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
