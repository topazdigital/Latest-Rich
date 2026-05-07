import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)

  const basicToken = process.env.PAYHERO_BASIC_TOKEN
  const accountId = process.env.PAYHERO_ACCOUNT_ID
  if (!basicToken || !accountId) return NextResponse.json({ error: 'M-Pesa/PayHero not configured' }, { status: 400 })

  const { packageId, type, phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

  let pkg: any = null, amount = 0, credits = 0
  if (type === 'credits') {
    pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } }).catch(() => ({ credits: 100, price: 4.99 }))
    amount = Math.round((pkg?.price || 4.99) * 130) // Convert USD to KES approx
    credits = pkg?.credits || 100
  } else {
    pkg = await prisma.premiumPackage.findUnique({ where: { id: packageId } }).catch(() => ({ price: 9.99 }))
    amount = Math.round((pkg?.price || 9.99) * 130)
  }

  try {
    const siteUrl = process.env.NEXTAUTH_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`
    const order = await prisma.order.create({
      data: { uid: myId, amount, currency: 'KES', gateway: 'mpesa', status: 'pending', type, package: String(packageId), credits, time: Math.floor(Date.now() / 1000), phone },
    })

    const res = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: basicToken },
      body: JSON.stringify({
        amount,
        phone_number: phone.replace(/^\+/, ''),
        channel_id: parseInt(accountId),
        provider: 'm-pesa',
        external_reference: `RDN-${order.id}`,
        callback_url: `${siteUrl}/api/payments/payhero/callback`,
      }),
    })
    const data = await res.json()

    if (data.success || data.CheckoutRequestID) {
      await prisma.order.update({ where: { id: order.id }, data: { gatewayId: data.CheckoutRequestID || data.reference || '' } })
      return NextResponse.json({ success: true, message: 'STK push sent to your phone!' })
    } else {
      return NextResponse.json({ error: data.message || 'M-Pesa request failed' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('PayHero error:', error)
    return NextResponse.json({ error: 'M-Pesa payment failed' }, { status: 500 })
  }
}
