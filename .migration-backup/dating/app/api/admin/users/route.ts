import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || 'all'
  const perPage = 20
  const where: any = {}
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }]
  if (type === 'fake') where.fake = 1
  if (type === 'real') where.fake = 0
  if (type === 'premium') where.premium = 1
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { id: 'desc' }, take: perPage, skip: (page - 1) * perPage }),
    prisma.user.count({ where }),
  ])
  return NextResponse.json({ users, total, page, perPage })
}
