import { useEffect, useState } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"

export default function AdminFeedback() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch("/api/engagement/admin/feedback")
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch { toast.error("Could not load feedback") }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function update(id: number, status: string) {
    const res = await authFetch(`/api/engagement/admin/feedback/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    })
    if (res.ok) setRows(prev => prev.map(row => row.feedback.id === id ? { ...row, feedback: { ...row.feedback, status } } : row))
    else toast.error("Could not update feedback")
  }

  const average = rows.length ? (rows.reduce((sum, row) => sum + Number(row.feedback.rating || 0), 0) / rows.length).toFixed(1) : "—"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Average rating</p><p className="mt-1 text-2xl font-black text-amber-500">★ {average}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Responses</p><p className="mt-1 text-2xl font-black text-gray-900">{rows.length}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">1–2 star alerts</p><p className="mt-1 text-2xl font-black text-red-500">{rows.filter(r => r.feedback.rating <= 2).length}</p></div>
        <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">Unresolved</p><p className="mt-1 text-2xl font-black text-brand-500">{rows.filter(r => r.feedback.status !== "resolved").length}</p></div>
      </div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-4"><h2 className="font-black text-gray-900">Recent feedback</h2><button onClick={load} className="text-xs font-bold text-brand-500">Refresh</button></div>
        {loading ? <p className="p-6 text-sm text-gray-500">Loading…</p> : rows.length === 0 ? <p className="p-6 text-sm text-gray-500">No feedback yet.</p> : (
          <div className="divide-y divide-gray-100">
            {rows.map(row => <div key={row.feedback.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-900">{row.user?.name || "Member"}</span>
                <span className="text-amber-500">{"★".repeat(row.feedback.rating)}<span className="text-gray-200">{"★".repeat(5 - row.feedback.rating)}</span></span>
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-500">{row.feedback.status}</span>
              </div>
              {row.feedback.comment && <p className="mt-2 text-sm text-gray-600">{row.feedback.comment}</p>}
              <div className="mt-3 flex gap-2">
                {row.feedback.status !== "reviewed" && <button onClick={() => update(row.feedback.id, "reviewed")} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600">Mark reviewed</button>}
                {row.feedback.status !== "resolved" && <button onClick={() => update(row.feedback.id, "resolved")} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Resolve</button>}
              </div>
            </div>)}
          </div>
        )}
      </div>
    </div>
  )
}