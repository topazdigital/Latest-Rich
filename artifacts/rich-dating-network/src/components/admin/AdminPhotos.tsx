import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Check, X, AlertTriangle, Image } from "lucide-react"

interface PendingPhoto {
  photo: { id: number; photo: string; thumb: string; approved: number; flagged: number; flagReason: string; created: number }
  user: { id: number; name: string } | null
}

export default function AdminPhotos() {
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/photos/admin/pending")
      const d = await r.json()
      setPhotos(Array.isArray(d) ? d : [])
    } catch { setPhotos([]) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    const res = await authFetch(`/api/photos/admin/approve/${id}`, { method: "PUT" })
    if (res.ok) { toast.success("Photo approved"); setPhotos(p => p.filter(x => x.photo.id !== id)) }
    else toast.error("Failed")
  }

  const reject = async (id: number) => {
    const res = await authFetch(`/api/photos/admin/reject/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Photo rejected & deleted"); setPhotos(p => p.filter(x => x.photo.id !== id)) }
    else toast.error("Failed")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Photo Moderation</h2>
          <p className="text-gray-400 text-xs mt-0.5">{photos.length} photos pending review</p>
        </div>
        <button onClick={load} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm border border-gray-700">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16">
          <Image size={48} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">No pending photos</p>
          <p className="text-gray-600 text-sm mt-1">All photos have been reviewed</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map(({ photo, user }) => (
            <div key={photo.id} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
              <div className="relative aspect-square bg-gray-800">
                <img
                  src={`/api/uploads/${photo.photo}`}
                  alt="Pending"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = "/placeholder-user.jpg" }}
                />
                {photo.flagged === 1 && (
                  <div className="absolute top-2 left-2 bg-red-500 rounded-full p-1">
                    <AlertTriangle size={12} className="text-white" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-white text-xs font-semibold truncate">{user?.name || "Unknown"}</p>
                {photo.flagged === 1 && (
                  <p className="text-red-400 text-xs mt-0.5 truncate">{photo.flagReason || "Flagged"}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => approve(photo.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">
                    <Check size={12} /> Approve
                  </button>
                  <button onClick={() => reject(photo.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
