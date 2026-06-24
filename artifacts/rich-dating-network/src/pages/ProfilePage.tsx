import { useState, useEffect } from 'react'
import ProfileView from '../components/profile/ProfileView'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'wouter'
import { getPhotoUrl } from '../lib/utils'

function upsertMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
  el.setAttribute('content', content)
}
function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el) }
  el.setAttribute('href', href)
}
function upsertJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

interface Props { params: { id: string } }

export default function ProfilePage({ params }: Props) {
  const [profileUser, setProfileUser] = useState<any>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [hasLiked, setHasLiked] = useState(false)
  const [isMatch, setIsMatch] = useState(false)
  const [myInterests, setMyInterests] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()
  const profileId = parseInt(params.id)

  // Record visit (fire-and-forget, once per page load for non-own profiles)
  useEffect(() => {
    if (!token || !profileId || user?.id === profileId) return
    fetch(`/api/visits/${profileId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  }, [profileId, token, user?.id])

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    if (token) {
      // Authenticated: fetch full profile + like status + my info
      Promise.all([
        fetch(`/api/users/${profileId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/users/${profileId}/photos`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/users/${profileId}/liked-status`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`/api/users/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]).then(([u, ph, likeStatus, me]) => {
        setProfileUser(u)
        setPhotos(Array.isArray(ph) ? ph : [])
        setHasLiked(likeStatus?.hasLiked || false)
        setIsMatch(likeStatus?.isMatch || false)
        try { setMyInterests(JSON.parse(me?.userExtended?.interests || '[]')) } catch { setMyInterests([]) }
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      // Unauthenticated (Googlebot, share links): use public endpoint — no auth needed
      fetch(`/api/users/public/${profileId}`)
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u?.id) setProfileUser(u) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [profileId, token])

  // Dynamic SEO + JSON-LD: set title/meta/structured-data once profile data loads
  useEffect(() => {
    if (!profileUser?.id) return
    const name = profileUser.name || profileUser.username || 'Profile'
    const age = profileUser.age ? String(profileUser.age) : ''
    const city = profileUser.city || ''
    const country = profileUser.country || ''
    const bio: string = profileUser.userExtended?.bio || profileUser.bio || ''
    const occupation: string = profileUser.userExtended?.occupation || profileUser.occupation || ''
    const username = profileUser.username

    // Page title — e.g. "Wagner, 53, Orlando | Rich Dating Network"
    const titleParts = [name, age || null, city || null].filter(Boolean)
    const title = titleParts.join(', ') + ' | Rich Dating Network'
    document.title = title

    // Meta description — keyword-rich, naturally written
    const locationStr = city && country ? `${city}, ${country}` : city || country
    const descParts = [`Meet ${name}${age ? `, ${age}` : ''}${locationStr ? ` from ${locationStr}` : ''} on Rich Dating Network.`]
    if (occupation) descParts.push(`${occupation}.`)
    if (bio) descParts.push(bio.slice(0, 100))
    descParts.push('Connect with verified wealthy singles on the #1 luxury dating platform.')
    const description = descParts.join(' ').slice(0, 300)

    upsertMeta('description', description)
    upsertMeta('robots', 'index, follow')

    // Open Graph
    upsertMeta('og:title', title, true)
    upsertMeta('og:description', description, true)
    upsertMeta('og:type', 'profile', true)
    upsertMeta('og:site_name', 'Rich Dating Network', true)

    // Canonical URL
    const canonical = username
      ? `https://richdatingnetwork.com/@${username}`
      : `https://richdatingnetwork.com/profile/${profileUser.id}`
    upsertLink('canonical', canonical)
    upsertMeta('og:url', canonical, true)

    // Profile photo in OG + Twitter
    if (profileUser.photo) {
      const photoPath = getPhotoUrl(profileUser.photo)
      const photoUrl = photoPath.startsWith('http') ? photoPath : `${window.location.origin}${photoPath}`
      upsertMeta('og:image', photoUrl, true)
      upsertMeta('og:image:width', '800', true)
      upsertMeta('og:image:height', '800', true)
      upsertMeta('og:image:alt', `${name} — Rich Dating Network`, true)
      upsertMeta('twitter:image', photoUrl)
      upsertMeta('twitter:image:alt', `${name} on Rich Dating Network`)
    }

    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', title)
    upsertMeta('twitter:description', description)
    upsertMeta('twitter:site', '@richdatingnet')

    // JSON-LD Person schema — tells Google exactly who this page is about
    const locationSchema = locationStr ? { '@type': 'Place', name: locationStr } : undefined
    const photoPath = profileUser.photo ? getPhotoUrl(profileUser.photo) : null
    const photoAbsUrl = photoPath
      ? (photoPath.startsWith('http') ? photoPath : `https://richdatingnetwork.com${photoPath}`)
      : null
    upsertJsonLd('profile-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      ...(age ? { age: parseInt(age) } : {}),
      ...(locationSchema ? { homeLocation: locationSchema } : {}),
      ...(bio ? { description: bio.slice(0, 300) } : {}),
      ...(occupation ? { jobTitle: occupation } : {}),
      ...(photoAbsUrl ? { image: photoAbsUrl } : {}),
      url: canonical,
      memberOf: {
        '@type': 'Organization',
        name: 'Rich Dating Network',
        url: 'https://richdatingnetwork.com',
      },
    })

    // BreadcrumbList for Google to show site hierarchy
    upsertJsonLd('breadcrumb-jsonld', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Rich Dating Network', item: 'https://richdatingnetwork.com' },
        { '@type': 'ListItem', position: 2, name: 'Members', item: 'https://richdatingnetwork.com/discover' },
        { '@type': 'ListItem', position: 3, name: name, item: canonical },
      ],
    })
  }, [profileUser])

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
      <div className="h-72 bg-gray-200 rounded-2xl mb-4" />
      <div className="h-32 bg-gray-200 rounded-2xl mb-4" />
    </div>
  )

  if (!profileUser?.id) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Profile not found</h2>
      <p className="text-gray-500 text-sm mb-6">This profile may have been removed or doesn't exist.</p>
      <Link href="/discover" className="btn-primary">Browse Members</Link>
    </div>
  )

  // Guest view (unauthenticated) — show profile info with a join CTA instead of messaging actions
  if (!token) return (
    <div className="max-w-lg mx-auto px-0 sm:px-4 py-0 sm:py-4">
      <div className="card overflow-hidden mb-3 rounded-none sm:rounded-2xl shadow-xl">
        <div className="relative bg-gray-900 overflow-hidden" style={{ aspectRatio: '4/5', maxHeight: '520px', minHeight: '300px' }}>
          <img
            src={getPhotoUrl(profileUser.photo || profileUser.photoThumb)}
            alt={profileUser.name || 'Profile'}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="text-3xl font-bold text-white mb-1">
              {profileUser.name}{profileUser.age ? `, ${profileUser.age}` : ''}
            </h1>
            {profileUser.city && (
              <p className="text-white/80 text-sm mb-3">📍 {profileUser.city}{profileUser.country ? `, ${profileUser.country}` : ''}</p>
            )}
            {profileUser.userExtended?.occupation || profileUser.occupation ? (
              <p className="text-white/70 text-sm mb-3">💼 {profileUser.userExtended?.occupation || profileUser.occupation}</p>
            ) : null}
          </div>
        </div>
        <div className="p-5 space-y-3">
          {(profileUser.userExtended?.bio || profileUser.bio) && (
            <p className="text-gray-600 text-sm leading-relaxed">{profileUser.userExtended?.bio || profileUser.bio}</p>
          )}
          <div className="bg-gradient-to-r from-brand-50 to-pink-50 rounded-2xl p-4 text-center">
            <p className="font-semibold text-gray-900 mb-1">Want to connect with {profileUser.name}?</p>
            <p className="text-gray-500 text-sm mb-3">Join Rich Dating Network free and start messaging verified wealthy singles today.</p>
            <Link href="/register" className="btn-primary w-full block text-center">Join Free — Start Chatting</Link>
          </div>
          <p className="text-center text-sm text-gray-400">
            Already a member? <Link href="/login" className="text-brand-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <ProfileView
      user={profileUser}
      photos={photos}
      isOwnProfile={user?.id === profileId}
      myId={user?.id || 0}
      hasLiked={hasLiked}
      isMatch={isMatch}
      myInterests={myInterests}
    />
  )
}
