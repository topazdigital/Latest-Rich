import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const gender = searchParams.get('gender')
  const country = searchParams.get('country')
  const minAge = parseInt(searchParams.get('minAge') || '18')
  const maxAge = parseInt(searchParams.get('maxAge') || '99')
  const page = parseInt(searchParams.get('page') || '1')

  const where: any = {
    id: { not: myId },
    blocked: 0,
    suspend: 0,
    age: { gte: minAge, lte: maxAge },
  }
  if (q) where.OR = [{ name: { contains: q } }, { city: { contains: q } }, { username: { contains: q } }]
  if (gender && gender !== '0') where.gender = parseInt(gender)
  if (country) where.country = country

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, age: true, city: true, country: true, photo: true, photoThumb: true, verified: true, premium: true, gender: true, lastAccess: true },
    orderBy: [{ premium: 'desc' }, { lastAccess: 'desc' }],
    take: 30,
    skip: (page - 1) * 30,
  })
  return NextResponse.json(users)
}
