import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)

  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'PayPal not configured yet.' }, { status: 400 })

  const { packageId, type } = await req.json()
  const siteUrl = process.env.NEXTAUTH_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`

  let pkg: any = null, amount = 0, credits = 0
  if (type === 'credits') {
    pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } }).catch(() => ({ credits: 100, price: 4.99, id: packageId }))
    amount = pkg?.price || 4.99
    credits = pkg?.credits || 100
  } else {
    pkg = await prisma.premiumPackage.findUnique({ where: { id: packageId } }).catch(() => ({ price: 9.99, days: 30, id: packageId }))
    amount = pkg?.price || 9.99
  }

  try {
    // Get PayPal access token
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
      body: 'grant_type=client_credentials',
    })
    const { access_token } = await tokenRes.json()

    const order = await prisma.order.create({
      data: { uid: myId, amount, currency: 'USD', gateway: 'paypal', status: 'pending', type, package: String(packageId), credits, time: Math.floor(Date.now() / 1000) },
    })

    const orderRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: 'USD', value: amount.toFixed(2) } }],
        application_context: {
          return_url: `${siteUrl}/api/payments/paypal/success?order_id=${order.id}`,
          cancel_url: `${siteUrl}/credits`,
        },
      }),
    })
    const orderData = await orderRes.json()
    const approvalUrl = orderData.links?.find((l: any) => l.rel === 'approve')?.href

    await prisma.order.update({ where: { id: order.id }, data: { gatewayId: orderData.id } })

    return NextResponse.json({ approvalUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
