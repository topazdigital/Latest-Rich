import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)
  const { reportedId, reason, details } = await req.json()
  const now = Math.floor(Date.now() / 1000)
  await prisma.report.create({ data: { reporterId: myId, reportedId, reason, details: details || '', time: now } })
  return NextResponse.json({ success: true })
}
