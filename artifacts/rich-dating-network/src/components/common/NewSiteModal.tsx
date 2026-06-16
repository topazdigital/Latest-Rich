import { useState, useRef, useEffect } from 'react'
import { Heart, Phone, Sparkles, Shield, MessageCircle, Eye, ChevronRight, X, Check, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { authFetch } from '../../lib/auth'

const DIAL_CODES = [
  { code: 'US', dial: '+1', name: 'United States' },
  { code: 'GB', dial: '+44', name: 'United Kingdom' },
  { code: 'KE', dial: '+254', name: 'Kenya' },
  { code: 'NG', dial: '+234', name: 'Nigeria' },
  { code: 'ZA', dial: '+27', name: 'South Africa' },
  { code: 'GH', dial: '+233', name: 'Ghana' },
  { code: 'UG', dial: '+256', name: 'Uganda' },
  { code: 'TZ', dial: '+255', name: 'Tanzania' },
  { code: 'RW', dial: '+250', name: 'Rwanda' },
  { code: 'ET', dial: '+251', name: 'Ethiopia' },
  { code: 'EG', dial: '+20', name: 'Egypt' },
  { code: 'MA', dial: '+212', name: 'Morocco' },
  { code: 'ZM', dial: '+260', name: 'Zambia' },
  { code: 'ZW', dial: '+263', name: 'Zimbabwe' },
  { code: 'CM', dial: '+237', name: 'Cameroon' },
  { code: 'AE', dial: '+971', name: 'UAE' },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia' },
  { code: 'IN', dial: '+91', name: 'India' },
  { code: 'PK', dial: '+92', name: 'Pakistan' },
  { code: 'DE', dial: '+49', name: 'Germany' },
  { code: 'FR', dial: '+33', name: 'France' },
  { code: 'IT', dial: '+39', name: 'Italy' },
  { code: 'ES', dial: '+34', name: 'Spain' },
  { code: 'CA', dial: '+1', name: 'Canada' },
  { code: 'AU', dial: '+61', name: 'Australia' },
  { code: 'BR', dial: '+55', name: 'Brazil' },
  { code: 'MX', dial: '+52', name: 'Mexico' },
  { code: 'SG', dial: '+65', name: 'Singapore' },
  { code: 'ZZ', dial: '', name: 'Other' },
]

function getFlagEmoji(code: string) {
  if (!code || code === 'ZZ') return '🌍'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

const FEATURES = [
  { icon: '✨', title: 'New Look & Feel', desc: 'We\'ve completely rebuilt the platform — faster, smoother, and more beautiful than ever.' },
  { icon: '👀', title: 'Profile Visitors', desc: 'Now you can see who visits your profile. Get premium to unlock the full list.' },
  { icon: '🎥', title: 'Video Calls', desc: 'Connect face-to-face with video calls from members interested in you.' },
  { icon: '💝', title: 'Better Matching', desc: 'Smarter discovery based on your location, interests, and compatibility score.' },
]

interface Props {
  userName: string
  hasPhone: boolean
  onClose: () => void
}

export default function NewSiteModal({ userName, hasPhone, onClose }: Props) {
  const [step, setStep] = useState(0)
  const [selectedDial, setSelectedDial] = useState(DIAL_CODES[2])
  const [phoneNumber, setPhoneNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDialPicker, setShowDialPicker] = useState(false)
  const [dialSearch, setDialSearch] = useState('')
  const dialRef = useRef<HTMLDivElement>(null)

  const totalSteps = hasPhone ? 2 : 3

  useEffect(() => {
    fetch('/api/location/detect').then(r => r.json()).then(d => {
      if (d.countryCode) {
        const found = DIAL_CODES.find(c => c.code === d.countryCode)
        if (found) setSelectedDial(found)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dialRef.current && !dialRef.current.contains(e.target as Node)) setShowDialPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredDials = DIAL_CODES.filter(d =>
    d.name.toLowerCase().includes(dialSearch.toLowerCase()) ||
    d.dial.includes(dialSearch)
  )

  async function savePhone() {
    const full = selectedDial.dial + phoneNumber.replace(/\D/g, '')
    if (full.length < 8) { toast.error('Please enter a valid phone number'); return }
    setSaving(true)
    try {
      const res = await authFetch('/api/auth/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: full }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save') }
      toast.success('Phone number saved!')
      setStep(s => s + 1)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save phone number')
    } finally { setSaving(false) }
  }

  function handleNext() {
    if (step === 0) { setStep(1); return }
    if (step === 1 && !hasPhone) {
      if (!phoneNumber.trim()) { setStep(2); return }
      savePhone()
      return
    }
    onClose()
  }

  const progress = ((step + 1) / (totalSteps + 1)) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div className="h-1.5 bg-gradient-to-r from-brand-500 to-pink-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-pink-400 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Heart className="w-7 h-7 text-white fill-white" />
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X size={16} />
              </button>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome back, {userName}! 🎉</h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              We've moved to a new platform! Everything you loved is still here, but better. Here's what's new:
            </p>
            <div className="space-y-3 mb-6">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50">
                  <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0">{f.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{f.title}</div>
                    <div className="text-gray-500 text-xs leading-relaxed">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Add Phone (only for users without phone) */}
        {step === 1 && !hasPhone && (
          <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Phone className="w-7 h-7 text-blue-500" />
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X size={16} />
              </button>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Add Your Phone Number</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Secure your account and enable two-factor login with your phone number. You can skip this and add it later in settings.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
              <div className="flex gap-2">
                {/* Dial code picker */}
                <div ref={dialRef} className="relative flex-shrink-0">
                  <button type="button" onClick={() => setShowDialPicker(v => !v)}
                    className="h-12 px-3 border border-gray-200 rounded-2xl text-sm font-semibold flex items-center gap-1.5 bg-gray-50 hover:bg-white transition-all min-w-[90px]">
                    <span className="text-base leading-none">{getFlagEmoji(selectedDial.code)}</span>
                    <span className="text-gray-700">{selectedDial.dial || '+'}</span>
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>
                  {showDialPicker && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 w-64 overflow-hidden">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          autoFocus
                          placeholder="Search country..."
                          value={dialSearch}
                          onChange={e => setDialSearch(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-gray-50 rounded-xl border-0 outline-none placeholder-gray-400"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredDials.map(d => (
                          <button key={d.code + d.dial} type="button"
                            onClick={() => { setSelectedDial(d); setShowDialPicker(false); setDialSearch('') }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors text-left ${selectedDial.code === d.code ? 'bg-brand-50 text-brand-600' : 'text-gray-700'}`}>
                            <span className="text-base leading-none w-6">{getFlagEmoji(d.code)}</span>
                            <span className="flex-1 font-medium">{d.name}</span>
                            <span className="text-gray-400 text-xs">{d.dial}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="712 345 678"
                  className="flex-1 h-12 px-4 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-gray-50 hover:bg-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-4">Your number is stored securely and never shared with other members.</p>
          </div>
        )}

        {/* Step 1 (with phone) or Step 2 — Done */}
        {((step === 1 && hasPhone) || step === 2) && (
          <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-2 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">You're all set! 🚀</h3>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your profile is live on the new platform. Start exploring and connecting with people near you!
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { icon: <Eye size={18} className="text-purple-500" />, bg: 'bg-purple-50', label: 'Visitors' },
                { icon: <MessageCircle size={18} className="text-blue-500" />, bg: 'bg-blue-50', label: 'Messages' },
                { icon: <Sparkles size={18} className="text-amber-500" />, bg: 'bg-amber-50', label: 'Discover' },
              ].map((item, i) => (
                <div key={i} className={`${item.bg} rounded-2xl p-3 flex flex-col items-center gap-1.5`}>
                  {item.icon}
                  <span className="text-xs font-semibold text-gray-700">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-2 flex items-center gap-2">
          {step > 0 && !((step === 1 && hasPhone) || step === 2) && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step === 1 && !hasPhone && (
            <button onClick={() => setStep(2)}
              className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium text-sm hover:bg-gray-50 transition-colors">
              Skip
            </button>
          )}
          <button onClick={handleNext} disabled={saving}
            className="flex-1 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {(step === 1 && hasPhone) || step === 2 ? "Start Exploring 💝" : step === 1 && !hasPhone ? (phoneNumber ? "Save & Continue" : "Skip for Now") : (<>Next <ChevronRight size={16} /></>)}
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-5">
          {Array.from({ length: totalSteps + 1 }).map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-1.5 bg-brand-500' : 'w-1.5 h-1.5 bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
