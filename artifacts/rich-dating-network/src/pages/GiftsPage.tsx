import { useState, useEffect } from "react"
import { useLocation, Link } from "wouter"
import { authFetch } from "../lib/auth"
import { getPhotoUrl } from "../lib/utils"
import toast from "react-hot-toast"
import { useAuth } from "../hooks/useAuth"
import { ArrowLeft, Gift as GiftIcon } from "lucide-react"

interface Gift { id: number; name: string; emoji: string; credits: number }
interface ReceivedGift { gift: any; giftInfo: Gift; sender: any }

export default function GiftsPage() {
  const [gifts, setGifts] = useState<Gift[]>([])
  const [received, setReceived] = useState<ReceivedGift[]>([])
  const [targetUser, setTargetUser] = useState<any>(null)
  const params = new URLSearchParams(window.location.search)
  const urlToId = params.get('toId') || ''
  const [tab, setTab] = useState<"send" | "received">(urlToId ? "send" : "received")
  const [targetId, setTargetId] = useState(urlToId)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const { user, token } = useAuth()
  const [, setLocation] = useLocation()

  useEffect(() => {
    authFetch("/api/gifts").then(r => r.json()).then(d => { if (Array.isArray(d)) setGifts(d) }).catch(() => {})
    authFetch("/api/gifts/received").then(r => r.json()).then(d => { if (Array.isArray(d)) setReceived(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (urlToId && token) {
      fetch(`/api/users/${urlToId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data?.user) setTargetUser(data.user) })
        .catch(() => {})
    }
  }, [urlToId, token])

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
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => history.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="section-title">Gifts</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {(["received", "send"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "received" ? `Received${received.length > 0 ? ` (${received.length})` : ""}` : "Send a Gift"}
          </button>
        ))}
      </div>

      {tab === "received" ? (
        <div className="space-y-3">
          {received.length === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No gifts yet</h3>
              <p className="text-gray-500 text-sm">Send someone a gift to get one back!</p>
            </div>
          )}
          {received.map((row, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <div className="text-4xl">{row.giftInfo?.emoji}</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{row.giftInfo?.name}</div>
                <div className="text-sm text-gray-500">from <span className="text-brand-500 font-medium">{row.sender?.name}</span></div>
                {row.gift?.message && <div className="text-sm text-gray-600 mt-1 italic">"{row.gift.message}"</div>}
              </div>
              <Link href={`/profile/${row.sender?.id}`} className="text-brand-500 text-sm font-medium hover:text-brand-600">View →</Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {targetUser ? (
            <div className="card p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <img src={getPhotoUrl(targetUser.photoThumb || targetUser.photo)} alt={targetUser.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Sending gift to</p>
                <p className="text-brand-500 font-medium">{targetUser.name}</p>
              </div>
              <Link href={`/profile/${targetUser.id}`} className="text-sm text-gray-400 hover:text-gray-600">View profile</Link>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Send to (User ID)</label>
              <input type="number" value={targetId} onChange={e => setTargetId(e.target.value)}
                placeholder="Enter user ID" className="input-field" />
            </div>
          )}

          <div className="card p-3 flex items-center gap-2 text-sm">
            <GiftIcon size={16} className="text-amber-500" />
            <span className="text-gray-600">You have <strong className="text-gray-900">{user?.credits || 0}</strong> credits</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Personal message (optional)</label>
            <input value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Add a sweet message..." className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {gifts.map(g => (
              <button key={g.id} onClick={() => sendGift(g)} disabled={sending || (!targetId && !urlToId)}
                className="card border-2 border-transparent hover:border-brand-400 p-4 text-center transition-all disabled:opacity-40 active:scale-95">
                <div className="text-4xl mb-2">{g.emoji}</div>
                <div className="font-semibold text-gray-900 text-sm">{g.name}</div>
                <div className="text-brand-500 text-xs font-medium mt-1">{g.credits} credits</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
