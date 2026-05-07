import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const photoId = parseInt(params.id)
  const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } })
  if (!photo || photo.uid !== myId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.userPhoto.updateMany({ where: { uid: myId }, data: { isPrimary: 0 } })
  await prisma.userPhoto.update({ where: { id: photoId }, data: { isPrimary: 1 } })
  await prisma.user.update({ where: { id: myId }, data: { photo: photo.photo, photoThumb: photo.thumb } })
  return NextResponse.json({ success: true })
}
