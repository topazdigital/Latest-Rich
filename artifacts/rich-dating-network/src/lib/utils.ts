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
  // Strip all known legacy directory prefixes — only pass the bare filename to the uploads endpoint
  const prefixes = [
    '/assets/sources/uploads/',
    'assets/sources/uploads/',
    '/uploads/',
    'uploads/',
    '/photos/',
    'photos/',
  ]
  let filename = photo
  for (const p of prefixes) {
    if (filename.startsWith(p)) { filename = filename.slice(p.length); break }
  }
  if (filename.startsWith('/')) return filename
  return `/api/uploads/${filename}`
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

export function profileUrl(user: { id: number; username?: string | null }): string {
  return user?.username ? `/@${user.username}` : `/profile/${user.id}`
}

/** Decode HTML entities from legacy PHP data (e.g. &#039; → ', &amp; → &).
 *  Safe to call on any string — returns '' for null/undefined. */
export function htmlDecode(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}
