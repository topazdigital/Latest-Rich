import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GiftsPage from '@/components/gifts/GiftsPage'

export default async function Gifts({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  const myId = parseInt((session?.user as any)?.id)
  const toId = parseInt(params.userId)
  const [me, toUser, gifts] = await Promise.all([
    prisma.user.findUnique({ where: { id: myId }, select: { credits: true } }).catch(() => null),
    prisma.user.findUnique({ where: { id: toId }, select: { id: true, name: true, photo: true, photoThumb: true } }).catch(() => null),
    prisma.gift.findMany({ where: { enabled: 1 }, orderBy: { price: 'asc' } }).catch(() => []),
  ])
  if (!toUser) notFound()
  return <GiftsPage me={me as any} toUser={toUser as any} gifts={gifts as any} />
}
