export interface User {
  id: number
  name: string
  email: string
  photo: string
  photoThumb: string
  verified: number
  premium: number
  credits: number
  gender: number
  looking?: number
  age: number
  city: string
  country: string
  countryCode: string
  lastAccess: string
  bio?: string
  fake?: number
  admin?: number
  online?: number
  superlike?: number
  banned?: number
}

export interface AuthState {
  user: User | null
  token: string | null
}

export function getStoredAuth(): AuthState {
  try {
    const stored = localStorage.getItem('rdn_auth')
    if (stored) return JSON.parse(stored)
  } catch {}
  return { user: null, token: null }
}

export function setStoredAuth(state: AuthState) {
  localStorage.setItem('rdn_auth', JSON.stringify(state))
}

export function clearStoredAuth() {
  localStorage.removeItem('rdn_auth')
}

/** Authenticated fetch — automatically adds Authorization header from stored token */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const stored = getStoredAuth()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (stored.token) {
    headers['Authorization'] = `Bearer ${stored.token}`
  }
  const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
  const fullUrl = url.startsWith('/api') ? base + url : url
  return fetch(fullUrl, { ...options, headers })
}
