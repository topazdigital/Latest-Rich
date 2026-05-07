import { useState, useEffect, createContext, useContext } from 'react'
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '../lib/auth'

interface AuthUser {
  id: number
  name: string
  email: string
  photo: string
  photoThumb: string
  verified: number
  premium: number
  credits: number
  gender: number
  age: number
  city: string
  country: string
  countryCode: string
  lastAccess: string
  bio?: string
  fake?: number
  admin?: number
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredAuth()
    if (stored.token && stored.user) {
      setUser(stored.user as AuthUser)
      setToken(stored.token)
      fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${stored.token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setUser(data)
            setStoredAuth({ user: data, token: stored.token })
          } else {
            clearStoredAuth()
            setUser(null)
            setToken(null)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    setUser(data.user)
    setToken(data.token)
    setStoredAuth({ user: data.user, token: data.token })
  }

  function logout() {
    clearStoredAuth()
    setUser(null)
    setToken(null)
  }

  async function refreshUser() {
    if (!token) return
    const res = await fetch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      setUser(data)
      setStoredAuth({ user: data, token })
    }
  }

  return { user, token, loading, login, logout, refreshUser }
}
