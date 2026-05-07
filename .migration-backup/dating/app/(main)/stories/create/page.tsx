'use client'
import { useRef, useState } from 'react'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function CreateStory() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  async function uploadStory() {
    const file = fileRef.current?.files?.[0]
    if (!file) return toast.error('Select a photo first')
    setUploading(true)
    const fd = new FormData()
    fd.append('photo', file)
    try {
      const res = await fetch('/api/stories', { method: 'POST', body: fd })
      if (res.ok) { toast.success('Story posted!'); router.push('/home') }
      else toast.error('Upload failed')
    } catch { toast.error('Failed') }
    finally { setUploading(false) }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-8 text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Story</h1>
      {preview ? (
        <div className="relative mb-6">
          <img src={preview} alt="preview" className="w-full rounded-2xl aspect-[9/16] object-cover" />
        </div>
      ) : (
        <label className="block w-full aspect-[9/16] bg-gray-100 rounded-2xl cursor-pointer hover:bg-gray-200 transition-colors flex items-center justify-center mb-6">
          <div className="text-center">
            <Camera size={40} className="text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Select a photo or video</p>
            <p className="text-gray-400 text-sm">Your story disappears after 24 hours</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      )}
      <div className="flex gap-3">
        <Link href="/home" className="btn-outline flex-1">Cancel</Link>
        <button onClick={uploadStory} disabled={!preview || uploading} className="btn-primary flex-1 flex items-center justify-center gap-2">
          {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting...</> : <><Upload size={16} /> Share Story</>}
        </button>
      </div>
    </div>
  )
}
