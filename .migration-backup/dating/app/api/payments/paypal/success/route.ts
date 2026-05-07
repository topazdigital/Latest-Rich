import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = parseInt(searchParams.get('order_id') || '0')
  const token = searchParams.get('token')
  if (!orderId || !token) return NextResponse.redirect(new URL('/credits', req.url))

  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) return NextResponse.redirect(new URL('/credits?error=not_configured', req.url))

  try {
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` },
      body: 'grant_type=client_credentials',
    })
    const { access_token } = await tokenRes.json()

    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
    })
    const captureData = await captureRes.json()

    if (captureData.status === 'COMPLETED') {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (order && order.status === 'pending') {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'completed' } })
        if (order.type === 'credits') {
          await prisma.user.update({ where: { id: order.uid }, data: { credits: { increment: order.credits } } })
          await prisma.userCredit.create({ data: { uid: order.uid, amount: order.credits, type: 'purchase', note: 'PayPal', time: Math.floor(Date.now() / 1000) } })
        } else if (order.type === 'premium') {
          const pkg = await prisma.premiumPackage.findUnique({ where: { id: parseInt(order.package) } }).catch(() => null)
          const expire = Math.floor(Date.now() / 1000) + (pkg?.days || 30) * 86400
          await prisma.user.update({ where: { id: order.uid }, data: { premium: 1 } })
          await prisma.userPremium.create({ data: { uid: order.uid, expire, type: pkg?.name || 'monthly' } })
        }
      }
      return NextResponse.redirect(new URL('/credits?success=1', req.url))
    }
  } catch (error) { console.error('PayPal error:', error) }

  return NextResponse.redirect(new URL('/credits?error=1', req.url))
}
