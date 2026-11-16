export interface PartnerAccount {
  id: number
  username: string
  displayName: string
  referralCode: string
}

export interface PartnerAuthState {
  token: string
  partner: PartnerAccount
}

const STORAGE_KEY = "rdn_partner_auth"

export function getStoredPartnerAuth(): PartnerAuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as PartnerAuthState
    return value?.token && value?.partner ? value : null
  } catch {
    return null
  }
}

export function setStoredPartnerAuth(state: PartnerAuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearStoredPartnerAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function partnerFetch(url: string, options: RequestInit = {}) {
  const auth = getStoredPartnerAuth()
  const headers = new Headers(options.headers)
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`)
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  return fetch(url, { ...options, headers })
}
