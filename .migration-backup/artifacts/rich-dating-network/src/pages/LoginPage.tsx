import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Heart, Eye, EyeOff, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [, setLocation] = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      setLocation('/home')
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-pink-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white fill-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 py-3">
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-brand-500 hover:text-brand-600 font-medium">Join Free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
