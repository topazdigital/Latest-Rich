import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  const orderId = parseInt(searchParams.get('order_id') || '0')

  if (!sessionId || !orderId) return NextResponse.redirect(new URL('/credits', req.url))

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.redirect(new URL('/credits?error=not_configured', req.url))

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.payment_status === 'paid') {
      const order = await prisma.order.findUnique({ where: { id: orderId } })
      if (order && order.status === 'pending') {
        await prisma.order.update({ where: { id: orderId }, data: { status: 'completed', gatewayId: sessionId } })

        if (order.type === 'credits') {
          await prisma.user.update({ where: { id: order.uid }, data: { credits: { increment: order.credits } } })
          await prisma.userCredit.create({
            data: { uid: order.uid, amount: order.credits, type: 'purchase', note: `Stripe purchase`, time: Math.floor(Date.now() / 1000) },
          })
        } else if (order.type === 'premium') {
          const pkg = await prisma.premiumPackage.findUnique({ where: { id: parseInt(order.package) } }).catch(() => null)
          const days = pkg?.days || 30
          const expire = Math.floor(Date.now() / 1000) + days * 86400
          await prisma.user.update({ where: { id: order.uid }, data: { premium: 1 } })
          await prisma.userPremium.create({ data: { uid: order.uid, expire, type: pkg?.name || 'monthly' } })
        }
      }
      return NextResponse.redirect(new URL('/credits?success=1', req.url))
    }
  } catch (error) {
    console.error('Stripe success error:', error)
  }

  return NextResponse.redirect(new URL('/credits?error=1', req.url))
}
