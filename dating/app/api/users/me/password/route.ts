import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = parseInt((session.user as any).id)
  const { current, newPass } = await req.json()

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Verify current password
  let valid = false
  if (user.password) valid = await bcrypt.compare(current, user.password)
  if (!valid && user.pass) valid = current === user.pass
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  const hashed = await bcrypt.hash(newPass, 12)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed, pass: hashed } })

  return NextResponse.json({ success: true })
}
