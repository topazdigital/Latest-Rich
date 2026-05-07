import { useState, useEffect } from "react"
import { authFetch } from "../../lib/auth"
import toast from "react-hot-toast"
import { Clock, Zap, Info } from "lucide-react"

interface Template { id: number; message: string; active: number }

const DEFAULT_MESSAGES = [
  "Truth or date?", "How are you doing?", "My friend wants to know if YOU think I'M cute",
  "I'd really love to see how you look when I'm naked", "Hey! You're are quite a match!",
  "I think I could fall madly in bed with you.", "I must be in a museum, because you truly are a work of art.",
  "Are you a time traveler? Because I absolutely see you in my future.",
  "I'm using my last 2% battery to send you this message. If that's not commitment, I don't know what is.",
  "There's not much on your bio but I'd love to get to know you. Quickfire question round?",
  "Help me choose what to make for dinner? I'll buy you breakfast after our date in return…",
  "I'm curious… what's the most daring thing you've done lately? Maybe we can top it together 😏",
  "I don't know you, but I think I love you already.",
  "I may not be a genie, but I can make your dreams come true.",
  "Was your Dad in the Air Force? Because you are da bomb.",
  "Can we turn off the light so we could be the only one to be on?",
  "I must be in heaven because I'm looking at an angel.",
  "If you were a vegetable, you'd be a cute-cumber.",
  "Do you have a name, or can I call you mine?",
  "Name a body part and I'll send you a photo",
  "Tell me, don't you think I can make you happy?",
  "Hi? What do you need for happiness honey?",
  "Wsup?", "If I were to ask you out, would your answer be the same as the answer to this question?",
  "I've got a feeling we'd get along pretty well… maybe even too well. How about we test that theory? 😈",
]

export default function AdminFakeMessages() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [newMsg, setNewMsg] = useState("")
  const [seeding, setSeeding] = useState(false)
  const [triggering, setTriggering] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await authFetch("/api/admin/fake-messages")
    const d = await r.json()
    setTemplates(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addMessage = async () => {
    if (!newMsg.trim()) { toast.error("Message required"); return }
    await authFetch("/api/admin/fake-messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMsg })
    })
    toast.success("Message added")
    setNewMsg("")
    load()
  }

  const deleteMessage = async (id: number) => {
    await authFetch(`/api/admin/fake-messages/${id}`, { method: "DELETE" })
    toast.success("Deleted")
    load()
  }

  const toggleActive = async (id: number, active: number) => {
    await authFetch(`/api/admin/fake-messages/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: active === 1 ? 0 : 1 })
    })
    load()
  }

  const seedDefaults = async () => {
    setSeeding(true)
    for (const msg of DEFAULT_MESSAGES) {
      await authFetch("/api/admin/fake-messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      })
    }
    toast.success(`Seeded ${DEFAULT_MESSAGES.length} default messages`)
    setSeeding(false)
    load()
  }

  const triggerNow = async () => {
    setTriggering(true)
    try {
      const res = await authFetch("/api/admin/trigger-auto-messages", { method: "POST" })
      const data = await res.json()
      toast.success(`Triggered! ${data.sent || 0} messages sent.`)
    } catch {
      toast.error("Failed to trigger")
    } finally {
      setTriggering(false)
    }
  }

  const activeCount = templates.filter(t => t.active === 1).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{templates.length} Message Templates</h2>
          <p className="text-gray-400 text-xs mt-0.5">{activeCount} active — same message never sent twice to same user</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={triggerNow} disabled={triggering}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
            <Zap size={13} />
            {triggering ? "Triggering..." : "Trigger Now"}
          </button>
          <button onClick={seedDefaults} disabled={seeding}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm disabled:opacity-50">
            {seeding ? "Seeding..." : "🌱 Seed Defaults"}
          </button>
        </div>
      </div>

      <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300 space-y-1">
            <p><strong>Smart deduplication:</strong> The system tracks which templates have been sent to each real user. The same message template will NEVER be sent to the same user twice — ever.</p>
            <p><strong>Timing:</strong> New registrations get their first message after the "new user delay" (default 5 seconds). Logged-in users get messages at a random time between the min and max delay. Configure timing in Settings → Auto-Message Timing.</p>
            <p><strong>User must be active:</strong> If a user logs out before their scheduled message fires, the message is skipped.</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-purple-400 font-bold text-lg">{templates.length}</div>
            <div className="text-gray-500">Total Templates</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-green-400 font-bold text-lg">{activeCount}</div>
            <div className="text-gray-500">Active</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3">
            <div className="text-red-400 font-bold text-lg">{templates.length - activeCount}</div>
            <div className="text-gray-500">Paused</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
        <label className="text-gray-300 text-sm font-medium mb-2 block">Add New Template</label>
        <div className="flex gap-2">
          <textarea
            value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Type a new fake message template..."
            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-gray-700 focus:outline-none focus:border-brand-500 resize-none"
            rows={2}
          />
          <button onClick={addMessage} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm self-end">Add</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className={`rounded-xl p-4 border flex items-start justify-between gap-4 transition-opacity ${t.active === 1 ? 'bg-gray-900 border-gray-800' : 'bg-gray-900/50 border-gray-800/50 opacity-60'}`}>
              <p className="text-gray-200 text-sm flex-1">{t.message}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(t.id, t.active)}
                  className={`text-xs px-2 py-1 rounded-md font-medium ${t.active === 1 ? 'bg-green-900/50 text-green-400 hover:bg-red-900/50 hover:text-red-400' : 'bg-gray-800 text-gray-500 hover:bg-green-900/50 hover:text-green-400'}`}>
                  {t.active === 1 ? 'Active' : 'Paused'}
                </button>
                <button onClick={() => deleteMessage(t.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">💬</div>
              <p>No templates yet. Add some or seed defaults.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
