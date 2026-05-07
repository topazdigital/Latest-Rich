import { useState } from 'react'
import { Heart, MessageCircle, Star, Search, Crown, ChevronRight, X } from 'lucide-react'

interface Props {
  userName: string
  onClose: () => void
}

const TIPS = [
  {
    icon: <Search className="w-6 h-6 text-blue-500" />,
    bg: 'bg-blue-50',
    title: 'Discover People',
    desc: 'Browse and filter profiles in Discover mode. Like someone to show you\'re interested.'
  },
  {
    icon: <Heart className="w-6 h-6 text-brand-500" />,
    bg: 'bg-brand-50',
    title: 'Get Likes & Messages',
    desc: 'When someone likes or messages you, you\'ll see it in Notifications and Chat.'
  },
  {
    icon: <Star className="w-6 h-6 text-yellow-500" />,
    bg: 'bg-yellow-50',
    title: 'Super Like',
    desc: 'You get 3 super likes per day. They stand out and get 3x more attention!'
  },
  {
    icon: <MessageCircle className="w-6 h-6 text-green-500" />,
    bg: 'bg-green-50',
    title: 'Chat Freely',
    desc: 'Start chatting with anyone who\'s shown interest. Send your first message now!'
  },
  {
    icon: <Crown className="w-6 h-6 text-purple-500" />,
    bg: 'bg-purple-50',
    title: 'Go Premium',
    desc: 'Premium unlocks unlimited likes, profile boosts, read receipts, and more!'
  },
]

export default function WelcomeModal({ userName, onClose }: Props) {
  const [step, setStep] = useState(0)

  const isLast = step === TIPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {step === 0 ? (
          <div className="relative">
            <div className="h-2 bg-gray-100">
              <div className="h-2 bg-gradient-to-r from-brand-500 to-pink-400 transition-all duration-500"
                style={{ width: `${((step + 1) / TIPS.length) * 100}%` }} />
            </div>
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500 to-pink-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
                <Heart className="w-10 h-10 text-white fill-white" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome, {userName}! 🎉</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                You've joined Rich Dating Network — where successful, ambitious singles meet.
                Let me show you around real quick!
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="h-2 bg-gray-100">
              <div className="h-2 bg-gradient-to-r from-brand-500 to-pink-400 transition-all duration-500"
                style={{ width: `${((step + 1) / TIPS.length) * 100}%` }} />
            </div>
            <div className="px-8 pt-8 pb-6">
              <div className={`w-14 h-14 rounded-2xl ${TIPS[step - 1]?.bg || 'bg-gray-50'} flex items-center justify-center mb-4`}>
                {TIPS[step - 1]?.icon}
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">{TIPS[step - 1]?.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{TIPS[step - 1]?.desc}</p>
            </div>
          </div>
        )}

        <div className="px-8 pb-8 flex items-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < TIPS.length) {
                setStep(s => s + 1)
              } else {
                onClose()
              }
            }}
            className="flex-1 py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
            style={{ background: 'linear-gradient(135deg, #FF192C, #ff5f6b)' }}>
            {step === 0 ? "Let's Go! 🚀" : isLast ? "Start Meeting People 💝" : (<>Next <ChevronRight size={16} /></>)}
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-center gap-1.5 pb-6">
          {Array.from({ length: TIPS.length + 1 }).map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${i === step ? 'w-6 h-2 bg-brand-500' : 'w-2 h-2 bg-gray-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
