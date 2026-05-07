import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function isAdmin(session: any) {
  return (session?.user as any)?.role === 'admin'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !await isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { id: parseInt(params.id) }, include: { userExtended: true, photos: true, orders: { take: 10, orderBy: { time: 'desc' } } } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !await isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = parseInt(params.id)
  const body = await req.json()
  const { action, ...data } = body

  if (action === 'block') {
    await prisma.user.update({ where: { id: userId }, data: { blocked: 1 } })
    return NextResponse.json({ success: true })
  }
  if (action === 'unblock') {
    await prisma.user.update({ where: { id: userId }, data: { blocked: 0 } })
    return NextResponse.json({ success: true })
  }
  if (action === 'suspend') {
    await prisma.user.update({ where: { id: userId }, data: { suspend: 1 } })
    return NextResponse.json({ success: true })
  }
  if (action === 'unsuspend') {
    await prisma.user.update({ where: { id: userId }, data: { suspend: 0 } })
    return NextResponse.json({ success: true })
  }
  if (action === 'verify') {
    await prisma.user.update({ where: { id: userId }, data: { verified: 1 } })
    return NextResponse.json({ success: true })
  }
  if (action === 'premium') {
    const days = data.days || 30
    const expire = Math.floor(Date.now() / 1000) + days * 86400
    await prisma.user.update({ where: { id: userId }, data: { premium: 1 } })
    await prisma.userPremium.create({ data: { uid: userId, expire, type: 'admin_grant' } })
    return NextResponse.json({ success: true })
  }
  if (action === 'add_credits') {
    const amount = data.amount || 0
    await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } })
    await prisma.userCredit.create({ data: { uid: userId, amount, type: 'admin_grant', note: 'Admin grant', time: Math.floor(Date.now() / 1000) } })
    return NextResponse.json({ success: true })
  }

  // Generic update
  const { name, email, age, city, country, credits, premium, verified, fake, admin: isAdmin2 } = data
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(age && { age: parseInt(age) }),
      ...(city !== undefined && { city }),
      ...(country !== undefined && { country }),
      ...(credits !== undefined && { credits: parseInt(credits) }),
      ...(premium !== undefined && { premium: parseInt(premium) }),
      ...(verified !== undefined && { verified: parseInt(verified) }),
      ...(fake !== undefined && { fake: parseInt(fake) }),
      ...(isAdmin2 !== undefined && { admin: parseInt(isAdmin2) }),
    },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !await isAdmin(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = parseInt(params.id)
  await prisma.user.delete({ where: { id: userId } }).catch(() => {})
  return NextResponse.json({ success: true })
}
