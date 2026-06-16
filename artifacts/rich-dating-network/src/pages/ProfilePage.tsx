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
    if (!token || !profileId) return
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
  }, [profileId, token])

  // Dynamic SEO: set title/meta once profile data loads
  useEffect(() => {
    if (!profileUser?.id) return
    const name = profileUser.name || profileUser.username || 'Profile'
    const age = profileUser.age ? String(profileUser.age) : ''
    const city = profileUser.city || profileUser.country || ''
    const bio: string = profileUser.userExtended?.bio || profileUser.bio || ''
    const username = profileUser.username

    const titleParts = [name, age ? `${age}` : null, city].filter(Boolean)
    const title = titleParts.join(', ') + ' | Rich Dating Network'
    document.title = title

    const description = bio
      ? bio.slice(0, 160)
      : `Meet ${name}${age ? `, ${age} years old` : ''}${city ? ` from ${city}` : ''}. View their full profile on Rich Dating Network.`

    upsertMeta('description', description)
    upsertMeta('og:title', title, true)
    upsertMeta('og:description', description, true)
    upsertMeta('og:type', 'profile', true)

    if (profileUser.photo) {
      const photoPath = getPhotoUrl(profileUser.photo)
      const photoUrl = photoPath.startsWith('http') ? photoPath : `${window.location.origin}${photoPath}`
      upsertMeta('og:image', photoUrl, true)
      upsertMeta('twitter:image', photoUrl)
    }

    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', title)
    upsertMeta('twitter:description', description)

    const canonical = username
      ? `https://richdatingnetwork.com/@${username}`
      : `https://richdatingnetwork.com/profile/${profileUser.id}`
    upsertLink('canonical', canonical)
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
