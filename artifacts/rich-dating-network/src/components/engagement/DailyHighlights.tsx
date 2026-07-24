import { useEffect, useState } from "react"
import { Link } from "wouter"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl, profileUrl } from "../../lib/utils"

interface DailyData {
  streakDays: number
  rewardCredits: number
  match: any | null
  likedUsers: any[]
  likedRevealUntil: number
}

function countdown(until: number) {
  const seconds = Math.max(0, until - Math.floor(Date.now() / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

export default function DailyHighlights() {
  const [data, setData] = useState<DailyData | null>(null)
  const [remaining, setRemaining] = useState("")

  useEffect(() => {
    authFetch("/api/engagement/daily")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setData(d); setRemaining(countdown(d.likedRevealUntil)) } })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!data?.likedRevealUntil) return
    const timer = setInterval(() => setRemaining(countdown(data.likedRevealUntil)), 60000)
    return () => clearInterval(timer)
  }, [data?.likedRevealUntil])

  if (!data) return null

  return (
    <section className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-500">Your daily highlights</p>
          <h2 className="mt-1 text-lg font-black text-gray-900">A reason to check in</h2>
        </div>
        <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
          <div className="text-lg font-black text-amber-500">🔥 {data.streakDays}</div>
          <div className="text-[10px] font-bold uppercase text-gray-400">day streak</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-white/80 p-3">
          <p className="text-xs font-bold text-gray-500">Match of the day</p>
          {data.match ? (
            <Link href={profileUrl(data.match)} className="mt-2 flex items-center gap-3 no-underline">
              <img src={getPhotoUrl(data.match.photoThumb || data.match.photo)} alt="" className="h-11 w-11 rounded-full object-cover" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-gray-900">{data.match.name}</span>
                <span className="block text-xs text-gray-500">{data.match.city || "A promising connection"}</span>
              </span>
              <span className="ml-auto text-brand-500">→</span>
            </Link>
          ) : <p className="mt-2 text-sm text-gray-500">Complete your profile to unlock a curated match.</p>}
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <p className="text-xs font-bold text-gray-500">Who liked you today</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {data.likedUsers.length ? `${data.likedUsers.length} admirer${data.likedUsers.length === 1 ? "" : "s"} waiting` : "Your next admirer could be here"}
          </p>
          <p className="mt-1 text-xs text-gray-500">Reveal window closes in {remaining || "24h"}.</p>
          <Link href="/likes" className="mt-2 inline-block text-xs font-bold text-brand-500 hover:underline">See your likes →</Link>
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-emerald-700">
        ✓ {data.rewardCredits || 1} free credit added for today’s check-in
      </p>
    </section>
  )
}