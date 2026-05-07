import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = parseInt((session.user as any).id)
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { userExtended: true } })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = parseInt((session.user as any).id)
  const body = await req.json()

  const { name, bio, city, country, birthday, looking, occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship } = body

  let age = undefined
  if (birthday) {
    const b = new Date(birthday)
    age = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(bio !== undefined && { bio }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(birthday !== undefined && { birthday }),
      ...(age && { age }),
      ...(looking !== undefined && { looking: parseInt(looking) }),
    },
  })

  // Update extended profile
  await prisma.userExtended.upsert({
    where: { userId },
    create: { userId, occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship },
    update: { occupation, education, height, bodyType, ethnicity, religion, smoking, drinking, children, relationship },
  })

  return NextResponse.json({ success: true })
}
