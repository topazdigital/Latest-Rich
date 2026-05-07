import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { toUserId, giftId } = await req.json()
  const now = Math.floor(Date.now() / 1000)

  const [gift, me] = await Promise.all([
    prisma.gift.findUnique({ where: { id: giftId } }).catch(() => null),
    prisma.user.findUnique({ where: { id: myId }, select: { credits: true, name: true } }),
  ])

  if (!gift) return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (me.credits < gift.price) return NextResponse.json({ error: `Not enough credits. Need ${gift.price} credits.` }, { status: 400 })

  // Deduct credits
  await prisma.user.update({ where: { id: myId }, data: { credits: { decrement: gift.price } } })
  await prisma.userCredit.create({ data: { uid: myId, amount: -gift.price, type: 'gift_sent', note: `Gift: ${gift.name}`, time: now } })

  // Create gift record
  await prisma.userGift.create({ data: { fromId: myId, toId: toUserId, giftId, time: now } })

  // Notify recipient
  await prisma.userNotification.create({
    data: { uid: toUserId, type: 'gift', fromId: myId, message: `${me.name} sent you a ${gift.name} 🎁`, time: now, link: `/profile/${myId}` },
  }).catch(() => {})

  if (global._io) {
    global._io.to(`user:${toUserId}`).emit('notification:new', { type: 'gift', from: me.name })
  }

  return NextResponse.json({ success: true })
}
