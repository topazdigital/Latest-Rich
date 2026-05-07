import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(timestamp: number | string) {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  if (!ts || ts === 0) return 'recently'
  try {
    return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true })
  } catch {
    return 'recently'
  }
}

export function formatDate(timestamp: number | string) {
  const ts = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  if (!ts) return ''
  try {
    return format(new Date(ts * 1000), 'MMM d, yyyy')
  } catch {
    return ''
  }
}

export function getPhotoUrl(photo: string | null | undefined): string {
  if (!photo) return '/images/default-avatar.svg'
  if (photo.startsWith('http')) return photo
  if (photo.startsWith('/')) return photo
  return `/api/uploads/${photo}`
}

export function isOnline(lastAccess: string | null | undefined): boolean {
  if (!lastAccess) return false
  const ts = parseInt(lastAccess)
  if (!ts) return false
  return Date.now() / 1000 - ts < 300
}

export function truncate(text: string, length: number): string {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

export function genderLabel(gender: number): string {
  const genders: Record<number, string> = { 1: 'Male', 2: 'Female', 3: 'Non-binary', 4: 'Other' }
  return genders[gender] || 'Unknown'
}

export function currencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', KES: 'KSh', TZS: 'TSh', UGX: 'USh',
  }
  return symbols[currency] || currency
}

export function supportsMpesa(countryCode: string): boolean {
  return ['KE', 'TZ', 'UG', 'RW', 'ET', 'GH'].includes(countryCode?.toUpperCase())
}
