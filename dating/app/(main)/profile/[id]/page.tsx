import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProfileView from '@/components/profile/ProfileView'

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const myId = parseInt((session?.user as any)?.id)
  const profileId = parseInt(params.id)

  const [user, photos, liked, isMatch] = await Promise.all([
    prisma.user.findUnique({
      where: { id: profileId },
      include: { userExtended: true },
    }).catch(() => null),
    prisma.userPhoto.findMany({ where: { uid: profileId, approved: 1 }, orderBy: { isPrimary: 'desc' } }).catch(() => []),
    myId !== profileId ? prisma.userLike.findFirst({ where: { u1: myId, u2: profileId } }).catch(() => null) : null,
    myId !== profileId ? prisma.userLike.findFirst({ where: { u1: profileId, u2: myId } }).catch(() => null) : null,
  ])

  if (!user) notFound()

  // Record visit
  if (myId !== profileId) {
    await prisma.userVisit.upsert({
      where: { u1_u2: { u1: myId, u2: profileId } },
      create: { u1: myId, u2: profileId, time: Math.floor(Date.now() / 1000) },
      update: { time: Math.floor(Date.now() / 1000) },
    }).catch(() => {})
  }

  const isOwnProfile = myId === profileId

  return (
    <ProfileView
      user={user as any}
      photos={photos as any}
      isOwnProfile={isOwnProfile}
      myId={myId}
      hasLiked={!!liked}
      isMatch={!!liked && !!isMatch}
    />
  )
}
