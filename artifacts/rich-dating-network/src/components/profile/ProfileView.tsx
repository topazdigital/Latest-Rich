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

const REPORT_REASONS = [
  "Fake profile",
  "Inappropriate photos",
  "Harassment or abuse",
  "Spam or scam",
  "Underage user",
  "Other",
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

  const userInterests: string[] = (() => {
    try { return JSON.parse(user.userExtended?.interests || '[]') } catch { return [] }
  })()
  const interestDetails = userInterests
    .map(id => INTERESTS.find(i => i.id === id))
    .filter(Boolean) as typeof INTERESTS

  const sharedInterestIds = myInterests.filter(i => userInterests.includes(i))
  const sharedInterestDetails = sharedInterestIds
    .map(id => INTERESTS.find(i => i.id === id))
    .filter(Boolean) as typeof INTERESTS

  const compatibility = !isOwnProfile ? calcCompatibility(myInterests, userInterests) : null
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
      setReportReason('')
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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShieldOff size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{user.name} has been blocked</h2>
        <p className="text-gray-500 mb-6">They can no longer contact you or view your profile.</p>
        <Link href="/discover" className="btn-primary">Browse Members</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-0 sm:px-4 py-0 sm:py-4">
      {/* Hero photo card — full-height with all overlaid info */}
      <div className="card overflow-hidden mb-4 rounded-none sm:rounded-2xl">
        <div className="relative bg-gray-900" style={{ minHeight: '480px', height: 'min(75vw, 560px)' }}>
          {/* Main photo */}
          <img
            src={getPhotoUrl(user.photoThumb || user.photo)}
            alt={user.name || 'Profile'}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient — strong at bottom for readability */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 35%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.90) 100%)' }} />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
            <div className="flex flex-col gap-1.5">
              {user.premium === 1 && (
                <div className="flex items-center gap-1 bg-amber-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-lg">
                  <Crown size={11} /> VIP Member
                </div>
              )}
              {compatibility !== null && compatibility > 0 && (
                <div className={`flex items-center gap-1.5 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg ${compatibility >= 70 ? 'bg-green-500' : compatibility >= 40 ? 'bg-brand-500' : 'bg-gray-500/80'}`}>
                  {compatibility}% Match
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isOnline(user.lastAccess) && (
                <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> Online
                </div>
              )}
              {isOwnProfile && (
                <Link href="/settings" className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                  <Edit3 size={16} className="text-white" />
                </Link>
              )}
            </div>
          </div>

          {/* Bottom overlay — name + details + message input */}
          <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
            {/* Name & meta */}
            <div className="mb-3">
              <div className="flex items-end gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                  {user.name || (isOwnProfile ? 'Your Profile' : 'Member')}
                </h1>
                {user.verified === 1 && (
                  <span title="Verified member"><BadgeCheck size={22} className="text-blue-400 drop-shadow mb-0.5 flex-shrink-0" /></span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-white/85 text-sm">
                {displayAge && displayAge > 0 && <span className="font-medium">{displayAge} yrs</span>}
                {zodiac && <><span className="text-white/50">·</span><span>{zodiac}</span></>}
                {genderLabel(user.gender) && genderLabel(user.gender) !== 'Unknown' && <><span className="text-white/50">·</span><span>{genderLabel(user.gender)}</span></>}
                {user.city && (
                  <><span className="text-white/50">·</span>
                  <span className="flex items-center gap-1"><MapPin size={11} />{user.city}</span></>
                )}
              </div>
              {!isOnline(user.lastAccess) && user.lastAccess && Number(user.lastAccess) > 0 && (
                <p className="text-white/55 text-xs mt-0.5">Last seen {timeAgo(user.lastAccess)}</p>
              )}
            </div>

            {/* Message compose area — inside photo */}
            {!isOwnProfile && (
              <div className="space-y-2">
                <div className="relative">
                  <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-lg">
                    <input
                      ref={msgRef}
                      type="text"
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage()}
                      placeholder={`Message ${user.name}…`}
                      className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400 min-w-0"
                    />
                    <button type="button" onClick={() => setShowQuick(p => !p)}
                      className="text-gray-400 hover:text-brand-500 transition-colors p-0.5 flex-shrink-0">
                      <Smile size={17} />
                    </button>
                    <button type="button" onClick={() => sendMessage()} disabled={sending}
                      className="bg-brand-500 hover:bg-brand-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-1 flex-shrink-0 disabled:opacity-60">
                      <Send size={13} /> {sending ? '…' : 'Send'}
                    </button>
                  </div>
                  {showQuick && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
                      {QUICK_MESSAGES.map((q, i) => (
                        <button key={i} onClick={() => { setMsgText(q); setShowQuick(false); msgRef.current?.focus() }}
                          className="w-full text-left text-sm px-4 py-2.5 hover:bg-brand-50 hover:text-brand-700 border-b border-gray-50 last:border-0 transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action row */}
                <div className="flex gap-2">
                  <button onClick={() => sendMessage()} disabled={sending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-sm bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-60 shadow-md">
                    <MessageCircle size={15} /> Chat Now
                  </button>
                  <button onClick={toggleLike}
                    className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${liked ? 'bg-brand-500 text-white' : 'bg-white/90 text-brand-500 hover:bg-brand-500 hover:text-white'}`}>
                    <Heart size={15} className={liked ? 'fill-white' : ''} />
                    {liked ? 'Liked' : 'Like'}
                  </button>
                  <Link href={`/gifts?toId=${user.id}`}
                    className="flex items-center justify-center px-3.5 py-2.5 rounded-xl font-semibold bg-amber-500/90 text-white hover:bg-amber-500 transition-all shadow-md" title="Send a gift">
                    <Gift size={15} />
                  </Link>
                </div>
              </div>
            )}

            {/* Own profile CTA */}
            {isOwnProfile && (!user.name || !user.bio) && (
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3">
                <Edit3 size={16} className="text-white flex-shrink-0" />
                <p className="text-white/90 text-sm flex-1">Complete your profile to get more matches</p>
                <Link href="/settings" className="bg-white text-brand-600 text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0">Edit</Link>
              </div>
            )}
          </div>
        </div>

        {/* Action footer — bio + match + block/report */}
        {!isOwnProfile && (
          <div className="px-4 py-3">
            {user.bio && (
              <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-3" dangerouslySetInnerHTML={{ __html: user.bio }} />
            )}
            {isMatch && (
              <div className="flex items-center justify-center gap-2 py-2 mb-2 bg-brand-50 rounded-xl text-brand-600 text-sm font-medium">
                <Heart size={14} className="fill-brand-500 text-brand-500" /> You matched with {user.name}! 💬
              </div>
            )}
            {sharedInterestDetails.length > 0 && (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2 text-sm mb-2">
                <span className="text-green-600 font-semibold text-xs uppercase tracking-wide flex-shrink-0">You both love</span>
                <div className="flex flex-wrap gap-1">
                  {sharedInterestDetails.slice(0, 4).map(i => (
                    <span key={i.id} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ background: i.color }}>
                      {i.emoji} {i.label}
                    </span>
                  ))}
                  {sharedInterestDetails.length > 4 && <span className="text-xs text-green-600 font-medium">+{sharedInterestDetails.length - 4}</span>}
                </div>
              </div>
            )}
            <div className="flex gap-1 pt-1 border-t border-gray-100">
              <button onClick={blockUser}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50">
                <ShieldOff size={12} /> Block
              </button>
              <button onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50">
                <Flag size={12} /> Report
              </button>
            </div>
          </div>
        )}
        {isOwnProfile && user.bio && (
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-gray-600 text-sm leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: user.bio }} />
          </div>
        )}
      </div>

      {/* Looking For + Passions */}
      {(user.looking || user.userExtended?.relationship || user.userExtended?.idealDate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 px-0 sm:px-0">
          {user.looking && (
            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 mb-2.5 flex items-center gap-2 text-sm">
                <span className="text-base">💞</span> I'm Looking For
              </h2>
              <div className="space-y-1.5 text-sm text-gray-700">
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
                    <span className="font-medium">{user.ageMin}–{user.ageMax} yrs</span>
                  </div>
                )}
                {user.userExtended?.idealDate && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-gray-400 text-xs mb-1">Ideal date</p>
                    <p className="text-gray-700 leading-relaxed">{user.userExtended.idealDate}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {user.userExtended?.passions && (
            <div className="card p-4">
              <h2 className="font-semibold text-gray-900 mb-2.5 flex items-center gap-2 text-sm">
                <span className="text-base">🔥</span> My Passions
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">{user.userExtended.passions}</p>
            </div>
          )}
        </div>
      )}

      {/* Interests */}
      {interestDetails.length > 0 && (
        <div className="card p-4 mb-3">
          <h2 className="font-semibold text-gray-900 mb-2.5 text-sm">My Interests</h2>
          <div className="flex flex-wrap gap-1.5">
            {interestDetails.map(interest => {
              const isShared = sharedInterestIds.includes(interest.id)
              return (
                <div
                  key={interest.id}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white text-xs font-medium shadow-sm ${isShared && !isOwnProfile ? 'ring-2 ring-offset-1 ring-white scale-105' : ''}`}
                  style={{ background: interest.color }}>
                  <span>{interest.emoji}</span>
                  <span>{interest.label}</span>
                  {isShared && !isOwnProfile && <span className="text-white/80">✓</span>}
                </div>
              )
            })}
          </div>
          {sharedInterestDetails.length > 0 && !isOwnProfile && (
            <p className="text-xs text-green-600 mt-2 font-medium">
              ✓ {sharedInterestDetails.length} shared interest{sharedInterestDetails.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* About Me details grid */}
      {user.userExtended && Object.values(user.userExtended).some((v: any) => v && v !== '' && v !== '[]') && (
        <div className="card p-4 mb-3">
          <h2 className="font-semibold text-gray-900 mb-2.5 text-sm">About Me</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
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
      {allPhotos.length > 1 && (
        <div className="card p-4 mb-3">
          <h2 className="font-semibold text-gray-900 mb-2.5 text-sm">Photos ({allPhotos.length})</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {allPhotos.map((p: any, i: number) => (
              <button key={p.id || i} onClick={() => setActivePhotoIdx(i)}
                className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity">
                <img src={getPhotoUrl(p.thumb || p.photo)} alt="" className="w-full h-full object-cover" loading="lazy" />
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
            <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
              onClick={e => { e.stopPropagation(); navPhoto(-1) }}>
              <ChevronLeft size={20} />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 z-10"
              onClick={e => { e.stopPropagation(); navPhoto(1) }}>
              <ChevronRight size={20} />
            </button>
          </>}
          <img
            src={getPhotoUrl(allPhotos[activePhotoIdx].photo)}
            alt=""
            className="max-w-[92vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {activePhotoIdx + 1} / {allPhotos.length}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setShowReportModal(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Flag size={16} className="text-orange-500" /> Report {user.name}
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-3">Why are you reporting this profile?</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map(reason => (
                <button key={reason} onClick={() => setReportReason(reason)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border-2 transition-all font-medium ${reportReason === reason ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  {reason}
                </button>
              ))}
            </div>
            <button onClick={submitReport} disabled={!reportReason}
              className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm disabled:opacity-40 hover:bg-brand-600 transition-colors">
              Submit Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
