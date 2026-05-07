import { useState, useEffect } from 'react'
import HomeFeed from '../components/home/HomeFeed'
import { useAuth } from '../hooks/useAuth'

export default function HomePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/users/suggested', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch('/api/feed', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
      fetch('/api/stories', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
    ]).then(([suggestedUsers, feedPosts, stories]) => {
      setData({ suggestedUsers, feedPosts: Array.isArray(feedPosts) ? feedPosts : [], stories: Array.isArray(stories) ? stories : [] })
    }).finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <HomeFeed
      userId={user?.id || 0}
      suggestedUsers={data?.suggestedUsers || []}
      feedPosts={data?.feedPosts || []}
      stories={data?.stories || []}
    />
  )
}
