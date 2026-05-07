import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, subject, body } = await req.json()
  if (!subject || !body) return NextResponse.json({ error: 'Subject and body required' }, { status: 400 })

  const where: any = {}
  if (to === 'real') where.fake = 0
  if (to === 'premium') where.premium = 1

  const users = await prisma.user.findMany({
    where,
    select: { email: true, name: true },
    take: 500,
  })

  const now = Math.floor(Date.now() / 1000)

  // Queue emails in DB for async processing
  for (const user of users) {
    const personalizedBody = body.replace(/\{name\}/g, user.name)
    await prisma.emailQueue.create({
      data: { toEmail: user.email, subject, body: personalizedBody, time: now },
    }).catch(() => {})
  }

  // Send to first 10 immediately
  const immediate = users.slice(0, 10)
  for (const user of immediate) {
    const personalizedBody = body.replace(/\{name\}/g, user.name)
    await sendEmail({ to: user.email, subject, html: personalizedBody }).catch(() => {})
  }

  return NextResponse.json({ success: true, count: users.length })
}
