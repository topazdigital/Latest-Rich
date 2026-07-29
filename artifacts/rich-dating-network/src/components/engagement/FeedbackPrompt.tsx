import { useState } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

interface Props {
  trigger?: string
  onClose: () => void
}

export default function FeedbackPrompt({ trigger = "positive_moment", onClose }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [saving, setSaving] = useState(false)

  function dismiss() {
    // Snooze — will re-appear after 7 days
    localStorage.setItem('rdn_feedback_snoozed', String(Date.now()))
    onClose()
  }

  function neverShow() {
    localStorage.setItem('rdn_feedback_done', '1')
    onClose()
  }

  async function submit() {
    if (!rating || saving) return
    setSaving(true)
    try {
      const res = await authFetch("/api/engagement/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, trigger }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save feedback")
      // Rated — never show again
      localStorage.setItem('rdn_feedback_done', '1')
      toast.success("Thanks for helping us improve!")
      onClose()
      if (data.trustpilot) {
        toast("Loved your experience? A Trustpilot review would mean a lot.", { duration: 5000 })
      }
    } catch (err: any) {
      toast.error(err.message || "Could not save feedback")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-500">Quick feedback</p>
            <h2 className="mt-1 text-xl font-black text-gray-900">How are we doing?</h2>
            <p className="mt-1 text-sm text-gray-500">Your feedback helps us make better connections.</p>
          </div>
          <button onClick={dismiss} className="text-xl text-gray-400 hover:text-gray-700" aria-label="Close">×</button>
        </div>
        <div className="mb-5 flex justify-center gap-2" aria-label="Rate your experience">
          {[1, 2, 3, 4, 5].map(value => (
            <button key={value} onClick={() => setRating(value)} className={`text-3xl transition-transform hover:scale-110 ${value <= rating ? "text-amber-400" : "text-gray-200"}`} aria-label={`${value} stars`}>★</button>
          ))}
        </div>
        <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000}
          placeholder="What could we do better? (optional)"
          className="mb-4 min-h-24 w-full resize-none rounded-2xl border border-gray-200 p-3 text-sm outline-none focus:border-brand-400" />
        <button onClick={submit} disabled={!rating || saving} className="btn-primary w-full disabled:opacity-50">
          {saving ? "Saving…" : "Send feedback"}
        </button>
        <button onClick={neverShow} className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Don't show this again
        </button>
      </div>
    </div>
  )
}