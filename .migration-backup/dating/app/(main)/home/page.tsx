import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import HomeFeed from '@/components/home/HomeFeed'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)

  const [suggestedUsers, feedPosts, stories] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: userId },
        blocked: 0,
        suspend: 0,
      },
      select: {
        id: true, name: true, age: true, city: true, country: true,
        photo: true, photoThumb: true, verified: true, premium: true,
        gender: true, lastAccess: true, fake: true,
      },
      orderBy: { lastAccess: 'desc' },
      take: 20,
    }).catch(() => []),
    prisma.feed.findMany({
      include: {
        user: { select: { id: true, name: true, photo: true, photoThumb: true, verified: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy: { time: 'desc' },
      take: 20,
    }).catch(() => []),
    prisma.userStory.findMany({
      include: { user: { select: { id: true, name: true, photo: true, photoThumb: true } } },
      orderBy: { time: 'desc' },
      take: 30,
      distinct: ['uid'],
    }).catch(() => []),
  ])

  return <HomeFeed userId={userId} suggestedUsers={suggestedUsers as any} feedPosts={feedPosts as any} stories={stories as any} />
}
