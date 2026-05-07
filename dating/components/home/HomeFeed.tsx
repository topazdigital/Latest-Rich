'use client'
import { useState } from 'react'
import { getPhotoUrl, timeAgo, isOnline } from '@/lib/utils'
import Link from 'next/link'
import { Heart, MessageCircle, Plus, Play, Crown, BadgeCheck, MoreHorizontal, Share2, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'

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

  async function submitPost() {
    if (!newPost.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    await fetch(`/api/feed/${postId}/like`, { method: 'POST' }).catch(() => {})
  }

  async function likeUser(targetId: number) {
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId }) })
      toast.success('Liked! 💝')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stories */}
          {stories.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Stories</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                <Link href="/stories/create" className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <span className="text-xs text-gray-500">Add</span>
                </Link>
                {stories.map(story => (
                  <Link key={story.id} href={`/stories/${story.user.id}`} className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-14 h-14 rounded-full ring-2 ring-brand-500 ring-offset-2 overflow-hidden">
                      <img src={getPhotoUrl(story.user.photo)} alt={story.user.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs text-gray-600 w-14 text-center truncate">{story.user.name.split(' ')[0]}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Post composer */}
          <div className="card p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                <img src="/images/default-avatar.png" alt="me" className="w-full h-full object-cover" />
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
                  <div className="flex gap-3">
                    <button className="text-xs text-gray-500 hover:text-brand-500 flex items-center gap-1 transition-colors">
                      📷 Photo
                    </button>
                    <button className="text-xs text-gray-500 hover:text-brand-500 flex items-center gap-1 transition-colors">
                      😊 Feeling
                    </button>
                  </div>
                  <button onClick={submitPost} disabled={!newPost.trim() || posting}
                    className="btn-primary text-sm py-1.5 px-4">
                    {posting ? '...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feed posts */}
          {posts.map(post => (
            <div key={post.id} className="card">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={getPhotoUrl(post.user.photo)} alt={post.user.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900 text-sm">{post.user.name}</span>
                        {post.user.verified === 1 && <BadgeCheck size={14} className="text-blue-500 fill-blue-500" />}
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(post.time)}</span>
                    </div>
                  </Link>
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <p className="text-gray-800 text-sm mb-3 leading-relaxed">{post.content}</p>
                {post.photo && (
                  <div className="rounded-xl overflow-hidden mb-3">
                    <img src={getPhotoUrl(post.photo)} alt="post" className="w-full max-h-96 object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <button onClick={() => likePost(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${likedPosts.has(post.id) ? 'text-brand-500' : 'text-gray-500 hover:text-brand-500'}`}>
                    <Heart size={16} className={likedPosts.has(post.id) ? 'fill-brand-500' : ''} />
                    {post._count.likes}
                  </button>
                  <Link href={`/feed/${post.id}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors">
                    <MessageCircle size={16} /> {post._count.comments}
                  </Link>
                  <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-500 transition-colors ml-auto">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {posts.length === 0 && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">💝</div>
              <p className="text-gray-500">No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>

        {/* Sidebar: suggested users */}
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Suggested for You</h3>
            <div className="space-y-3">
              {suggestedUsers.slice(0, 8).map(user => (
                <div key={user.id} className="flex items-center gap-3">
                  <Link href={`/profile/${user.id}`} className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-gray-100">
                      <img src={getPhotoUrl(user.photoThumb || user.photo)} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    {isOnline(user.lastAccess) && <div className="online-dot absolute bottom-0 right-0" />}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-1">
                      <span className="font-medium text-sm text-gray-900 truncate">{user.name}</span>
                      {user.verified === 1 && <BadgeCheck size={12} className="text-blue-500 flex-shrink-0" />}
                      {user.premium === 1 && <Crown size={12} className="text-gold-500 flex-shrink-0" />}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">{user.age} • {user.city || user.country}</p>
                  </div>
                  <button onClick={() => likeUser(user.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-50 hover:bg-brand-100 transition-colors">
                    <Heart size={14} className="text-brand-500" />
                  </button>
                </div>
              ))}
            </div>
            <Link href="/discover" className="block text-center text-brand-500 text-sm font-medium mt-4 hover:text-brand-600">
              See more →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
