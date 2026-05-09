import { useState, useEffect } from 'react'
import ProfileView from '../components/profile/ProfileView'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'wouter'

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
