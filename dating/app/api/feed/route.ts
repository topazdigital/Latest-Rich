import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const take = 20
  const skip = (page - 1) * take
  const posts = await prisma.feed.findMany({
    include: {
      user: { select: { id: true, name: true, photo: true, photoThumb: true, verified: true } },
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { time: 'desc' },
    take, skip,
  })
  return NextResponse.json(posts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { content, photo } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  const now = Math.floor(Date.now() / 1000)
  const me = await prisma.user.findUnique({ where: { id: myId }, select: { id: true, name: true, photo: true, photoThumb: true, verified: true } })
  const post = await prisma.feed.create({
    data: { uid: myId, content: content.trim(), photo: photo || '', time: now },
  })
  return NextResponse.json({ post: { ...post, user: me, _count: { comments: 0, likes: 0 } } })
}
