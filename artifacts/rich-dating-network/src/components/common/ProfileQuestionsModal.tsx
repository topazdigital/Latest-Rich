import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Sparkles, Heart, MapPin, Star, Coffee, Plane, Music, BookOpen, Dumbbell, Camera, Gamepad2, Utensils } from 'lucide-react'
import { getStoredAuth } from '../../lib/auth'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onComplete: () => void
}

const PASSIONS = [
  { label: 'Travel', icon: Plane },
  { label: 'Fitness', icon: Dumbbell },
  { label: 'Music', icon: Music },
  { label: 'Reading', icon: BookOpen },
  { label: 'Photography', icon: Camera },
  { label: 'Cooking', icon: Utensils },
  { label: 'Gaming', icon: Gamepad2 },
  { label: 'Coffee & Cafés', icon: Coffee },
  { label: 'Art & Culture', icon: Star },
  { label: 'Hiking & Nature', icon: MapPin },
]

const IDEAL_DATES = [
  'Cozy dinner at a nice restaurant',
  'Coffee and conversation',
  'Outdoor adventure or hike',
  'A walk through the city',
  'Cooking together at home',
  'Art gallery or museum',
  'Live music or concert',
  'Spontaneous road trip',
]

const PERSONALITY_TYPES = [
  { label: 'Introvert', emoji: '📚' },
  { label: 'Extrovert', emoji: '🎉' },
  { label: 'Ambivert', emoji: '⚖️' },
  { label: 'Adventurous', emoji: '🏔️' },
  { label: 'Homebody', emoji: '🏠' },
  { label: 'Social Butterfly', emoji: '🦋' },
]

const STEPS = [
  { label: 'Your Passions', progress: 1 },
  { label: 'Ideal First Date', progress: 2 },
  { label: 'Your Personality', progress: 3 },
  { label: 'About Yourself', progress: 4 },
]

export default function ProfileQuestionsModal({ onClose, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [answers, setAnswers] = useState({
    passions: [] as string[],
    idealDate: '',
    selfDescription: '',
    personalityType: '',
  })

  function togglePassion(p: string) {
    setAnswers(a => ({
      ...a,
      passions: a.passions.includes(p)
        ? a.passions.filter(x => x !== p)
        : a.passions.length < 5 ? [...a.passions, p] : a.passions,
    }))
  }

  async function save() {
    setSaving(true)
    try {
      const auth = getStoredAuth()
      if (!auth?.token) return
      await fetch('/api/users/profile/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({
          passions: answers.passions.join(','),
          idealDate: answers.idealDate,
          selfDescription: answers.selfDescription,
          personalityType: answers.personalityType,
        }),
      })
      toast.success('Profile updated! 🎉')
      onComplete()
    } catch {
      toast.error('Could not save — you can update this from your profile later')
      onComplete()
    } finally { setSaving(false) }
  }

  function skip() { onComplete() }

  const totalSteps = STEPS.length
  const progressPct = (step / totalSteps) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="gradient-brand p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-[-50%] right-[-20%] w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <span className="font-bold text-sm">Complete Your Profile</span>
              </div>
              <button onClick={skip} className="text-white/60 hover:text-white text-xs font-medium transition-colors">
                Skip for now
              </button>
            </div>
            <h2 className="text-xl font-black mb-1">{STEPS[step - 1].label}</h2>
            <p className="text-white/70 text-sm">Step {step} of {totalSteps} — help others get to know you</p>
            {/* Progress bar */}
            <div className="mt-3 bg-white/20 rounded-full h-1.5">
              <div className="bg-white rounded-full h-1.5 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Passions */}
          {step === 1 && (
            <div>
              <p className="text-gray-500 text-sm mb-4">Pick up to 5 things you're passionate about</p>
              <div className="flex flex-wrap gap-2">
                {PASSIONS.map(({ label, icon: Icon }) => {
                  const selected = answers.passions.includes(label)
                  return (
                    <button key={label} onClick={() => togglePassion(label)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-sm font-semibold transition-all ${selected ? 'gradient-brand text-white shadow-md shadow-brand-500/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <Icon size={14} />
                      {label}
                    </button>
                  )
                })}
              </div>
              {answers.passions.length > 0 && (
                <p className="text-xs text-brand-500 mt-3">{answers.passions.length}/5 selected</p>
              )}
            </div>
          )}

          {/* Step 2: Ideal first date */}
          {step === 2 && (
            <div>
              <p className="text-gray-500 text-sm mb-4">What would your ideal first date look like?</p>
              <div className="space-y-2">
                {IDEAL_DATES.map(d => (
                  <button key={d} onClick={() => setAnswers(a => ({ ...a, idealDate: d }))}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all border-2 ${answers.idealDate === d ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Personality */}
          {step === 3 && (
            <div>
              <p className="text-gray-500 text-sm mb-4">How would you describe your personality?</p>
              <div className="grid grid-cols-2 gap-3">
                {PERSONALITY_TYPES.map(({ label, emoji }) => (
                  <button key={label} onClick={() => setAnswers(a => ({ ...a, personalityType: label }))}
                    className={`flex items-center gap-2 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all border-2 ${answers.personalityType === label ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100'}`}>
                    <span className="text-xl">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Self description */}
          {step === 4 && (
            <div>
              <p className="text-gray-500 text-sm mb-4">Write a short, fun bio to attract the right people</p>
              <textarea
                value={answers.selfDescription}
                onChange={e => setAnswers(a => ({ ...a, selfDescription: e.target.value }))}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none bg-gray-50"
                rows={5}
                maxLength={300}
                placeholder="e.g. Coffee addict, serial traveller, and lover of good books. Looking for someone to explore the world with…"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{answers.selfDescription.length}/300</p>
              <div className="mt-3 p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs text-brand-700">
                <span className="font-semibold">💡 Tip:</span> Profiles with a bio get 3x more messages!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 text-gray-500 text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < totalSteps ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={save} disabled={saving}
              className="flex-1 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
              {saving ? '...' : ''}
              Save & Find Matches 💝
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
