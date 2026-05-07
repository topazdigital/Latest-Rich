'use client'
import { useState } from 'react'
import { getPhotoUrl, isOnline, timeAgo, genderLabel } from '@/lib/utils'
import Link from 'next/link'
import { Heart, MessageCircle, BadgeCheck, Crown, MapPin, Calendar, Edit3, Camera, Gift, Video, Flag, Share2, Star, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props {
  user: any; photos: any[]; isOwnProfile: boolean;
  myId: number; hasLiked: boolean; isMatch: boolean;
}

export default function ProfileView({ user, photos, isOwnProfile, myId, hasLiked, isMatch }: Props) {
  const [liked, setLiked] = useState(hasLiked)
  const [activePhoto, setActivePhoto] = useState<string | null>(null)
  const router = useRouter()

  async function toggleLike() {
    const prev = liked
    setLiked(!liked)
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId: user.id }) })
      if (!prev) toast.success('💝 Liked!')
    } catch { setLiked(prev) }
  }

  const allPhotos = [
    ...(user.photo ? [{ id: 0, photo: user.photo, thumb: user.photoThumb }] : []),
    ...photos.filter(p => p.photo !== user.photo),
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="card overflow-hidden mb-4">
        <div className="relative h-72 md:h-96 bg-gray-200">
          <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
          <div className="gradient-bottom absolute inset-0" />
          {isOnline(user.lastAccess) && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-green-500 text-white text-xs px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
            </div>
          )}
          {user.premium === 1 && (
            <div className="absolute top-4 left-4 flex items-center gap-1 bg-gold-500 text-white text-xs px-2.5 py-1 rounded-full">
              <Crown size={12} /> VIP Member
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold">{user.name}</h1>
                  {user.verified === 1 && <BadgeCheck size={24} className="text-blue-300 fill-blue-300" />}
                </div>
                <div className="flex items-center gap-3 text-white/80 text-sm">
                  <span>{user.age} years</span>
                  <span>•</span>
                  <span>{genderLabel(user.gender)}</span>
                  {user.city && <><span>•</span><span className="flex items-center gap-1"><MapPin size={12} />{user.city}</span></>}
                </div>
              </div>
              {isOwnProfile && (
                <Link href="/settings/profile" className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                  <Edit3 size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="p-4 flex gap-3">
            <button onClick={toggleLike}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${liked ? 'bg-brand-500 text-white shadow-md' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>
              <Heart size={18} className={liked ? 'fill-white' : ''} />
              {liked ? 'Liked!' : 'Like'}
            </button>
            <Link href={`/chat/${user.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all">
              <MessageCircle size={18} /> Message
            </Link>
            <Link href={`/gifts/${user.id}`}
              className="w-12 flex items-center justify-center rounded-xl bg-yellow-50 hover:bg-yellow-100 text-yellow-600 transition-all">
              <Gift size={18} />
            </Link>
            <Link href={`/videocall/${user.id}`}
              className="w-12 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all">
              <Video size={18} />
            </Link>
          </div>
        )}

        {isMatch && !isOwnProfile && (
          <div className="mx-4 mb-4 p-3 bg-brand-50 rounded-xl text-center text-brand-600 text-sm font-medium">
            💝 It&apos;s a Match! You both liked each other.
          </div>
        )}
      </div>

      {/* About */}
      {user.bio && (
        <div className="card p-5 mb-4">
          <h3 className="font-bold text-gray-900 mb-3">About</h3>
          <p className="text-gray-600 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: user.bio?.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '') }} />
        </div>
      )}

      {/* Details */}
      <div className="card p-5 mb-4">
        <h3 className="font-bold text-gray-900 mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Looking for', value: user.looking === 1 ? 'Men' : user.looking === 2 ? 'Women' : 'Anyone' },
            { label: 'Country', value: user.country },
            { label: 'Joined', value: user.joinDate },
            { label: 'Last seen', value: isOnline(user.lastAccess) ? 'Online now' : timeAgo(user.lastAccess) },
            ...(user.userExtended ? [
              { label: 'Education', value: user.userExtended.education },
              { label: 'Occupation', value: user.userExtended.occupation },
              { label: 'Height', value: user.userExtended.height },
              { label: 'Body type', value: user.userExtended.bodyType },
              { label: 'Ethnicity', value: user.userExtended.ethnicity },
              { label: 'Religion', value: user.userExtended.religion },
              { label: 'Smoking', value: user.userExtended.smoking },
              { label: 'Drinking', value: user.userExtended.drinking },
              { label: 'Children', value: user.userExtended.children },
              { label: 'Relationship', value: user.userExtended.relationship },
            ] : []),
          ].filter(d => d.value).map((d, i) => (
            <div key={i}>
              <p className="text-xs text-gray-400">{d.label}</p>
              <p className="text-sm font-medium text-gray-800 capitalize">{d.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Photos grid */}
      {allPhotos.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Photos ({allPhotos.length})</h3>
            {isOwnProfile && (
              <Link href="/settings/photos" className="text-sm text-brand-500 hover:text-brand-600 flex items-center gap-1">
                <Camera size={14} /> Add
              </Link>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allPhotos.map((p, i) => (
              <button key={p.id || i} onClick={() => setActivePhoto(getPhotoUrl(p.photo))}
                className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt={`photo ${i+1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!isOwnProfile && (
        <div className="flex justify-center">
          <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <Flag size={14} /> Report this profile
          </button>
        </div>
      )}

      {/* Photo lightbox */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setActivePhoto(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={28} /></button>
          <img src={activePhoto} alt="photo" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  )
}
