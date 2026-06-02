import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

function verifyWebhook(body: string, signature: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET!
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return hash === signature
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-signature') ?? ''

    if (!verifyWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(body)

    if (payload.type === 'payment' && payload.action === 'payment.updated') {
      const paymentId = payload.data.id

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
          },
        }
      )
      const payment = await response.json()

      if (payment.status === 'approved') {
        const orderId = payment.external_reference
        await db.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paymentId: String(paymentId),
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
