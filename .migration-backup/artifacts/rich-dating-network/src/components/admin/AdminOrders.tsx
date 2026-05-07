import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { timeAgo } from "../../lib/utils"

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    const r = await authFetch(`/api/admin/orders?page=${page}`)
    const d = await r.json()
    setOrders(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [page])

  const totalRevenue = orders.filter((o: any) => o.order?.status === "completed").reduce((s: number, o: any) => s + (o.order?.amount || 0), 0)

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
        <div className="text-green-400 text-sm">Page Revenue</div>
        <div className="text-2xl font-bold text-white">${totalRevenue.toFixed(2)}</div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr className="text-gray-400 text-left">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((row: any, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{row.user?.name || "Unknown"}</div>
                    <div className="text-gray-500 text-xs">{row.user?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${row.order?.type === "premium" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {row.order?.type} · {row.order?.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">${(row.order?.amount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${row.order?.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {row.order?.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{timeAgo(row.order?.time * 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 justify-center">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-40">Previous</button>
        <span className="text-gray-400 text-sm">Page {page}</span>
        <button disabled={orders.length < 50} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}
