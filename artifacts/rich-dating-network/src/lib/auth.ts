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
  age: number
  city: string
  country: string
  countryCode: string
  lastAccess: string
  bio?: string
  fake?: number
  admin?: number
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
