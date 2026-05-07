import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { targetId, superlike } = await req.json()

  if (myId === targetId) return NextResponse.json({ error: 'Cannot like yourself' }, { status: 400 })

  const now = Math.floor(Date.now() / 1000)
  const existing = await prisma.userLike.findUnique({ where: { u1_u2: { u1: myId, u2: targetId } } })

  if (existing) {
    // Toggle unlike
    await prisma.userLike.delete({ where: { u1_u2: { u1: myId, u2: targetId } } })
    return NextResponse.json({ liked: false })
  }

  await prisma.userLike.create({
    data: { u1: myId, u2: targetId, time: now, superlike: superlike ? 1 : 0 },
  })

  // Check for mutual match
  const theyLikeMe = await prisma.userLike.findUnique({ where: { u1_u2: { u1: targetId, u2: myId } } })
  const isMatch = !!theyLikeMe

  // Create notification
  const me = await prisma.user.findUnique({ where: { id: myId }, select: { name: true } })
  await prisma.userNotification.create({
    data: {
      uid: targetId, type: superlike ? 'superlike' : 'like', fromId: myId,
      message: superlike ? `${me?.name} super liked you! ⭐` : `${me?.name} liked your profile! ❤️`,
      time: now, link: `/profile/${myId}`,
    },
  }).catch(() => {})

  if (isMatch) {
    await prisma.userNotification.create({
      data: {
        uid: targetId, type: 'match', fromId: myId,
        message: `You matched with ${me?.name}! 💝`,
        time: now, link: `/chat/${myId}`,
      },
    }).catch(() => {})
    await prisma.userNotification.create({
      data: {
        uid: myId, type: 'match', fromId: targetId,
        message: `You matched! Start chatting now 💝`,
        time: now, link: `/chat/${targetId}`,
      },
    }).catch(() => {})
  }

  // Socket notification
  if (global._io) {
    global._io.to(`user:${targetId}`).emit('notification:new', { type: 'like', fromId: myId })
  }

  return NextResponse.json({ liked: true, match: isMatch })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)

  const likes = await prisma.userLike.findMany({
    where: { u2: myId },
    include: { sender: { select: { id: true, name: true, photo: true, photoThumb: true, age: true, city: true, country: true, verified: true, premium: true } } },
    orderBy: { time: 'desc' },
    take: 50,
  })

  return NextResponse.json(likes)
}
