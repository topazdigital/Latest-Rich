import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { authFetch } from "../lib/auth"
import { getPhotoUrl } from "../lib/utils"
import toast from "react-hot-toast"
import { useAuth } from "../hooks/useAuth"

interface Gift { id: number; name: string; emoji: string; credits: number }
interface ReceivedGift { gift: any; giftInfo: Gift; sender: any }

export default function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [received, setReceived] = useState<ReceivedGift[]>([])
  const [tab, setTab] = useState<"send" | "received">("received")
  const [targetId, setTargetId] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    authFetch("/api/gifts").then(r => r.json()).then(setGifts)
    authFetch("/api/gifts/received").then(r => r.json()).then(setReceived)
  }, [])

  const sendGift = async (gift: Gift) => {
    if (!targetId) { toast.error("Enter a user ID"); return }
    setSending(true)
    try {
      const r = await authFetch("/api/gifts/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: parseInt(targetId), giftId: gift.id, message })
      })
      const d = await r.json()
      if (d.error) { toast.error(d.error); return }
      toast.success(`${gift.emoji} ${gift.name} sent!`)
      setMessage("")
    } finally { setSending(false) }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation("/home")} className="text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Gifts</h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        {(["received", "send"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "received" ? `Received (${received.length})` : "Send Gift"}
          </button>
        ))}
      </div>

      {tab === "received" ? (
        <div className="space-y-3">
          {received.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-3">🎁</div>
              <p>No gifts yet</p>
            </div>
          )}
          {received.map((row, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="text-4xl">{row.giftInfo?.emoji}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{row.giftInfo?.name}</div>
                <div className="text-sm text-gray-500">from {row.sender?.name}</div>
                {row.gift?.message && <div className="text-sm text-gray-700 mt-1 italic">"{row.gift.message}"</div>}
              </div>
              <button onClick={() => setLocation(`/profile/${row.sender?.id}`)} className="text-brand-500 text-sm font-medium">View</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
            You have <strong>{user?.credits || 0}</strong> credits
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Send to User ID</label>
            <input type="number" value={targetId} onChange={e => setTargetId(e.target.value)}
              placeholder="Enter user ID" className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message (optional)</label>
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a sweet message..." className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {gifts.map(g => (
              <button key={g.id} onClick={() => sendGift(g)} disabled={sending}
                className="bg-white border-2 border-gray-200 hover:border-brand-500 rounded-2xl p-4 text-center transition-colors disabled:opacity-50 group">
                <div className="text-4xl mb-2">{g.emoji}</div>
                <div className="font-medium text-gray-900 text-sm">{g.name}</div>
                <div className="text-brand-500 text-xs mt-1">{g.credits} credits</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
