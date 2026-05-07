'use client'
import { useState } from 'react'
import { Bot, Plus, Loader2, Trash2, MessageSquare, Wand2, Users } from 'lucide-react'
import { getPhotoUrl, genderLabel } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props { fakeUsers: any[]; fakeMessages: any[] }

const FAKE_NAMES_F = ['Emma','Sofia','Olivia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Elizabeth','Mila','Ella','Avery','Sofia','Camila','Aria','Scarlett','Victoria','Madison','Luna','Grace','Chloe','Penelope']
const FAKE_NAMES_M = ['James','Oliver','William','Benjamin','Elijah','Lucas','Mason','Ethan','Daniel','Henry','Alexander','Michael','Owen','Sebastian','Carter','Julian','Liam','Noah','Aiden','Jackson','Logan','Jack','Luke','Samuel','David']
const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','Netherlands','Sweden','Norway','Denmark']
const CITIES = ['New York','Los Angeles','London','Toronto','Sydney','Berlin','Paris','Amsterdam','Stockholm','Oslo','Copenhagen','Melbourne','Vancouver','Chicago','Miami']
const BIOS = [
  "I'm looking for someone to share life's adventures with. Passionate about travel, food, and great conversations.",
  "Life is too short to not enjoy every moment. I love hiking, cooking, and meeting new people.",
  "Professional by day, adventurer by weekend. Looking for someone who can keep up!",
  "I believe in making memories, not just plans. Let's explore the world together.",
  "Coffee lover, bookworm, and weekend hiker. Looking for my partner in crime.",
  "Success-driven but always make time for the people I care about. Ready to find my person.",
  "Passionate about life, love, and the pursuit of happiness. Let's write our story.",
  "Entrepreneur and globe-trotter. Looking for someone equally ambitious and adventurous.",
  "I love the finer things in life but I'm equally happy with a sunset and good company.",
  "Spontaneous yet dependable. Looking for real connection in a swipe-right world.",
]

export default function FakeUsersPage({ fakeUsers, fakeMessages }: Props) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [count, setCount] = useState(10)
  const [gender, setGender] = useState('2')
  const [newMessage, setNewMessage] = useState('')
  const [addingMsg, setAddingMsg] = useState(false)
  const [messages, setMessages] = useState(fakeMessages)

  async function generateFakeUsers() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/fake-users/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, gender }),
      })
      const data = await res.json()
      if (res.ok) { toast.success(`Generated ${data.created} fake users!`); router.refresh() }
      else toast.error(data.error || 'Generation failed')
    } catch { toast.error('Failed to generate') }
    finally { setGenerating(false) }
  }

  async function deleteFakeUser(id: number) {
    try {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      toast.success('Fake user deleted')
      router.refresh()
    } catch { toast.error('Failed') }
  }

  async function addFakeMessage() {
    if (!newMessage.trim()) return
    setAddingMsg(true)
    try {
      const res = await fetch('/api/admin/fake-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage }),
      })
      const data = await res.json()
      if (res.ok) { setMessages(m => [...m, data]); setNewMessage(''); toast.success('Message added!') }
    } catch { toast.error('Failed') }
    finally { setAddingMsg(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fake User Manager</h1>

      {/* Generator */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Wand2 size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Generate Fake Profiles</h2>
            <p className="text-sm text-gray-500">Create realistic bot profiles to boost engagement</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="input-field py-2">
              <option value="1">Male</option>
              <option value="2">Female</option>
              <option value="0">Mixed</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Count</label>
            <input type="number" value={count} onChange={e => setCount(parseInt(e.target.value))} min={1} max={100} className="input-field py-2" />
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={generateFakeUsers} disabled={generating}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                : <><Bot size={18} /> Generate {count} Profiles</>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl text-sm text-yellow-700">
          ⚠️ Generated profiles use placeholder photos and AI-generated bios. They will appear active on the platform.
        </div>
      </div>

      {/* Fake messages */}
      <div className="card p-6">
        <h2 className="font-bold text-gray-900 mb-4">Auto-Reply Messages ({messages.length})</h2>
        <p className="text-sm text-gray-500 mb-4">These messages are sent automatically by fake users when real users message them.</p>
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {messages.map((m: any) => (
            <div key={m.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">
              <MessageSquare size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="flex-1 text-gray-700">{m.message}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder="Add a new auto-reply message..." className="input-field flex-1 py-2 text-sm" />
          <button onClick={addFakeMessage} disabled={addingMsg || !newMessage.trim()}
            className="btn-primary text-sm px-4 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Fake users list */}
      <div className="card">
        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
          <h2 className="font-bold text-gray-900">Existing Fake Profiles ({fakeUsers.length})</h2>
          <div className="flex items-center gap-1.5 text-sm text-purple-600">
            <Users size={14} /> {fakeUsers.length} bots
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
          {fakeUsers.map(user => (
            <div key={user.id} className="text-center group">
              <div className="relative mx-auto w-16 h-16 mb-1">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-purple-200">
                  <img src={getPhotoUrl(user.photo)} alt={user.name} className="w-full h-full object-cover" />
                </div>
                <button onClick={() => deleteFakeUser(user.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center">
                  <Trash2 size={10} />
                </button>
              </div>
              <p className="text-xs font-medium text-gray-700 truncate">{user.name.split(' ')[0]}</p>
              <p className="text-xs text-gray-400">{user.age} · {genderLabel(user.gender).charAt(0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
