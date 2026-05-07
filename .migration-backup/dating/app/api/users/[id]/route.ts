import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getPhotoUrl } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: parseInt(params.id) },
    include: { userExtended: true, photos: { where: { approved: 1 }, orderBy: { isPrimary: 'desc' } } },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}
