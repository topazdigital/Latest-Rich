import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import VideoCallPage from '@/components/videocall/VideoCallPage'

export default async function VideoCall({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  const myId = parseInt((session?.user as any)?.id)
  const otherId = parseInt(params.userId)
  const other = await prisma.user.findUnique({ where: { id: otherId }, select: { id: true, name: true, photo: true, photoThumb: true } }).catch(() => null)
  if (!other) notFound()
  return <VideoCallPage myId={myId} other={other as any} />
}
