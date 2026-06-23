import { useState } from 'react'
import { getPhotoUrl, timeAgo, isOnline, profileUrl } from '../../lib/utils'
import { Link } from 'wouter'
import { Heart, MessageCircle, Crown, BadgeCheck, ThumbsUp, X, ChevronLeft, ChevronRight, Search, Zap } from 'lucide-react'
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
  const [activeStory, setActiveStory] = useState<{ story: any; idx: number } | null>(null)
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
      if (res.ok) { setPosts(prev => [data.post, ...prev]); setNewPost(''); toast.success('Posted!') }
    } catch { toast.error('Failed to post') }
    finally { setPosting(false) }
  }

  async function likePost(postId: number) {
    const isLiked = likedPosts.has(postId)
    setLikedPosts(prev => { const s = new Set(prev); isLiked ? s.delete(postId) : s.add(postId); return s })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, _count: { ...p._count, likes: (p._count?.likes || 0) + (isLiked ? -1 : 1) } } : p))
    await fetch(`/api/feed/${postId}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
  }

  async function likeUser(targetId: number) {
    try {
      await fetch('/api/likes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ targetId }) })
      toast.success('Liked! 💝')
    } catch { toast.error('Failed') }
  }

  return (
    <>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }} className="lg:grid-cols-3-layout">

          {/* ── Main column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="main-col">

            {/* Welcome banner */}
            <div style={{
              background: 'linear-gradient(135deg, #FF192C 0%, #ff5f6b 100%)',
              borderRadius: '1.25rem',
              padding: '1.25rem 1.5rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(255,25,44,0.25)',
            }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.2rem' }}>
                  Welcome back, {user?.name?.split(' ')[0]} 👋
                </p>
                <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>
                  Discover new people and make connections
                </p>
              </div>
              <Link href="/discover" style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                borderRadius: '0.875rem',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}>
                <Search size={14} /> Discover
              </Link>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {[
                { icon: '👥', label: 'Find Matches', href: '/discover', color: '#ffe0e2', border: '#ffc5c9', text: '#e0001b' },
                { icon: '⚡', label: 'Boost Profile', href: '/boost', color: '#fff7ed', border: '#fed7aa', text: '#c2410c' },
                { icon: '💝', label: 'Send Gifts', href: '/gifts', color: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
              ].map((a, i) => (
                <Link key={i} href={a.href} style={{
                  background: a.color,
                  border: `1px solid ${a.border}`,
                  borderRadius: '1rem',
                  padding: '1rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  display: 'block',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{a.icon}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: a.text }}>{a.label}</div>
                </Link>
              ))}
            </div>

            {/* Stories */}
            {stories.length > 0 && (
              <div className="card" style={{ padding: '1rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.75rem' }}>Stories</p>
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {stories.map((story: any, idx: number) => (
                    <button key={story.id} onClick={() => setActiveStory({ story, idx })}
                      style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <div style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', outline: '2px solid #FF192C', outlineOffset: '2px', overflow: 'hidden' }}>
                        <img src={getPhotoUrl(story.user?.photo)} alt={story.user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: '#6b7280', maxWidth: '3.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{story.user?.name?.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Post composer */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: '#f3f4f6', flexShrink: 0, overflow: 'hidden' }}>
                  <img src={getPhotoUrl(user?.photoThumb || user?.photo)} alt="me" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={2}
                    style={{
                      width: '100%',
                      resize: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#374151',
                      fontSize: '0.9rem',
                      background: 'transparent',
                      fontFamily: 'inherit',
                      lineHeight: '1.5',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f3f4f6' }}>
                    <button onClick={submitPost} disabled={!newPost.trim() || posting} className="btn-primary"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}>
                      {posting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Feed posts */}
            {posts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {posts.map((post: any) => (
                  <div key={post.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Link href={post.user ? profileUrl(post.user) : '#'}>
                        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', overflow: 'hidden', outline: '2px solid #f3f4f6' }}>
                          <img src={getPhotoUrl(post.user?.photoThumb || post.user?.photo)} alt={post.user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      </Link>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Link href={post.user ? profileUrl(post.user) : '#'} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', textDecoration: 'none' }}>{post.user?.name}</Link>
                          {post.user?.verified === 1 && <BadgeCheck size={14} color="#3b82f6" />}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{timeAgo(post.time)}</p>
                      </div>
                    </div>
                    <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1rem' }}>{post.content}</p>
                    {post.photo && (
                      <div style={{ borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem' }}>
                        <img src={getPhotoUrl(post.photo)} alt="post" style={{ width: '100%', maxHeight: '20rem', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f9fafb' }}>
                      <button onClick={() => likePost(post.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                        color: likedPosts.has(post.id) ? '#FF192C' : '#6b7280',
                        transition: 'color 0.15s', padding: 0,
                      }}>
                        <ThumbsUp size={16} fill={likedPosts.has(post.id) ? '#FF192C' : 'none'} />
                        {post._count?.likes || 0}
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#9ca3af' }}>
                        <MessageCircle size={16} />{post._count?.comments || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>💌</div>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '0.4rem' }}>Your feed is ready</p>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Start discovering people and their updates will appear here</p>
                <Link href="/discover" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
                  Explore Members
                </Link>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Suggested members */}
            <div className="card" style={{ padding: '1rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.875rem' }}>Suggested Members</p>
              {suggestedUsers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {suggestedUsers.slice(0, 8).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Link href={profileUrl(u)}>
                        <div style={{ position: 'relative', width: '2.5rem', height: '2.5rem', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={getPhotoUrl(u.photoThumb || u.photo)} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isOnline(u.lastAccess) && (
                            <div className="online-dot" style={{ position: 'absolute', bottom: 0, right: 0 }} />
                          )}
                        </div>
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Link href={profileUrl(u)} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</Link>
                          {u.premium === 1 && <Crown size={11} color="#f59e0b" />}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.city || u.country}</p>
                      </div>
                      <button onClick={() => likeUser(u.id)} style={{
                        width: '2rem', height: '2rem', borderRadius: '50%', border: 'none', background: '#fff0f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s',
                      }}>
                        <Heart size={15} color="#FF192C" />
                      </button>
                    </div>
                  ))}
                  <Link href="/discover" style={{ display: 'block', textAlign: 'center', fontSize: '0.82rem', color: '#FF192C', fontWeight: 700, textDecoration: 'none', paddingTop: '0.5rem', borderTop: '1px solid #f9fafb' }}>
                    See all members →
                  </Link>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginBottom: '0.75rem' }}>Complete your profile to see matches</p>
                  <Link href="/settings" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 1rem' }}>Edit Profile</Link>
                </div>
              )}
            </div>

            {/* Boost promo */}
            <Link href="/boost" style={{
              display: 'block',
              background: 'linear-gradient(135deg, #f97316, #ef4444)',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(249,115,22,0.4)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(249,115,22,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} color="#fff" fill="#fff" />
                </div>
                <p style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Boost Profile</p>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.78rem', lineHeight: '1.5' }}>
                Get 10x more profile views. Appear at the top of discovery!
              </p>
              <div style={{ marginTop: '0.875rem', background: 'rgba(255,255,255,0.2)', borderRadius: '0.75rem', padding: '0.4rem 0.875rem', display: 'inline-block' }}>
                <span style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>Boost now →</span>
              </div>
            </Link>

            {/* Credits */}
            <div className="card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>💳 Your Credits</p>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827' }}>{user?.credits || 0}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.75rem' }}>Use credits to send super likes, gifts, and boost your profile</p>
              <Link href="/credits" className="btn-secondary" style={{ width: '100%', fontSize: '0.82rem', padding: '0.5rem', borderRadius: '0.75rem', justifyContent: 'center' }}>
                Get More Credits
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Story viewer */}
      {activeStory && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setActiveStory(null)}>
          <button style={{ position: 'absolute', top: '1rem', right: '1rem', width: '2.5rem', height: '2.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10 }}
            onClick={() => setActiveStory(null)}>
            <X size={20} color="#fff" />
          </button>
          {stories.length > 1 && (
            <>
              <button style={{ position: 'absolute', left: '1rem', width: '2.5rem', height: '2.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                onClick={e => { e.stopPropagation(); const prev = (activeStory.idx - 1 + stories.length) % stories.length; setActiveStory({ story: stories[prev], idx: prev }) }}>
                <ChevronLeft size={20} color="#fff" />
              </button>
              <button style={{ position: 'absolute', right: '1rem', width: '2.5rem', height: '2.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                onClick={e => { e.stopPropagation(); const next = (activeStory.idx + 1) % stories.length; setActiveStory({ story: stories[next], idx: next }) }}>
                <ChevronRight size={20} color="#fff" />
              </button>
            </>
          )}
          <div style={{ width: '100%', maxWidth: '22rem', height: '80vh', position: 'relative', borderRadius: '1.25rem', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <img src={getPhotoUrl(activeStory.story.photo || activeStory.story.user?.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', overflow: 'hidden', outline: '2px solid #fff' }}>
                <img src={getPhotoUrl(activeStory.story.user?.photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>{activeStory.story.user?.name}</p>
            </div>
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
              <Link href={activeStory.story.user ? profileUrl(activeStory.story.user) : '#'}
                style={{ display: 'block', textAlign: 'center', padding: '0.65rem', background: '#fff', color: '#111827', borderRadius: '0.875rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}
                onClick={() => setActiveStory(null)}>
                View Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 1024px) {
          .lg\\:grid-cols-3-layout { grid-template-columns: 1fr 320px !important; }
          .sidebar-col { display: flex !important; }
        }
        @media (max-width: 1023px) {
          .sidebar-col { display: none; }
        }
      `}</style>
    </>
  )
}
