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

  let p = photo

  // Strip same-domain absolute URLs — the old PHP site stored full absolute URLs in the DB.
  // With Apache proxying everything to Node.js, these would return index.html instead of the image.
  if (p.startsWith('http')) {
    const sameDomainPrefixes = [
      'https://richdatingnetwork.com/',
      'http://richdatingnetwork.com/',
      'https://www.richdatingnetwork.com/',
      'http://www.richdatingnetwork.com/',
      'https://test.richdatingnetwork.com/',
      'http://test.richdatingnetwork.com/',
    ]
    let stripped = false
    for (const prefix of sameDomainPrefixes) {
      if (p.startsWith(prefix)) { p = p.slice(prefix.length); stripped = true; break }
    }
    if (!stripped) return p  // genuinely external URL — return as-is
  }

  // Strip all known legacy directory prefixes so only the bare path goes to the uploads endpoint
  const prefixes = [
    '/assets/sources/uploads/',
    'assets/sources/uploads/',
    '/uploads/',
    'uploads/',
    '/photos/',
    'photos/',
  ]
  for (const prefix of prefixes) {
    if (p.startsWith(prefix)) { p = p.slice(prefix.length); break }
  }
  if (p.startsWith('/')) return p
  return `/api/uploads/${p}`
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
