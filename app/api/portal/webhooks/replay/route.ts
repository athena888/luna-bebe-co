import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleStripeEvent } from '@/lib/stripe-webhook-handler'
import type Stripe from 'stripe'

function authorized(req: NextRequest) {
  const session = req.cookies.get('portal_session')?.value
  return session && session === process.env.PORTAL_TOKEN
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { eventId } = await req.json()
    if (!eventId) return NextResponse.json({ error: 'eventId required' }, { status: 400 })

    const { data: row } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('id, payload, processed, attempts')
      .eq('id', eventId)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (row.processed) return NextResponse.json({ error: 'Already processed' }, { status: 400 })

    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ attempts: (row.attempts ?? 0) + 1, last_error: null })
      .eq('id', eventId)

    try {
      await handleStripeEvent(row.payload as unknown as Stripe.Event)
      await supabaseAdmin
        .from('stripe_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString(), last_error: null })
        .eq('id', eventId)
      return NextResponse.json({ ok: true })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      await supabaseAdmin
        .from('stripe_webhook_events')
        .update({ last_error: msg.slice(0, 2000) })
        .eq('id', eventId)
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  } catch (err) {
    console.error('Replay error:', err)
    return NextResponse.json({ error: 'Replay failed' }, { status: 500 })
  }
}
