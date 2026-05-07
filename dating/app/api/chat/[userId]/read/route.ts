import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const fromId = parseInt(params.userId)
  await prisma.chat.updateMany({ where: { u1: fromId, u2: myId, read: 0 }, data: { read: 1 } })
  return NextResponse.json({ success: true })
}
