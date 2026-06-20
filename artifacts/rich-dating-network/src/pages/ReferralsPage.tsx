import { useState, useEffect } from "react"
import { useAuth } from "../hooks/useAuth"
import { getStoredAuth } from "../lib/auth"
import { getPhotoUrl } from "../lib/utils"

interface ReferralData {
  code: string
  referralUrl: string
  totalReferrals: number
  referrals: Array<{
    id: number
    referredId: number
    status: string
    reward: string
    created: number
    name: string
    photo: string
    photoThumb: string
  }>
  rewardTiers: Array<{
    label: string
    rewardType: string
    rewardAmount: number
  }>
}

export default function ReferralsPage() {
  const { user } = useAuth()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const auth = getStoredAuth()
    if (!auth?.token) return
    fetch("/api/referrals", { headers: { Authorization: `Bearer ${auth.token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function copyLink() {
    if (!data?.referralUrl) return
    navigator.clipboard.writeText(data.referralUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-900">Get referrals to earn rewards</h1>
          <p className="text-sm text-gray-500 mt-0.5">Invite friends and earn credits or premium days when they buy packages</p>
        </div>

        {/* Referral link card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Share your referral url with friends.</p>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 truncate">
              {data?.referralUrl || "Loading..."}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: copied ? '#16a34a' : '#FF192C',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? "✓ Copied" : "COPY"}
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600">{data?.totalReferrals || 0}</div>
              <div className="text-xs text-gray-500">Total Referrals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data?.referrals?.filter(r => r.status === "rewarded").length || 0}
              </div>
              <div className="text-xs text-gray-500">Rewarded</div>
            </div>
          </div>
        </div>

        {/* Reward tiers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Reward Tiers</h2>
          <div className="space-y-3">
            {(data?.rewardTiers || []).map((tier, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <p className="text-sm text-gray-700 flex-1 pr-4">{tier.label}</p>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-gray-900">{tier.rewardAmount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral list */}
        {(data?.referrals?.length || 0) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Your Referrals</h2>
            <div className="space-y-3">
              {data!.referrals.map(ref => (
                <div key={ref.id} className="flex items-center gap-3">
                  <img
                    src={getPhotoUrl(ref.photoThumb || ref.photo)}
                    alt={ref.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ref.name}</p>
                    <p className="text-xs text-gray-600">{formatDate(ref.created)}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {ref.status === "rewarded" ? (
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Rewarded
                      </span>
                    ) : ref.status === "joined" ? (
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Joined
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
