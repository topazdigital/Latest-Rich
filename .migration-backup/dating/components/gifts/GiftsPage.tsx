'use client'
import { useState } from 'react'
import { getPhotoUrl } from '@/lib/utils'
import { Coins, Gift, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Props { me: any; toUser: any; gifts: any[] }

const DEFAULT_GIFTS = [
  { id: 1, name: 'Rose', image: '🌹', price: 10 },
  { id: 2, name: 'Heart', image: '❤️', price: 15 },
  { id: 3, name: 'Diamond Ring', image: '💍', price: 100 },
  { id: 4, name: 'Champagne', image: '🥂', price: 50 },
  { id: 5, name: 'Teddy Bear', image: '🧸', price: 30 },
  { id: 6, name: 'Crown', image: '👑', price: 200 },
  { id: 7, name: 'Chocolate', image: '🍫', price: 20 },
  { id: 8, name: 'Sunflower', image: '🌻', price: 25 },
  { id: 9, name: 'Stars', image: '⭐', price: 40 },
  { id: 10, name: 'Kiss', image: '💋', price: 35 },
  { id: 11, name: 'Yacht', image: '⛵', price: 500 },
  { id: 12, name: 'Car', image: '🏎️', price: 1000 },
]

export default function GiftsPage({ me, toUser, gifts }: Props) {
  const [selected, setSelected] = useState<any>(null)
  const [sending, setSending] = useState(false)
  const displayGifts = gifts.length > 0 ? gifts : DEFAULT_GIFTS

  async function sendGift() {
    if (!selected) return
    setSending(true)
    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: toUser.id, giftId: selected.id }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${selected.image || '🎁'} Gift sent to ${toUser.name}!`)
        setSelected(null)
      } else {
        toast.error(data.error || 'Failed to send gift')
      }
    } catch { toast.error('Failed to send gift') }
    finally { setSending(false) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full overflow-hidden">
          <img src={getPhotoUrl(toUser.photoThumb || toUser.photo)} alt={toUser.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Send a Gift</h1>
          <p className="text-gray-500">To {toUser.name}</p>
        </div>
        <div className="ml-auto flex items-center gap-1 bg-brand-50 text-brand-600 px-3 py-1.5 rounded-full">
          <Coins size={16} /> <span className="font-semibold">{me?.credits || 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {displayGifts.map(gift => (
          <button key={gift.id} onClick={() => setSelected(gift)}
            className={`card p-3 text-center transition-all hover:shadow-md ${selected?.id === gift.id ? 'ring-2 ring-brand-500 shadow-md bg-brand-50' : ''}`}>
            <div className="text-3xl mb-1">{gift.image || <Gift size={28} className="text-brand-500 mx-auto" />}</div>
            <div className="text-xs font-medium text-gray-700 truncate">{gift.name}</div>
            <div className="flex items-center justify-center gap-0.5 mt-1">
              <Coins size={10} className="text-brand-500" />
              <span className="text-xs text-brand-600 font-semibold">{gift.price}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="card p-4 mb-4 flex items-center gap-4 bg-brand-50">
          <div className="text-4xl">{selected.image || '🎁'}</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{selected.name}</p>
            <p className="text-sm text-gray-500">Costs {selected.price} credits</p>
          </div>
          <div>
            {(me?.credits || 0) < selected.price ? (
              <Link href="/credits" className="btn-outline text-sm py-2">Buy Credits</Link>
            ) : (
              <button onClick={sendGift} disabled={sending} className="btn-primary flex items-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send 🎁
              </button>
            )}
          </div>
        </div>
      )}

      {!selected && (
        <div className="text-center py-4 text-gray-400 text-sm">Select a gift above to send</div>
      )}
    </div>
  )
}
