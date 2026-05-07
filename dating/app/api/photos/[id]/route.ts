import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const photoId = parseInt(params.id)
  const photo = await prisma.userPhoto.findUnique({ where: { id: photoId } })
  if (!photo || photo.uid !== myId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.userPhoto.delete({ where: { id: photoId } })
  const uploadsDir = path.join(process.cwd(), '..', 'assets', 'sources', 'uploads')
  try { await unlink(path.join(uploadsDir, photo.photo)) } catch {}
  try { await unlink(path.join(uploadsDir, photo.thumb)) } catch {}
  return NextResponse.json({ success: true })
}
