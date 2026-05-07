import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const stories = await prisma.userStory.findMany({
    include: { user: { select: { id: true, name: true, photo: true, photoThumb: true } } },
    orderBy: { time: 'desc' },
    take: 50,
    distinct: ['uid'],
  })
  return NextResponse.json(stories)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const formData = await req.formData()
  const file = formData.get('photo') as File
  if (!file) return NextResponse.json({ error: 'Photo required' }, { status: 400 })
  // Upload handling similar to photos
  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')
  const { v4: uuidv4 } = await import('uuid')
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filename = `story_${myId}_${uuidv4()}.jpg`
  const uploadsDir = path.join(process.cwd(), '..', 'assets', 'sources', 'uploads')
  await mkdir(uploadsDir, { recursive: true })
  const sharp = (await import('sharp')).default
  await sharp(buffer).resize(720, 1280, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(path.join(uploadsDir, filename))
  const now = Math.floor(Date.now() / 1000)
  const story = await prisma.userStory.create({ data: { uid: myId, photo: filename, thumb: filename, time: now } })
  return NextResponse.json(story)
}
