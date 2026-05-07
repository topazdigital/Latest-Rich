import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const feedId = parseInt(params.id)
  const now = Math.floor(Date.now() / 1000)
  const existing = await prisma.feedLike.findUnique({ where: { feedId_uid: { feedId, uid: myId } } })
  if (existing) {
    await prisma.feedLike.delete({ where: { feedId_uid: { feedId, uid: myId } } })
    return NextResponse.json({ liked: false })
  }
  await prisma.feedLike.create({ data: { feedId, uid: myId, time: now } })
  return NextResponse.json({ liked: true })
}
