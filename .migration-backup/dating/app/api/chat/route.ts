import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail, newMessageTemplate } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { toUserId, message } = await req.json()

  if (!message?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })

  // Check if user has enough credits or is premium
  const me = await prisma.user.findUnique({ where: { id: myId }, select: { credits: true, premium: true } })
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const config = await prisma.config.findFirst().catch(() => null)
  const msgCost = 0 // Free messaging by default — adjust as needed

  const now = Math.floor(Date.now() / 1000)

  // Save message
  const msg = await prisma.chat.create({
    data: { u1: myId, u2: toUserId, message: message.trim(), time: now, read: 0, from: myId },
  })

  // Update/create conversation
  await prisma.userChat.upsert({
    where: { u1_u2: { u1: Math.min(myId, toUserId), u2: Math.max(myId, toUserId) } },
    create: { u1: Math.min(myId, toUserId), u2: Math.max(myId, toUserId), lastMessage: now },
    update: { lastMessage: now },
  })

  // Create notification
  const sender = await prisma.user.findUnique({ where: { id: myId }, select: { name: true } })
  await prisma.userNotification.create({
    data: {
      uid: toUserId, type: 'message', fromId: myId,
      message: `${sender?.name} sent you a message: "${message.substring(0, 50)}"`,
      time: now, link: `/chat/${myId}`,
    },
  }).catch(() => {})

  // Socket.io
  if (global._io) {
    global._io.to(`user:${toUserId}`).emit('chat:message', msg)
    global._io.to(`user:${toUserId}`).emit('notification:new', { type: 'message' })
  }

  // Email notification (if recipient is offline)
  const recipient = await prisma.user.findUnique({ where: { id: toUserId }, select: { email: true, name: true, lastAccess: true } })
  if (recipient && Date.now()/1000 - parseInt(recipient.lastAccess) > 300) {
    const siteUrl = process.env.NEXTAUTH_URL || ''
    await sendEmail({
      to: recipient.email,
      subject: `New message from ${sender?.name}`,
      html: newMessageTemplate(sender?.name || '', message.substring(0, 100), `${siteUrl}/chat/${myId}`),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, message: msg })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { searchParams } = new URL(req.url)
  const withId = parseInt(searchParams.get('with') || '0')

  const messages = await prisma.chat.findMany({
    where: { OR: [{ u1: myId, u2: withId }, { u1: withId, u2: myId }] },
    orderBy: { time: 'asc' },
    take: 100,
  })

  return NextResponse.json(messages)
}
