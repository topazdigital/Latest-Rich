import { useState } from 'react'
import { getPhotoUrl, timeAgo, isOnline } from '../../lib/utils'
import { Link } from 'wouter'
import { Heart, MessageCircle, Plus, Crown, BadgeCheck, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  userId: number
  suggestedUsers: any[]
  feedPosts: any[]
  stories: any[]
}

export default function HomeFeed({ userId, suggestedUsers, feedPosts, stories }: Props) {
  const [posts, setPosts] = useState(feedPosts)
  const [newPost, setNewPost] = useState('')
  const [posting, setPosting] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())
  const { token, user } = useAuth()

  async function submitPost() {
    if (!newPost.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newPost }),
      })
      const data = await res.json()
      if (res.ok) {
        setPosts(prev => [data.post, ...prev])
        setNewPost('')
        toast.success('Posted!')
      }
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  async function likePost(postId: number) {
    const isLiked = likedPosts.has(postId)
    setLikedPosts(prev => {
      const s = new Set(prev)
      isLiked ? s.delete(postId) : s.add(postId)
      return s
    })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, _count: { ...p._count, likes: p._count.likes + (isLiked ? -1 : 1) } } : p))
    await fetch(`/api/feed/${postId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  }

  async function likeUser(targetId: number) {
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId }) })
      toast.success('Liked! 💝')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {stories.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Stories</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500">Add</span>
                </div>
                {stories.map((story: any) => (
                  <div key={story.id} className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full ring-2 ring-brand-500 ring-offset-2 overflow-hidden">
                      <img src={getPhotoUrl(story.user?.photo)} alt={story.user?.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-gray-600 w-14 text-center truncate">{story.user?.name?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                <img src={getPhotoUrl(user?.photoThumb || user?.photo)} alt="me" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={e => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={2}
                  className="w-full resize-none border-0 focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 text-sm bg-transparent"
                />
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div />
                  <button onClick={submitPost} disabled={!newPost.trim() || posting}
                    className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50">
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((post: any) => (
              <div key={post.id} className="card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Link href={`/profile/${post.user?.id}`}>
                    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-100">
                      <img src={getPhotoUrl(post.user?.photoThumb || post.user?.photo)} alt={post.user?.name} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <Link href={`/profile/${post.user?.id}`} className="font-semibold text-gray-900 text-sm hover:text-brand-500">{post.user?.name}</Link>
                      {post.user?.verified === 1 && <BadgeCheck size={14} className="text-blue-500 fill-blue-100" />}
                    </div>
                    <p className="text-xs text-gray-400">{timeAgo(post.time)}</p>
                  </div>
                </div>
                <p className="text-gray-800 text-sm leading-relaxed mb-4">{post.content}</p>
                {post.photo && (
                  <div className="rounded-xl overflow-hidden mb-4">
                    <img src={getPhotoUrl(post.photo)} alt="post" className="w-full max-h-80 object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 pt-3 border-t border-gray-50">
                  <button onClick={() => likePost(post.id)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${likedPosts.has(post.id) ? 'text-brand-500' : 'text-gray-500 hover:text-brand-500'}`}>
                    <ThumbsUp size={16} className={likedPosts.has(post.id) ? 'fill-brand-500' : ''} />
                    {post._count?.likes || 0}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm text-gray-400">
                    <MessageCircle size={16} />{post._count?.comments || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggested Members</h3>
            <div className="space-y-3">
              {suggestedUsers.slice(0, 8).map((u: any) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Link href={`/profile/${u.id}`}>
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <img src={getPhotoUrl(u.photoThumb || u.photo)} alt={u.name} className="w-full h-full object-cover" />
                      {isOnline(u.lastAccess) && <div className="online-dot absolute bottom-0 right-0" />}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <Link href={`/profile/${u.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-500 truncate">{u.name}</Link>
                      {u.premium === 1 && <Crown size={12} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400">{u.city || u.country}</p>
                  </div>
                  <button onClick={() => likeUser(u.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-50 transition-colors">
                    <Heart size={16} className="text-gray-400 hover:text-brand-500" />
                  </button>
                </div>
              ))}
            </div>
            <Link href="/discover" className="block text-center text-sm text-brand-500 hover:text-brand-600 mt-3 font-medium">
              See all members →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
