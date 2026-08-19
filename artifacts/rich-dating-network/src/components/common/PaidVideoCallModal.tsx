import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { useWebSocket, useWSEvent } from "../../hooks/useWebSocket"

interface Props {
  sessionId: number
  peer: { id: number; name: string; age?: number; photo?: string; fake?: number }
  isCaller: boolean
  onClose: () => void
}

const DEMO_VIDEOS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
]

export default function PaidVideoCallModal({ sessionId, peer, isCaller, onClose }: Props) {
  const { token } = useAuth()
  const { send } = useWebSocket()
  const [phase, setPhase] = useState<"ringing" | "connecting" | "connected" | "ended">(isCaller ? "connecting" : "ringing")
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const localStream = useRef<MediaStream | null>(null)
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([])
  const closed = useRef(false)

  useEffect(() => {
    if (isCaller && peer.fake === 1) {
      setPhase("connected")
      prepareLocalMedia().catch(() => {})
    }
    return () => {
      localStream.current?.getTracks().forEach(track => track.stop())
      peerConnection.current?.close()
    }
  }, [])

  useEffect(() => {
    if (phase !== "connected") return
    const timer = setInterval(() => setSeconds(value => value + 1), 1000)
    const heartbeat = setInterval(async () => {
      try {
        const response = await fetch(`/api/video-calls/${sessionId}/heartbeat`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        })
        const result = await response.json()
        if (result.ended) finish("insufficient_credits")
      } catch {}
      send({ type: "call_heartbeat", sessionId })
    }, 15000)
    return () => { clearInterval(timer); clearInterval(heartbeat) }
  }, [phase, sessionId, token])

  useWSEvent("call_connected", async message => {
    if (Number(message.sessionId) !== sessionId) return
    setPhase("connected")
    if (peer.fake !== 1) {
      await prepareLocalMedia()
      if (isCaller) {
        const connection = peerConnection.current
        if (!connection) return
        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        send({ type: "call_signal", sessionId, signal: { type: "offer", sdp: offer } })
      }
    }
  }, [sessionId, isCaller, peer.fake])

  useWSEvent("call_signal", async message => {
    if (Number(message.sessionId) !== sessionId || peer.fake === 1) return
    const signal = message.signal
    const connection = peerConnection.current || await prepareLocalMedia()
    if (!connection) return
    if (signal.type === "offer") {
      await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
      for (const candidate of pendingCandidates.current) await connection.addIceCandidate(candidate).catch(() => {})
      pendingCandidates.current = []
      const answer = await connection.createAnswer()
      await connection.setLocalDescription(answer)
      send({ type: "call_signal", sessionId, signal: { type: "answer", sdp: answer } })
    } else if (signal.type === "answer") {
      await connection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
    } else if (signal.type === "candidate") {
      if (connection.remoteDescription) await connection.addIceCandidate(signal.candidate).catch(() => {})
      else pendingCandidates.current.push(signal.candidate)
    }
  }, [sessionId, peer.fake])

  useWSEvent("call_ended", message => {
    if (Number(message.sessionId) === sessionId) finish(String(message.reason || "ended"))
  }, [sessionId])
  useWSEvent("call_balance_empty", message => {
    if (Number(message.sessionId) === sessionId) finish("insufficient_credits")
  }, [sessionId])

  async function prepareLocalMedia() {
    if (peerConnection.current) return peerConnection.current
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    localStream.current = stream
    if (localVideo.current) { localVideo.current.srcObject = stream; localVideo.current.play().catch(() => {}) }
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    })
    stream.getTracks().forEach(track => connection.addTrack(track, stream))
    connection.onicecandidate = event => {
      if (event.candidate) send({ type: "call_signal", sessionId, signal: { type: "candidate", candidate: event.candidate } })
    }
    connection.ontrack = event => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0]
        remoteVideo.current.play().catch(() => {})
      }
    }
    peerConnection.current = connection
    return connection
  }

  function accept() {
    setPhase("connecting")
    send({ type: "call_accept", sessionId })
  }

  function reject() {
    send({ type: "call_reject", sessionId })
    finish("declined")
  }

  function finish(reason = "hangup") {
    if (closed.current) return
    closed.current = true
    if (reason !== "declined" && reason !== "insufficient_credits") {
      send({ type: "call_end", sessionId })
      fetch(`/api/video-calls/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      }).catch(() => {})
    }
    setPhase("ended")
    setTimeout(onClose, reason === "declined" ? 500 : 1500)
  }

  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`
  const demoVideo = DEMO_VIDEOS[peer.id % DEMO_VIDEOS.length]

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-gray-900 shadow-2xl">
        {phase === "ringing" && (
          <div className="px-6 py-12 text-center text-white">
            <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-white/60">Incoming video call</p>
            <img src={peer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}`} alt={peer.name} className="mx-auto mb-5 h-28 w-28 rounded-full object-cover ring-4 ring-white/30" />
            <h2 className="text-2xl font-bold">{peer.name}</h2>
            <p className="mt-1 text-sm text-white/50">Wants to video chat with you</p>
            <div className="mt-9 flex justify-center gap-12">
              <button onClick={reject} aria-label="Decline call" className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500"><PhoneOff /></button>
              <button onClick={accept} aria-label="Answer call" className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 animate-bounce"><Video /></button>
            </div>
          </div>
        )}
        {phase === "connecting" && (
          <div className="px-6 py-16 text-center text-white">
            <img src={peer.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(peer.name)}`} alt="" className="mx-auto mb-5 h-24 w-24 rounded-full object-cover animate-pulse" />
            <h2 className="text-xl font-bold">{isCaller ? `Calling ${peer.name}…` : "Connecting…"}</h2>
            <button onClick={() => finish()} className="mx-auto mt-8 flex h-14 w-14 items-center justify-center rounded-full bg-red-500"><PhoneOff size={21} /></button>
          </div>
        )}
        {phase === "connected" && (
          <div>
            <div className="relative aspect-[3/4] bg-black">
              {peer.fake === 1 ? (
                <video src={demoVideo} autoPlay loop playsInline className="h-full w-full object-cover" />
              ) : (
                <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-cover" />
              )}
              <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-white">
                <div><p className="font-bold">{peer.name}</p><p className="text-sm text-green-300">{formatTime(seconds)} · Connected</p></div>
                <span className="h-2 w-2 rounded-full bg-green-400" />
              </div>
              <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-xl border-2 border-white/20 bg-gray-800">
                {videoOff ? <div className="flex h-full items-center justify-center text-xs text-white/50">Camera off</div> : <video ref={localVideo} muted playsInline className="h-full w-full object-cover" />}
              </div>
            </div>
            <div className="flex justify-center gap-5 p-5">
              <button onClick={() => { setMuted(value => !value); localStream.current?.getAudioTracks().forEach(track => { track.enabled = muted }) }} className={`flex h-12 w-12 items-center justify-center rounded-full ${muted ? "bg-red-500/30 text-red-300" : "bg-white/10 text-white"}`}>{muted ? <MicOff size={20} /> : <Mic size={20} />}</button>
              <button onClick={() => finish()} className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white"><PhoneOff size={22} /></button>
              <button onClick={() => { setVideoOff(value => !value); localStream.current?.getVideoTracks().forEach(track => { track.enabled = videoOff }) }} className={`flex h-12 w-12 items-center justify-center rounded-full ${videoOff ? "bg-red-500/30 text-red-300" : "bg-white/10 text-white"}`}>{videoOff ? <VideoOff size={20} /> : <Video size={20} />}</button>
            </div>
          </div>
        )}
        {phase === "ended" && <div className="px-6 py-16 text-center text-white"><PhoneOff className="mx-auto mb-4 text-red-400" size={32} /><p className="text-xl font-bold">Call Ended</p><p className="mt-2 text-sm text-white/50">{seconds ? `Duration: ${formatTime(seconds)}` : "The call did not connect"}</p></div>}
      </div>
    </div>
  )
}