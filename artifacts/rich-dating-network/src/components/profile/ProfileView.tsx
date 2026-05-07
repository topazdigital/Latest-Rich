import { useState } from 'react'
import { getPhotoUrl, isOnline, genderLabel } from '../../lib/utils'
import { Link } from 'wouter'
import { Heart, MessageCircle, BadgeCheck, Crown, MapPin, Edit3, Gift, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  user: any; photos: any[]; isOwnProfile: boolean;
  myId: number; hasLiked: boolean; isMatch: boolean;
}

export default function ProfileView({ user, photos, isOwnProfile, myId, hasLiked, isMatch }: Props) {
  const [liked, setLiked] = useState(hasLiked)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const { token } = useAuth()

  async function toggleLike() {
    const prev = liked
    setLiked(!liked)
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId: user.id }) })
      if (!prev) toast.success('💝 Liked!')
    } catch { setLiked(prev) }
  }

  const allPhotos = [
    ...(user.photo ? [{ id: 0, photo: user.photo, thumb: user.photoThumb }] : []),
    ...photos.filter((p: any) => p.photo !== user.photo),
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="card overflow-hidden mb-4">
        <div className="relative h-72 md:h-96 bg-gray-200">
          <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {isOnline(user.lastAccess) && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
            </div>
          )}
          {user.premium === 1 && (
            <div className="absolute top-4 left-4 flex items-center gap-1 bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full">
              <Crown size={12} /> VIP Member
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold">{user.name}</h1>
                  {user.verified === 1 && <BadgeCheck size={24} className="text-blue-300" />}
                </div>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  <span>{user.age} years</span>
                  <span>•</span>
                  <span>{genderLabel(user.gender)}</span>
                  {user.city && <><span>•</span><span className="flex items-center gap-1"><MapPin size={12} />{user.city}</span></>}
                </div>
              </div>
              {isOwnProfile && (
                <Link href="/settings" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                  <Edit3 size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <div className="p-4 flex gap-3">
            <button onClick={toggleLike}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${liked ? 'bg-brand-500 text-white shadow-md' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>
              <Heart size={18} className={liked ? 'fill-white' : ''} />
              {liked ? 'Liked!' : 'Like'}
            </button>
            <Link href={`/chat/${user.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
              <MessageCircle size={18} /> Message
            </Link>
            {isMatch && (
              <div className="flex items-center gap-1 px-3 py-2 bg-brand-50 rounded-xl text-brand-600 text-sm font-medium">
                <Heart size={14} className="fill-brand-500 text-brand-500" /> Match!
              </div>
            )}
          </div>
        )}
      </div>

      {user.bio && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: user.bio }} />
        </div>
      )}

      {user.userExtended && Object.values(user.userExtended).some(v => v) && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Occupation', user.userExtended.occupation],
              ['Education', user.userExtended.education],
              ['Height', user.userExtended.height],
              ['Body Type', user.userExtended.bodyType],
              ['Ethnicity', user.userExtended.ethnicity],
              ['Religion', user.userExtended.religion],
              ['Smoking', user.userExtended.smoking],
              ['Drinking', user.userExtended.drinking],
              ['Children', user.userExtended.children],
              ['Relationship', user.userExtended.relationship],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-gray-800 font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {allPhotos.length > 0 && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">Photos ({allPhotos.length})</h2>
          <div className="grid grid-cols-3 gap-2">
            {allPhotos.map((p: any, i: number) => (
              <button key={p.id || i} onClick={() => setActivePhoto(p.photo)}
                className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <img src={getPhotoUrl(activePhoto)} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}
