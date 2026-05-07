import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const myId = parseInt((session.user as any).id)

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'Stripe not configured yet. Add your API key in admin settings.' }, { status: 400 })

  const { packageId, type } = await req.json()
  const siteUrl = process.env.NEXTAUTH_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`

  let pkg: any = null
  let name = '', amount = 0, credits = 0

  if (type === 'credits') {
    pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } }).catch(() => null)
    if (!pkg) pkg = { credits: 100, price: 4.99, id: packageId }
    name = `${pkg.credits} Credits`
    amount = Math.round(pkg.price * 100)
    credits = pkg.credits
  } else {
    pkg = await prisma.premiumPackage.findUnique({ where: { id: packageId } }).catch(() => null)
    if (!pkg) pkg = { name: '1 Month', price: 9.99, days: 30, id: packageId }
    name = `Premium — ${pkg.name}`
    amount = Math.round(pkg.price * 100)
  }

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

    // Create order
    const order = await prisma.order.create({
      data: {
        uid: myId, amount: pkg.price, currency: 'USD',
        gateway: 'stripe', status: 'pending',
        type, package: String(packageId), credits,
        time: Math.floor(Date.now() / 1000),
      },
    })

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name }, unit_amount: amount }, quantity: 1 }],
      mode: 'payment',
      success_url: `${siteUrl}/api/payments/stripe/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${siteUrl}/credits`,
      metadata: { userId: String(myId), orderId: String(order.id), type, credits: String(credits), packageId: String(packageId) },
    })

    await prisma.order.update({ where: { id: order.id }, data: { gatewayId: checkoutSession.id } })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Stripe error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
