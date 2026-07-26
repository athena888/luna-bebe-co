import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { verifyGiftNoteToken } from '@/lib/gift-note'
import { supabaseAdmin } from '@/lib/supabase'
import { resend } from '@/lib/resend'
import { CONTACT_EMAIL } from '@/lib/site-config'

// One-tap thank-you from the gift recipient back to the buyer. Token-gated
// (only someone holding the note link can send), one per order.
export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'gift_thanks', 5, 3600)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { token } = await req.json() as { token?: string }
    const orderId = token ? verifyGiftNoteToken(token) : null
    if (!orderId) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })

    const { data: order } = await supabaseAdmin
      .from('orders').select('customer_name, customer_email, recipient_name').eq('id', orderId).maybeSingle()
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await resend.emails.send({
      from: `Petite Lavande <${CONTACT_EMAIL}>`,
      to: order.customer_email,
      subject: `${order.recipient_name || 'Your gift recipient'} says thank you 💛`,
      text: [
        `Hi ${order.customer_name},`,
        '',
        `${order.recipient_name || 'The recipient'} received your Petite Lavande box and tapped the thank-you button on their gift note — they wanted you to know it landed and it meant something.`,
        '',
        '— Petite Lavande',
      ].join('\n'),
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('gift thanks error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
