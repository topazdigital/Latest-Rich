import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X, Heart } from 'lucide-react'

interface Caller {
  id: number
  callId: number
  name: string
  age: number
  photo: string
  videoUrl: string
}

interface Props {
  caller: Caller
  onClose: () => void
}

// Free-to-use webcam-style demo videos (looping)
// These are short royalty-free clips that mimic webcam footage
const DEMO_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
]

export default function VideoCallModal({ caller, onClose }: Props) {
  const [phase, setPhase] = useState<'ringing' | 'connected' | 'ended'>('ringing')
  const [callDuration, setCallDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [ringingSeconds, setRingingSeconds] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pick a random demo video or use caller's configured one
  const videoSrc = caller.videoUrl && caller.videoUrl.startsWith('http')
    ? caller.videoUrl
    : DEMO_VIDEOS[caller.id % DEMO_VIDEOS.length]

  useEffect(() => {
    // Auto-ring for up to 30 seconds, then dismiss as missed
    ringTimer.current = setInterval(() => {
      setRingingSeconds(s => s + 1)
    }, 1000)
    const missedTimer = setTimeout(() => {
      if (phase === 'ringing') {
        setPhase('ended')
        setTimeout(onClose, 2000)
      }
    }, 30000)
    return () => {
      if (ringTimer.current) clearInterval(ringTimer.current)
      clearTimeout(missedTimer)
    }
  }, [])

  useEffect(() => {
    // Record that this call was answered/dismissed
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    if (phase === 'connected') {
      if (ringTimer.current) clearInterval(ringTimer.current)
      fetch(`/api/video-calls/${caller.callId}/answer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      }).catch(() => {})
      // Start duration timer
      durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000)
      // Auto-end after 90-180 seconds (the caller "hangs up")
      const autoEndSec = 90 + Math.floor(Math.random() * 90)
      autoEndTimer.current = setTimeout(() => {
        endCall()
      }, autoEndSec * 1000)
      if (videoRef.current) {
        videoRef.current.play().catch(() => {})
      }
    } else if (phase === 'ended') {
      if (durationTimer.current) clearInterval(durationTimer.current)
      if (autoEndTimer.current) clearTimeout(autoEndTimer.current)
      fetch(`/api/video-calls/${caller.callId}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}` },
      }).catch(() => {})
    }
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current)
    }
  }, [phase])

  function answerCall() { setPhase('connected') }

  function declineCall() {
    setPhase('ended')
    setTimeout(onClose, 1500)
  }

  function endCall() {
    setPhase('ended')
    setTimeout(onClose, 2000)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Background blur from caller's photo */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={caller.photo} alt="" className="w-full h-full object-cover blur-2xl opacity-20 scale-110" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* RINGING phase */}
        {phase === 'ringing' && (
          <div className="text-center">
            <p className="text-white/60 text-sm mb-6 font-medium tracking-wide uppercase">Incoming Video Call</p>

            {/* Pulsing avatar */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 rounded-full animate-ping bg-white/20 scale-110" />
              <div className="absolute inset-0 rounded-full animate-ping bg-white/10 scale-125" style={{ animationDelay: '0.3s' }} />
              <img src={caller.photo} alt={caller.name}
                className="relative w-32 h-32 rounded-full object-cover border-4 border-white/40 shadow-2xl"
                onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(caller.name)}&size=128&background=FF192C&color=fff` }} />
            </div>

            <h2 className="text-white text-2xl font-bold mb-1">{caller.name}</h2>
            <p className="text-white/50 text-sm mb-2">{caller.age} years old</p>
            <p className="text-white/40 text-xs animate-pulse">Wants to video chat with you…</p>

            <div className="flex items-center justify-center gap-12 mt-10">
              <button onClick={declineCall}
                className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-2xl hover:bg-red-600 active:scale-95 transition-all">
                <PhoneOff size={26} className="text-white" />
              </button>
              <button onClick={answerCall}
                className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-2xl hover:bg-green-600 active:scale-95 transition-all animate-bounce">
                <Video size={26} className="text-white" />
              </button>
            </div>
            <div className="flex justify-between mt-4 px-8">
              <p className="text-white/30 text-xs text-center w-16">Decline</p>
              <p className="text-white/30 text-xs text-center w-16">Answer</p>
            </div>
          </div>
        )}

        {/* CONNECTED phase */}
        {phase === 'connected' && (
          <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
            {/* Video area */}
            <div className="relative aspect-[3/4] bg-black">
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                autoPlay
                loop
                muted={false}
                playsInline
              />
              {/* Overlay when video is "off" */}
              {videoOff && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <div className="text-center">
                    <img src={caller.photo} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-3 opacity-60" />
                    <p className="text-white/50 text-sm">Camera off</p>
                  </div>
                </div>
              )}

              {/* Call info overlay */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-lg drop-shadow">{caller.name}</p>
                  <p className="text-green-400 text-sm drop-shadow">{formatTime(callDuration)} · Connected</p>
                </div>
                <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50" />
              </div>

              {/* Self-camera (small, bottom-right) */}
              <div className="absolute bottom-4 right-4 w-20 h-28 rounded-xl bg-gray-700 overflow-hidden border-2 border-white/20 shadow-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full bg-brand-500/30 flex items-center justify-center mx-auto">
                    <Heart size={16} className="text-brand-400" />
                  </div>
                  <p className="text-white/40 text-xs mt-1">You</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-5 bg-gray-900">
              <div className="flex items-center justify-center gap-5">
                <button onClick={() => setMuted(!muted)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${muted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {muted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={endCall}
                  className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-xl hover:bg-red-600 active:scale-95 transition-all">
                  <PhoneOff size={22} className="text-white" />
                </button>
                <button onClick={() => setVideoOff(!videoOff)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${videoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {videoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ENDED phase */}
        {phase === 'ended' && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <PhoneOff size={28} className="text-red-400" />
            </div>
            <p className="text-white text-xl font-bold mb-2">Call Ended</p>
            {callDuration > 0 ? (
              <p className="text-white/50 text-sm">Duration: {formatTime(callDuration)}</p>
            ) : (
              <p className="text-white/50 text-sm">Missed call from {caller.name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
