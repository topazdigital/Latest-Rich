import { useState, useRef } from 'react'
import { getPhotoUrl, isOnline, genderLabel, timeAgo } from '../../lib/utils'
import { Link, useLocation } from 'wouter'
import { Heart, MessageCircle, BadgeCheck, Crown, MapPin, Edit3, Gift, Flag, ShieldOff, ChevronLeft, ChevronRight, X, Send, Video, Smile } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { INTERESTS } from '../settings/SettingsPage'

interface Props {
  user: any; photos: any[]; isOwnProfile: boolean;
  myId: number; hasLiked: boolean; isMatch: boolean;
  myInterests?: string[];
}

function calcZodiac(birthday: string): string {
  if (!birthday) return ''
  const d = new Date(birthday)
  const month = d.getMonth() + 1
  const day = d.getDate()
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '♈ Aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '♉ Taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return '♊ Gemini'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return '♋ Cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '♌ Leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '♍ Virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return '♎ Libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return '♏ Scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return '♐ Sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '♑ Capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '♒ Aquarius'
  return '♓ Pisces'
}

function calcAge(birthday: string): number | null {
  if (!birthday) return null
  const d = new Date(birthday)
  const t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  const m = t.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) age--
  return age
}

function calcCompatibility(myInterests: string[], theirInterests: string[]): number | null {
  if (!myInterests.length || !theirInterests.length) return null
  const shared = myInterests.filter(i => theirInterests.includes(i)).length
  const union = new Set([...myInterests, ...theirInterests]).size
  return Math.round((shared / union) * 100)
}

function lookingForLabel(val: any): string {
  const map: Record<string, string> = { '1': 'Men', '2': 'Women', '3': 'Everyone', 'm': 'Men', 'f': 'Women', 'both': 'Everyone' }
  return map[String(val)] || String(val || '')
}

const QUICK_MESSAGES = [
  "Hey! I came across your profile and I'd love to chat 😊",
  "Your profile really caught my eye! How are you?",
  "Hi there! You seem really interesting, let's talk!",
]

export default function ProfileView({ user, photos, isOwnProfile, myId, hasLiked, isMatch, myInterests = [] }: Props) {
  const [liked, setLiked] = useState(hasLiked)
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const msgRef = useRef<HTMLInputElement>(null)
  const [, setLocation] = useLocation()
  const { token } = useAuth()

  const allPhotos = [
    ...(user.photo ? [{ id: 0, photo: user.photo, thumb: user.photoThumb }] : []),
    ...photos.filter((p: any) => p.photo !== user.photo),
  ]

  // Interests
  const userInterests: string[] = (() => {
    try { return JSON.parse(user.userExtended?.interests || '[]') } catch { return [] }
  })()
  const interestDetails = userInterests
    .map(id => INTERESTS.find(i => i.id === id))
    .filter(Boolean) as typeof INTERESTS

  // Shared interests
  const sharedInterestIds = myInterests.filter(i => userInterests.includes(i))
  const sharedInterestDetails = sharedInterestIds
    .map(id => INTERESTS.find(i => i.id === id))
    .filter(Boolean) as typeof INTERESTS

  const compatibility = !isOwnProfile ? calcCompatibility(myInterests, userInterests) : null

  // Age — live calculated from birthday if available
  const displayAge = user.birthday ? calcAge(user.birthday) ?? user.age : user.age
  const zodiac = user.birthday ? calcZodiac(user.birthday) : ''

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

  async function sendMessage(text?: string) {
    const message = (text || msgText).trim()
    if (!message) { msgRef.current?.focus(); return }
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ toUserId: user.id, message }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Message sent!')
        setLocation(`/chat/${user.id}`)
      } else if (data.error === 'Insufficient credits') {
        toast.error(`Not enough credits (need ${data.creditsNeeded})`)
        setLocation('/credits')
      } else if (data.error === 'premium_required') {
        toast.error('Upgrade to Premium to share contact info')
      } else {
        toast.error(data.error || 'Failed to send')
      }
    } catch { toast.error('Failed to send') }
    finally { setSending(false) }
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
      {/* Hero photo card */}
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
          {/* Compatibility badge on photo */}
          {compatibility !== null && compatibility > 0 && (
            <div className={`absolute bottom-20 right-4 flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-sm ${compatibility >= 70 ? 'bg-green-500/90' : compatibility >= 40 ? 'bg-brand-500/90' : 'bg-gray-500/70'}`}>
              {compatibility}% Match
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-bold">{user.name}</h1>
                  {user.verified === 1 && (
                    <div title="Verified member">
                      <BadgeCheck size={26} className="text-blue-400 drop-shadow" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-white/80 text-sm flex-wrap">
                  {displayAge && displayAge > 0 && <span>{displayAge} years</span>}
                  {zodiac && <><span>•</span><span>{zodiac}</span></>}
                  {genderLabel(user.gender) && genderLabel(user.gender) !== 'Unknown' && <><span>•</span><span>{genderLabel(user.gender)}</span></>}
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

        {/* Bio snippet */}
        {user.bio && (
          <div className="px-5 pt-4 pb-2">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: user.bio }} />
          </div>
        )}

        {!isOwnProfile && (
          <div className="p-4 space-y-3">
            {/* Inline message compose — like DateMyAge */}
            <div className="relative">
              <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 py-2 focus-within:border-brand-400 transition-colors bg-white">
                <input
                  ref={msgRef}
                  type="text"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={`Type a message to ${user.name}...`}
                  className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowQuick(p => !p)}
                  className="text-gray-400 hover:text-brand-500 transition-colors p-1"
                  title="Quick messages">
                  <Smile size={18} />
                </button>
              </div>
              {/* Quick message picker */}
              {showQuick && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-10">
                  {QUICK_MESSAGES.map((q, i) => (
                    <button key={i} onClick={() => { setMsgText(q); setShowQuick(false); msgRef.current?.focus() }}
                      className="w-full text-left text-sm px-4 py-3 hover:bg-brand-50 hover:text-brand-700 border-b border-gray-50 last:border-0 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => sendMessage()}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-60 shadow-sm">
                <Send size={16} /> {sending ? 'Sending…' : 'Chat Now'}
              </button>
              <button onClick={toggleLike}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${liked ? 'bg-brand-500 text-white shadow-md' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>
                <Heart size={18} className={liked ? 'fill-white' : ''} />
                {liked ? 'Liked' : 'Like'}
              </button>
              <Link href={`/chat/${user.id}`}
                className="flex items-center justify-center px-4 py-3 rounded-xl font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all" title="Open full chat">
                <MessageCircle size={18} />
              </Link>
              <Link href={`/gifts?toId=${user.id}`}
                className="flex items-center justify-center px-4 py-3 rounded-xl font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all" title="Send a gift">
                <Gift size={18} />
              </Link>
            </div>

            {isMatch && (
              <div className="flex items-center justify-center gap-2 py-2 bg-brand-50 rounded-xl text-brand-600 text-sm font-medium">
                <Heart size={14} className="fill-brand-500 text-brand-500" /> You matched with {user.name}! Start chatting 💬
              </div>
            )}

            {/* Shared interests teaser */}
            {sharedInterestDetails.length > 0 && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 text-sm">
                <span className="text-green-600 font-semibold text-xs uppercase tracking-wide flex-shrink-0">You both love</span>
                <div className="flex flex-wrap gap-1.5">
                  {sharedInterestDetails.slice(0, 5).map(i => (
                    <span key={i.id} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: i.color }}>
                      {i.emoji} {i.label}
                    </span>
                  ))}
                  {sharedInterestDetails.length > 5 && <span className="text-xs text-green-600 font-medium">+{sharedInterestDetails.length - 5} more</span>}
                </div>
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

      {/* Looking For + About Me — two column on md */}
      {(user.looking || user.userExtended?.relationship || user.userExtended?.idealDate) && !isOwnProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {user.looking && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-lg">💞</span> I'm Looking For
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-16 flex-shrink-0">Gender</span>
                  <span className="font-medium">{lookingForLabel(user.looking)}</span>
                </div>
                {user.userExtended?.relationship && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-16 flex-shrink-0">Relation</span>
                    <span className="font-medium">{user.userExtended.relationship}</span>
                  </div>
                )}
                {user.ageMin && user.ageMax && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs w-16 flex-shrink-0">Age</span>
                    <span className="font-medium">{user.ageMin}–{user.ageMax} years</span>
                  </div>
                )}
                {user.userExtended?.idealDate && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-gray-400 text-xs mb-1">My ideal date</p>
                    <p className="text-gray-700 leading-relaxed">{user.userExtended.idealDate}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {user.userExtended?.passions && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-lg">🔥</span> My Passions
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">{user.userExtended.passions}</p>
            </div>
          )}
        </div>
      )}

      {/* Interests section */}
      {interestDetails.length > 0 && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">My Interests</h2>
          <div className="flex flex-wrap gap-2">
            {interestDetails.map(interest => {
              const isShared = sharedInterestIds.includes(interest.id)
              return (
                <div
                  key={interest.id}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-sm font-medium shadow-sm transition-transform ${isShared && !isOwnProfile ? 'ring-2 ring-offset-1 ring-white scale-105' : ''}`}
                  style={{ background: interest.color }}
                  title={isShared && !isOwnProfile ? 'You both have this interest!' : ''}>
                  <span>{interest.emoji}</span>
                  <span>{interest.label}</span>
                  {isShared && !isOwnProfile && <span className="text-white/80 text-xs">✓</span>}
                </div>
              )
            })}
          </div>
          {sharedInterestDetails.length > 0 && !isOwnProfile && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              ✓ You share {sharedInterestDetails.length} interest{sharedInterestDetails.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Details grid */}
      {user.userExtended && Object.values(user.userExtended).some((v: any) => v && v !== '' && v !== '[]') && (
        <div className="card p-5 mb-4">
          <h2 className="font-semibold text-gray-900 mb-3">About Me</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {zodiac && (
              <div>
                <p className="text-gray-400 text-xs">Zodiac</p>
                <p className="text-gray-800 font-medium">{zodiac}</p>
              </div>
            )}
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
              ['Languages', user.userExtended.languages],
            ].filter(([, v]) => v && v !== '[]').map(([label, value]) => (
              <div key={label as string}>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-gray-800 font-medium">{value}</p>
              </div>
            ))}
          </div>
          {user.userExtended.selfDescription && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-gray-400 text-xs mb-1">In their own words</p>
              <p className="text-gray-700 text-sm leading-relaxed italic">"{user.userExtended.selfDescription}"</p>
            </div>
          )}
        </div>
      )}

      {/* Photo grid */}
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

      {/* Lightbox */}
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

      {/* Report modal */}
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
