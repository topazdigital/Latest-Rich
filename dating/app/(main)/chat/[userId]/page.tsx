import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'

export default async function ChatWindowPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  const myId = parseInt((session?.user as any)?.id)
  const otherId = parseInt(params.userId)

  const [me, other, messages, credits] = await Promise.all([
    prisma.user.findUnique({ where: { id: myId }, select: { id: true, name: true, photo: true, photoThumb: true, credits: true, premium: true } }).catch(() => null),
    prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, photo: true, photoThumb: true, verified: true, premium: true, lastAccess: true, fake: true } }).catch(() => null),
    prisma.chat.findMany({
      where: { OR: [{ u1: myId, u2: otherId }, { u1: otherId, u2: myId }] },
      orderBy: { time: 'asc' },
      take: 100,
    }).catch(() => []),
    prisma.user.findUnique({ where: { id: myId }, select: { credits: true } }).catch(() => null),
  ])

  if (!other) notFound()

  // Mark messages as read
  await prisma.chat.updateMany({ where: { u1: otherId, u2: myId, read: 0 }, data: { read: 1 } }).catch(() => {})

  // Get fake messages for AI engagement
  const fakeMessages = await prisma.fakeMessage.findMany({ take: 20 }).catch(() => [])

  return <ChatWindow me={me as any} other={other as any} initialMessages={messages as any} fakeMessages={fakeMessages as any} />
}
