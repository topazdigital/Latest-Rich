import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, type, message, link } = await req.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const where: any = {}
  if (to === 'real') where.fake = 0
  if (to === 'premium') where.premium = 1

  const users = await prisma.user.findMany({ where, select: { id: true }, take: 1000 })
  const now = Math.floor(Date.now() / 1000)

  for (const user of users) {
    await prisma.userNotification.create({
      data: { uid: user.id, type: type || 'info', fromId: 0, message, time: now, link: link || '' },
    }).catch(() => {})
    if (global._io) {
      global._io.to(`user:${user.id}`).emit('notification:new', { type, message })
    }
  }

  return NextResponse.json({ success: true, count: users.length })
}
