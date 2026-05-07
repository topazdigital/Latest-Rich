import { useState } from 'react'
import { getPhotoUrl, isOnline, genderLabel, timeAgo } from '../../lib/utils'
import { Link } from 'wouter'
import { Heart, MessageCircle, BadgeCheck, Crown, MapPin, Edit3, Gift, Flag, ShieldOff, ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  user: any; photos: any[]; isOwnProfile: boolean;
  myId: number; hasLiked: boolean; isMatch: boolean;
}

export default function ProfileView({ user, photos, isOwnProfile, myId, hasLiked, isMatch }: Props) {
  const [liked, setLiked] = useState(hasLiked)
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [blocked, setBlocked] = useState(false)
  const { token } = useAuth()

  const allPhotos = [
    ...(user.photo ? [{ id: 0, photo: user.photo, thumb: user.photoThumb }] : []),
    ...photos.filter((p: any) => p.photo !== user.photo),
  ]

  async function toggleLike() {
    const prev = liked
    setLiked(!liked)
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId: user.id }) })
      if (!prev) toast.success('💝 Liked!')
    } catch { setLiked(prev) }
  }

  async function blockUser() {
    if (!confirm(`Block ${user.name}? They won't be able to contact you.`)) return
    try {
      await fetch(`/api/block/${user.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      setBlocked(true)
      toast.success(`${user.name} has been blocked`)
    } catch { toast.error('Failed to block') }
  }

  async function submitReport() {
    if (!reportReason) { toast.error('Please select a reason'); return }
    try {
      await fetch(`/api/report/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reportReason }),
      })
      toast.success('Report submitted. Thank you for keeping our community safe.')
      setShowReportModal(false)
    } catch { toast.error('Failed to submit report') }
  }

  function navPhoto(dir: 1 | -1) {
    setActivePhotoIdx(prev => prev === null ? 0 : (prev + dir + allPhotos.length) % allPhotos.length)
  }

  if (blocked) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <ShieldOff size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{user.name} has been blocked</h2>
        <p className="text-gray-500 mb-6">They can no longer contact you or view your profile.</p>
        <Link href="/discover" className="btn-primary">Browse Members</Link>
      </div>
    )
  }

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
                {!isOnline(user.lastAccess) && user.lastAccess && Number(user.lastAccess) > 0 && (
                  <p className="text-white/60 text-xs mt-1">Last seen {timeAgo(user.lastAccess)}</p>
                )}
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
          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <button onClick={toggleLike}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${liked ? 'bg-brand-500 text-white shadow-md' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>
                <Heart size={18} className={liked ? 'fill-white' : ''} />
                {liked ? 'Liked!' : 'Like'}
              </button>
              <Link href={`/chat/${user.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                <MessageCircle size={18} /> Message
              </Link>
              <Link href={`/gifts?toId=${user.id}`}
                className="flex items-center justify-center px-4 py-3 rounded-xl font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all" title="Send a gift">
                <Gift size={18} />
              </Link>
            </div>
            {isMatch && (
              <div className="flex items-center justify-center gap-2 py-2 bg-brand-50 rounded-xl text-brand-600 text-sm font-medium">
                <Heart size={14} className="fill-brand-500 text-brand-500" /> You matched with {user.name}! 💬
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={blockUser}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                <ShieldOff size={13} /> Block
              </button>
              <button onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50">
                <Flag size={13} /> Report
              </button>
            </div>
          </div>
        )}
      </div>

      {user.bio && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: user.bio }} />
        </div>
      )}

      {user.userExtended && Object.values(user.userExtended).some((v: any) => v && v !== '') && (
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
              <button key={p.id || i} onClick={() => setActivePhotoIdx(i)}
                className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activePhotoIdx !== null && allPhotos[activePhotoIdx] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setActivePhotoIdx(null)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
            onClick={() => setActivePhotoIdx(null)}>
            <X size={20} />
          </button>
          {allPhotos.length > 1 && <>
            <button className="absolute left-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
              onClick={e => { e.stopPropagation(); navPhoto(-1) }}>
              <ChevronLeft size={20} />
            </button>
            <button className="absolute right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
              onClick={e => { e.stopPropagation(); navPhoto(1) }}>
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-6 flex gap-1.5">
              {allPhotos.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activePhotoIdx ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          </>}
          <img src={getPhotoUrl(allPhotos[activePhotoIdx].photo)} alt="" className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()} />
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-1">Report {user.name}</h3>
            <p className="text-sm text-gray-500 mb-4">Help us keep the community safe. Select a reason:</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {['Fake profile', 'Harassment', 'Spam', 'Inappropriate content', 'Scam', 'Other'].map(r => (
                <button key={r} onClick={() => setReportReason(r)}
                  className={`text-sm py-2 px-3 rounded-xl border-2 text-left transition-all ${reportReason === r ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowReportModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={submitReport} disabled={!reportReason} className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">Submit Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
