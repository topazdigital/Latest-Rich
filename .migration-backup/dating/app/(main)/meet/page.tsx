import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import MeetPage from '@/components/meet/MeetPage'

export default async function Meet() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)

  const users = await prisma.user.findMany({
    where: { id: { not: userId }, blocked: 0, suspend: 0 },
    select: {
      id: true, name: true, age: true, city: true, country: true,
      photo: true, photoThumb: true, verified: true, premium: true,
      gender: true, lastAccess: true, bio: true,
    },
    orderBy: [{ premium: 'desc' }, { popular: 'desc' }],
    take: 50,
  }).catch(() => [])

  return <MeetPage userId={userId} users={users as any} />
}
