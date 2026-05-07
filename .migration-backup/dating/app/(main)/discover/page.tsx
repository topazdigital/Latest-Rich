import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import DiscoverPage from '@/components/discover/DiscoverPage'

export default async function Discover() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true, looking: true, country: true, sAge: true, sGender: true }
  }).catch(() => null)

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      blocked: 0,
      suspend: 0,
    },
    select: {
      id: true, name: true, age: true, city: true, country: true,
      photo: true, photoThumb: true, verified: true, premium: true,
      gender: true, lastAccess: true, bio: true,
    },
    orderBy: [{ premium: 'desc' }, { lastAccess: 'desc' }],
    take: 60,
  }).catch(() => [])

  return <DiscoverPage userId={userId} users={users as any} me={me as any} />
}
