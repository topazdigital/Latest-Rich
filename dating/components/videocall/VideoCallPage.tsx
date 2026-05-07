'use client'
import { useState, useEffect, useRef } from 'react'
import { getSocket } from '@/lib/socket-client'
import { getPhotoUrl } from '@/lib/utils'
import { PhoneOff, Mic, MicOff, Camera, CameraOff, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Props { myId: number; other: any }

export default function VideoCallPage({ myId, other }: Props) {
  const localRef = useRef<HTMLVideoElement>(null)
  const remoteRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const socket = useRef(getSocket())
  const [calling, setCalling] = useState(false)
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const s = socket.current
    s.emit('user:join', myId)

    s.on('videocall:offer', async (data: any) => {
      if (data.fromId !== other.id) return
      await setupPC()
      await pcRef.current!.setRemoteDescription(data.offer)
      const answer = await pcRef.current!.createAnswer()
      await pcRef.current!.setLocalDescription(answer)
      s.emit('videocall:answer', { toUserId: other.id, fromId: myId, answer })
      setConnected(true)
    })

    s.on('videocall:answer', async (data: any) => {
      await pcRef.current?.setRemoteDescription(data.answer)
      setConnected(true)
    })

    s.on('videocall:ice-candidate', async (data: any) => {
      try { await pcRef.current?.addIceCandidate(data.candidate) } catch {}
    })

    s.on('videocall:end', () => { endCall(); toast('Call ended') })

    return () => { s.off('videocall:offer'); s.off('videocall:answer'); s.off('videocall:ice-candidate'); s.off('videocall:end'); endCall() }
  }, [myId, other.id])

  async function setupPC() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }).catch(() => null)
    if (!stream) { toast.error('Camera/mic not available'); return }
    streamRef.current = stream
    if (localRef.current) { localRef.current.srcObject = stream; localRef.current.muted = true }
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    pcRef.current = pc
    stream.getTracks().forEach(t => pc.addTrack(t, stream))
    pc.ontrack = e => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0] }
    pc.onicecandidate = e => { if (e.candidate) socket.current.emit('videocall:ice-candidate', { toUserId: other.id, candidate: e.candidate }) }
  }

  async function startCall() {
    setCalling(true)
    await setupPC()
    const offer = await pcRef.current!.createOffer()
    await pcRef.current!.setLocalDescription(offer)
    socket.current.emit('videocall:offer', { toUserId: other.id, fromId: myId, offer })
  }

  function endCall() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current?.close()
    pcRef.current = null
    setConnected(false)
    setCalling(false)
    socket.current.emit('videocall:end', { toUserId: other.id })
  }

  function toggleMute() {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; })
    setMuted(!muted)
  }

  function toggleCamera() {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = cameraOff })
    setCameraOff(!cameraOff)
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-900 flex flex-col items-center justify-center relative">
      {/* Remote video */}
      <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover absolute inset-0" />

      {/* Placeholder when not connected */}
      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
          <div className="w-28 h-28 rounded-full overflow-hidden mb-4 ring-4 ring-white/20">
            <img src={getPhotoUrl(other.photo)} alt={other.name} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">{other.name}</h2>
          <p className="text-white/60 text-sm">{calling ? 'Calling...' : 'Ready to call'}</p>
          {calling && <div className="mt-4 flex gap-1">{[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />)}</div>}
        </div>
      )}

      {/* Local video (PiP) */}
      <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/20">
        <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-4">
        <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${muted ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'}`}>
          {muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
        </button>
        <button onClick={connected ? endCall : startCall}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${connected || calling ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} transition-all`}>
          <PhoneOff size={26} className="text-white" />
        </button>
        <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${cameraOff ? 'bg-red-500' : 'bg-white/20 backdrop-blur-sm'}`}>
          {cameraOff ? <CameraOff size={22} className="text-white" /> : <Camera size={22} className="text-white" />}
        </button>
        <Link href={`/chat/${other.id}`} className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <MessageCircle size={22} className="text-white" />
        </Link>
      </div>
    </div>
  )
}
