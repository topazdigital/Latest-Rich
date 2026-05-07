import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ResultCode, CheckoutRequestID, external_reference } = body

    // Find order by external reference or checkout request ID
    let order = null
    if (external_reference) {
      const orderId = parseInt(external_reference.replace('RDN-', ''))
      order = await prisma.order.findUnique({ where: { id: orderId } })
    }
    if (!order && CheckoutRequestID) {
      order = await prisma.order.findFirst({ where: { gatewayId: CheckoutRequestID } })
    }

    if (order && ResultCode === 0) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'completed' } })

      if (order.type === 'credits') {
        await prisma.user.update({ where: { id: order.uid }, data: { credits: { increment: order.credits } } })
        await prisma.userCredit.create({ data: { uid: order.uid, amount: order.credits, type: 'purchase', note: 'M-Pesa', time: Math.floor(Date.now() / 1000) } })
      } else if (order.type === 'premium') {
        const pkg = await prisma.premiumPackage.findUnique({ where: { id: parseInt(order.package) } }).catch(() => null)
        const expire = Math.floor(Date.now() / 1000) + (pkg?.days || 30) * 86400
        await prisma.user.update({ where: { id: order.uid }, data: { premium: 1 } })
        await prisma.userPremium.create({ data: { uid: order.uid, expire, type: pkg?.name || 'monthly' } })
      }

      // Notify user
      await prisma.userNotification.create({
        data: { uid: order.uid, type: 'premium', fromId: 0, message: `Payment successful! Your ${order.type} has been activated.`, time: Math.floor(Date.now() / 1000) },
      }).catch(() => {})

      if (global._io) {
        global._io.to(`user:${order.uid}`).emit('notification:new', { type: 'payment_success' })
      }
    } else if (order && ResultCode !== 0) {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PayHero callback error:', error)
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 })
  }
}
