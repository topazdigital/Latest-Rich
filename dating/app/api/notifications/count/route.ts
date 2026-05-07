import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ unread: 0, chatUnread: 0 })
  const myId = parseInt((session.user as any).id)
  const [unread, chatUnread] = await Promise.all([
    prisma.userNotification.count({ where: { uid: myId, read: 0 } }).catch(() => 0),
    prisma.chat.count({ where: { u2: myId, read: 0 } }).catch(() => 0),
  ])
  return NextResponse.json({ unread, chatUnread })
}
