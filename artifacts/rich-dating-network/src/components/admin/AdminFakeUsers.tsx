import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import { getPhotoUrl } from "../../lib/utils"
import toast from "react-hot-toast"

interface GeneratedProfile {
  name: string
  gender: number
  looking: number
  age: number
  city: string
  country: string
  countryCode: string
  bio: string
  photo: string
  photoThumb: string
  origId: number
}

export default function AdminFakeUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedProfiles, setGeneratedProfiles] = useState<GeneratedProfile[]>([])
  const [showGenerated, setShowGenerated] = useState(false)
  const [genGender, setGenGender] = useState("any")
  const [genCount, setGenCount] = useState("20")
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set())
  const [importingGenerated, setImportingGenerated] = useState(false)
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

  const generateRealProfiles = async () => {
    setGenerating(true)
    try {
      const params = new URLSearchParams({ count: genCount })
      if (genGender !== "any") params.set("gender", genGender)
      const r = await authFetch(`/api/admin/fetch-real-profiles?${params}`)
      if (!r.ok) throw new Error("Failed to fetch profiles")
      const d = await r.json()
      setGeneratedProfiles(d.profiles || [])
      setSelectedProfiles(new Set((d.profiles || []).map((_: any, i: number) => i)))
      setShowGenerated(true)
    } catch (e: any) {
      toast.error(e.message || "Failed to generate profiles")
    } finally { setGenerating(false) }
  }

  const importSelectedGenerated = async () => {
    const toImport = generatedProfiles.filter((_, i) => selectedProfiles.has(i))
    if (toImport.length === 0) { toast.error("Select at least one profile"); return }
    setImportingGenerated(true)
    try {
      const r = await authFetch("/api/admin/import-fake-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: toImport })
      })
      const d = await r.json()
      toast.success(`Imported ${d.imported} real-looking profiles!`)
      setShowGenerated(false)
      setGeneratedProfiles([])
      load()
    } catch { toast.error("Import failed") } finally { setImportingGenerated(false) }
  }

  const toggleProfile = (i: number) => {
    setSelectedProfiles(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{users.length} Fake Users</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={importFromSite} disabled={importing} style={{
            padding: '0.5rem 1rem', background: importing ? '#9ca3af' : '#7c3aed',
            color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
          }}>
            {importing ? "Importing..." : "📥 Import from Site"}
          </button>
          <button onClick={() => setShowGenerated(!showGenerated)} style={{
            padding: '0.5rem 1rem', background: '#0ea5e9',
            color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            ✨ Generate Real Profiles
          </button>
          <button onClick={async () => {
            if (!confirm("Reset ALL fake user passwords to 'testuser'?")) return
            try {
              const r = await authFetch("/api/admin/fake-users/reset-passwords", { method: "POST" })
              const d = await r.json()
              if (!r.ok) throw new Error(d.error)
              toast.success(d.message || "Passwords reset!")
            } catch (e: any) { toast.error(e.message || "Failed") }
          }} style={{
            padding: '0.5rem 1rem', background: '#f59e0b',
            color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            🔑 Reset All Passwords
          </button>
          <button onClick={() => setShowCreate(!showCreate)} style={{
            padding: '0.5rem 1rem', background: '#FF192C',
            color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit'
          }}>
            + Create Fake User
          </button>
        </div>
      </div>

      {/* Generate Real Profiles Panel */}
      {showGenerated && (
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#111827', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>✨ Generate Real-Looking Profiles</h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Fetches real photos and names from randomuser.me — they look like genuine users, not AI.</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Count</label>
              <select value={genCount} onChange={e => setGenCount(e.target.value)} style={{
                padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', background: '#f9fafb', color: '#111827', fontFamily: 'inherit'
              }}>
                <option value="10">10 profiles</option>
                <option value="20">20 profiles</option>
                <option value="30">30 profiles</option>
                <option value="50">50 profiles</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Gender</label>
              <select value={genGender} onChange={e => setGenGender(e.target.value)} style={{
                padding: '0.4rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem',
                fontSize: '0.875rem', background: '#f9fafb', color: '#111827', fontFamily: 'inherit'
              }}>
                <option value="any">Any gender</option>
                <option value="female">Women only</option>
                <option value="male">Men only</option>
              </select>
            </div>
            <button onClick={generateRealProfiles} disabled={generating} style={{
              padding: '0.45rem 1.25rem', background: generating ? '#9ca3af' : '#0ea5e9',
              color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
              cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 600
            }}>
              {generating ? "Fetching..." : "🔄 Fetch Profiles"}
            </button>
          </div>

          {generatedProfiles.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {selectedProfiles.size} of {generatedProfiles.length} selected
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setSelectedProfiles(new Set(generatedProfiles.map((_, i) => i)))} style={{
                    fontSize: '0.75rem', color: '#0ea5e9', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                  }}>Select all</button>
                  <span style={{ color: '#d1d5db' }}>·</span>
                  <button onClick={() => setSelectedProfiles(new Set())} style={{
                    fontSize: '0.75rem', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                  }}>Deselect all</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem', maxHeight: '480px', overflowY: 'auto', marginBottom: '1rem' }}>
                {generatedProfiles.map((p, i) => (
                  <div key={i} onClick={() => toggleProfile(i)} style={{
                    background: selectedProfiles.has(i) ? '#eff6ff' : '#f8fafc',
                    borderRadius: '0.75rem', overflow: 'hidden',
                    border: `2px solid ${selectedProfiles.has(i) ? '#3b82f6' : '#e2e8f0'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{ position: 'relative', aspectRatio: '1', background: '#e2e8f0' }}>
                      <img
                        src={p.photo}
                        alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => (e.currentTarget.src = "/images/default-avatar.svg")}
                      />
                      {selectedProfiles.has(i) && (
                        <div style={{
                          position: 'absolute', top: '0.4rem', right: '0.4rem',
                          width: '1.25rem', height: '1.25rem', borderRadius: '50%',
                          background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.65rem', color: '#fff', fontWeight: 800
                        }}>✓</div>
                      )}
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.age} · {p.gender === 1 ? "Man" : "Woman"}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.city}, {p.country}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={importSelectedGenerated} disabled={importingGenerated || selectedProfiles.size === 0} style={{
                  padding: '0.5rem 1.25rem', background: importingGenerated ? '#9ca3af' : '#22c55e',
                  color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
                  cursor: importingGenerated || selectedProfiles.size === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', fontWeight: 600
                }}>
                  {importingGenerated ? "Importing..." : `Import ${selectedProfiles.size} Profiles`}
                </button>
                <button onClick={() => { setShowGenerated(false); setGeneratedProfiles([]) }} style={{
                  padding: '0.5rem 1rem', background: '#f1f5f9', color: '#475569',
                  border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {showCreate && (
        <div style={{ background: '#fff', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#111827', fontWeight: 600, marginBottom: '1rem' }}>Create Fake User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Name</label>
              <input style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Age</label>
              <input type="number" style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Gender</label>
              <select style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="1">Man</option><option value="2">Woman</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Looking For</label>
              <select style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.looking} onChange={e => setForm(f => ({ ...f, looking: e.target.value }))}>
                <option value="1">Men</option><option value="2">Women</option><option value="3">Both</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>City</label>
              <input style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Country</label>
              <input style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Photo URL</label>
              <input style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box' }} value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} placeholder="https://..." />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Bio</label>
              <textarea style={{ width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', color: '#111827', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }} rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={createFake} style={{ padding: '0.45rem 1.25rem', background: '#FF192C', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>Create</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '0.45rem 1rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <div style={{ width: '2rem', height: '2rem', border: '2px solid #FF192C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#fff', borderRadius: '1rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <div style={{ aspectRatio: '1', background: '#f1f5f9' }}>
                <img src={getPhotoUrl(u.photo)} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => (e.currentTarget.src = "/images/default-avatar.svg")} />
              </div>
              <div style={{ padding: '0.75rem' }}>
                <div style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.875rem' }}>{u.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.age} · {u.gender === 1 ? "Man" : "Woman"} · {u.city}</div>
                <div style={{ color: '#7c3aed', fontSize: '0.7rem', marginTop: '0.25rem' }}>🤖 Fake · {u.credits} credits</div>
                <button
                  onClick={async () => {
                    try {
                      const r = await authFetch(`/api/admin/fake-users/${u.id}/login-token`, { method: 'POST' })
                      const d = await r.json()
                      if (!r.ok) throw new Error(d.error || 'Failed')
                      const { setStoredAuth } = await import('../../lib/auth')
                      setStoredAuth({ user: d.user, token: d.token })
                      window.open('/discover', '_blank')
                    } catch (e: any) { toast.error(e.message || 'Login failed') }
                  }}
                  style={{
                    marginTop: '0.5rem', width: '100%',
                    padding: '0.3rem 0.5rem', background: '#0ea5e9',
                    color: '#fff', border: 'none', borderRadius: '0.4rem',
                    fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
                  }}
                >
                  🔑 Login as
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
