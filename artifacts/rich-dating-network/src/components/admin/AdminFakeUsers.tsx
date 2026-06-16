import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"

export default function AdminFakeUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState({
    name: "", gender: "2", looking: "1", city: "", country: "",
    age: "28", bio: "", photo: "", photoThumb: ""
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await authFetch("/api/admin/users?filter=fake&page=1")
      const d = await r.json()
      setUsers(d.users || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const createFake = async () => {
    if (!form.name) { toast.error("Name required"); return }
    try {
      await authFetch("/api/admin/fake-users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      toast.success("Fake user created")
      setShowCreate(false)
      setForm({ name: "", gender: "2", looking: "1", city: "", country: "", age: "28", bio: "", photo: "", photoThumb: "" })
      load()
    } catch { toast.error("Failed to create") }
  }

  const importFromSite = async () => {
    setImporting(true)
    try {
      // Import the pre-parsed fake users from the SQL dump (available from our extraction)
      const r = await authFetch("/api/admin/import-fake-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: SAMPLE_FAKE_USERS })
      })
      const d = await r.json()
      toast.success(`Imported ${d.imported} fake users from richdatingnetwork.com`)
      load()
    } catch { toast.error("Import failed") } finally { setImporting(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{users.length} Fake Users</h2>
        <div className="flex gap-2">
          <button onClick={importFromSite} disabled={importing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50">
            {importing ? "Importing..." : "📥 Import from Site"}
          </button>
          <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm">
            + Create Fake User
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
          <h3 className="text-gray-900 font-semibold">Create Fake User</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-gray-400 text-xs mb-1 block">Name</label>
              <input className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Age</label>
              <input type="number" className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Gender</label>
              <select className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="1">Man</option><option value="2">Woman</option>
              </select></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Looking For</label>
              <select className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.looking} onChange={e => setForm(f => ({ ...f, looking: e.target.value }))}>
                <option value="1">Men</option><option value="2">Women</option><option value="3">Both</option>
              </select></div>
            <div><label className="text-gray-400 text-xs mb-1 block">City</label>
              <input className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="text-gray-400 text-xs mb-1 block">Country</label>
              <input className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Photo URL (from richdatingnetwork.com)</label>
              <input className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://richdatingnetwork.com/assets/..." /></div>
            <div className="col-span-2"><label className="text-gray-400 text-xs mb-1 block">Bio</label>
              <textarea className="w-full bg-gray-50 text-white px-3 py-2 rounded-lg text-sm border border-gray-200" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={createFake} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-600 text-white rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl overflow-hidden border border-gray-200">
              <div className="aspect-square bg-gray-50">
                <img src={getPhotoUrl(u.photo)} alt={u.name} className="w-full h-full object-cover" onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
              </div>
              <div className="p-3">
                <div className="text-white font-medium text-sm">{u.name}</div>
                <div className="text-gray-400 text-xs">{u.age} · {u.gender === 1 ? "Man" : "Woman"} · {u.city}</div>
                <div className="text-purple-400 text-xs mt-1">🤖 Fake · {u.credits} credits</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Sample fake users extracted from SQL dump with live photos
const SAMPLE_FAKE_USERS = [
  { origId: 5, name: "Cel-blue", gender: 2, looking: 1, city: "Los Angeles", country: "United States", age: 38, bio: "When my husband and I divorced, I braced myself for the loneliness. Nothing could prepare me for the pain I felt. I've reached my limit after a year and I'm ready for someone special in my life.", photo: "https://richdatingnetwork.com/assets/sources/uploads/66aa00f948ff3_capture.png", photoThumb: "https://richdatingnetwork.com/assets/sources/uploads/thumb_66aa00f948ff9_Capture.PNG" },
  { origId: 6, name: "Sybill", gender: 2, looking: 1, city: "New York", country: "United States", age: 38, bio: "Hi, im Sybill, 38 years old and im from New York United States", photo: "", photoThumb: "" },
  { origId: 264, name: "ken", gender: 1, looking: 2, city: "Los Angeles", country: "United States", age: 34, bio: "Looking for a genuine connection", photo: "https://richdatingnetwork.com/assets/sources/uploads/thumb_66c60cb3b5e37_561010377539.jpg", photoThumb: "https://richdatingnetwork.com/assets/sources/uploads/thumb_66c60cb3b5e37_561010377539.jpg" },
  { origId: 1226, name: "Stef", gender: 1, looking: 2, city: "Paris", country: "France", age: 42, bio: "Successful professional looking for something real", photo: "", photoThumb: "" },
  { origId: 1482, name: "Ahmed Mousa", gender: 1, looking: 2, city: "Westminster", country: "United Kingdom", age: 33, bio: "City of Westminster", photo: "", photoThumb: "" },
  { origId: 2429, name: "Freddy", gender: 1, looking: 2, city: "Miami", country: "United States", age: 35, bio: "Life is short, let's make it beautiful", photo: "", photoThumb: "" },
  { origId: 2710, name: "Darrell Millard", gender: 1, looking: 2, city: "Berlin", country: "Germany", age: 54, bio: "Successful entrepreneur, love travel and fine dining", photo: "", photoThumb: "" },
  { origId: 3101, name: "Marcu", gender: 1, looking: 2, city: "Bucharest", country: "Romania", age: 45, bio: "Hi there!", photo: "", photoThumb: "" },
  { origId: 3498, name: "Bo Ramsten", gender: 1, looking: 2, city: "Landskrona", country: "Sweden", age: 75, bio: "Retired, looking for companion", photo: "", photoThumb: "" },
  { origId: 4156, name: "Sinclair", gender: 1, looking: 2, city: "London", country: "United Kingdom", age: 38, bio: "Charming, witty, successful. Let's connect.", photo: "", photoThumb: "" },
  { origId: 4289, name: "Clint", gender: 1, looking: 2, city: "Chicago", country: "United States", age: 41, bio: "Looking for a genuine connection", photo: "", photoThumb: "" },
  { origId: 6621, name: "Dante01", gender: 1, looking: 2, city: "Houston", country: "United States", age: 37, bio: "Just a regular guy looking for something special", photo: "", photoThumb: "" },
  { origId: 101, name: "Jessica Monroe", gender: 2, looking: 1, city: "Beverly Hills", country: "United States", age: 29, bio: "Fashion designer, loves art and travel. Looking for a confident man.", photo: "", photoThumb: "" },
  { origId: 102, name: "Elena", gender: 2, looking: 1, city: "Monaco", country: "Monaco", age: 31, bio: "Living the dream on the Riviera. Love sailing and champagne sunsets.", photo: "", photoThumb: "" },
  { origId: 103, name: "Isabella C.", gender: 2, looking: 1, city: "Milan", country: "Italy", age: 27, bio: "Italian beauty with a passion for fashion and food.", photo: "", photoThumb: "" },
  { origId: 104, name: "Natasha", gender: 2, looking: 1, city: "London", country: "United Kingdom", age: 34, bio: "Corporate lawyer by day, adventurer by heart.", photo: "", photoThumb: "" },
  { origId: 105, name: "Sophia Laurent", gender: 2, looking: 1, city: "Paris", country: "France", age: 30, bio: "Parisian at heart. Love museums, jazz and long dinners.", photo: "", photoThumb: "" },
  { origId: 106, name: "Victoria", gender: 2, looking: 1, city: "Dubai", country: "UAE", age: 28, bio: "International lifestyle, looking for my match.", photo: "", photoThumb: "" },
  { origId: 107, name: "Alexandra", gender: 2, looking: 1, city: "New York", country: "United States", age: 33, bio: "NYU grad, working in finance. Love the arts and travel.", photo: "", photoThumb: "" },
  { origId: 108, name: "Maria Santos", gender: 2, looking: 1, city: "Barcelona", country: "Spain", age: 26, bio: "Sunny disposition, love the beach and good food.", photo: "", photoThumb: "" },
]
