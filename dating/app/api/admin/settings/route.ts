import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const config = await prisma.config.findFirst()
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const {
    name, title, description, keywords, email, currency, mainColor,
    freeCredits, photoReview, emailVerification, terms, privacy,
    stripePublic, stripeSecret, paypalClientId, paypalClientSecret,
    googleKey, googleSecret, fbAppId, fbAppSecret,
    fAI, fEngage, fEngageTime, fEngageLimit,
  } = body

  const existing = await prisma.config.findFirst()
  const siteName = existing?.name || 'Rich Dating Network'

  const data: any = {
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(keywords !== undefined && { keywords }),
    ...(email !== undefined && { email }),
    ...(currency !== undefined && { currency }),
    ...(mainColor !== undefined && { mainColor }),
    ...(freeCredits !== undefined && { freeCredits: parseInt(freeCredits) }),
    ...(photoReview !== undefined && { photoReview: parseInt(photoReview) }),
    ...(emailVerification !== undefined && { emailVerification: parseInt(emailVerification) }),
    ...(terms !== undefined && { terms }),
    ...(privacy !== undefined && { privacy }),
    ...(googleKey !== undefined && googleKey && { googleKey }),
    ...(googleSecret !== undefined && googleSecret && { googleSecret }),
    ...(fbAppId !== undefined && fbAppId && { fbAppId }),
    ...(fbAppSecret !== undefined && fbAppSecret && { fbAppSecret }),
    ...(fAI !== undefined && { fAI }),
    ...(fEngage !== undefined && { fEngage }),
    ...(fEngageTime !== undefined && { fEngageTime: parseInt(fEngageTime) }),
    ...(fEngageLimit !== undefined && { fEngageLimit: parseInt(fEngageLimit) }),
  }

  // Update env vars for payment keys (write to .env.local)
  const envUpdates: string[] = []
  if (stripePublic) envUpdates.push(`STRIPE_PUBLISHABLE_KEY=${stripePublic}`)
  if (stripeSecret) envUpdates.push(`STRIPE_SECRET_KEY=${stripeSecret}`)
  if (paypalClientId) envUpdates.push(`PAYPAL_CLIENT_ID=${paypalClientId}`)
  if (paypalClientSecret) envUpdates.push(`PAYPAL_CLIENT_SECRET=${paypalClientSecret}`)

  if (envUpdates.length > 0) {
    const { writeFile, readFile } = await import('fs/promises')
    const envPath = `${process.cwd()}/.env.local`
    let envContent = ''
    try { envContent = await readFile(envPath, 'utf-8') } catch {}
    for (const update of envUpdates) {
      const [key] = update.split('=')
      const lines = envContent.split('\n').filter(l => !l.startsWith(`${key}=`))
      lines.push(update)
      envContent = lines.join('\n')
    }
    await writeFile(envPath, envContent).catch(() => {})
  }

  await prisma.config.upsert({
    where: { name: siteName },
    create: { name: name || siteName, title: title || '', description: description || '', keywords: keywords || '', lang: '1', videocall: '', ...data },
    update: data,
  })

  return NextResponse.json({ success: true })
}
