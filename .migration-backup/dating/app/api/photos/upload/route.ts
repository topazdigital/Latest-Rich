import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)

  try {
    const formData = await req.formData()
    const file = formData.get('photo') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `${myId}_${uuidv4()}`
    const uploadsDir = path.join(process.cwd(), '..', 'assets', 'sources', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Save original
    const ext = '.jpg'
    const photoPath = `${filename}${ext}`
    const thumbPath = `${filename}_thumb${ext}`

    await sharp(buffer).resize(800, 1000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(path.join(uploadsDir, photoPath))
    await sharp(buffer).resize(300, 400, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(path.join(uploadsDir, thumbPath))

    const now = Math.floor(Date.now() / 1000)
    const existingPhotos = await prisma.userPhoto.count({ where: { uid: myId } })
    const isPrimary = existingPhotos === 0 ? 1 : 0

    const photo = await prisma.userPhoto.create({
      data: { uid: myId, photo: photoPath, thumb: thumbPath, approved: 1, time: now, isPrimary },
    })

    // Update user photo if primary
    if (isPrimary) {
      await prisma.user.update({ where: { id: myId }, data: { photo: photoPath, photoThumb: thumbPath } })
    }

    return NextResponse.json({ success: true, photo })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
