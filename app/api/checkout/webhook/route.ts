import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { handleStripeEvent } from '@/lib/stripe-webhook-handler'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Dedup on event.id. If we've already processed this event, short-circuit.
  const { data: existing } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('processed, attempts')
    .eq('id', event.id)
    .maybeSingle()

  if (existing?.processed) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  if (existing) {
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ attempts: (existing.attempts ?? 0) + 1, last_error: null })
      .eq('id', event.id)
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({
        id: event.id,
        type: event.type,
        payload: event as unknown as Record<string, unknown>,
        attempts: 1,
      })
    // Race: another worker inserted between our SELECT and INSERT — treat as already in flight.
    // Returning 200 here means Stripe won't retry; the other worker is on it.
    if (insertError && insertError.code === '23505') {
      return NextResponse.json({ received: true, raced: true })
    }
  }

  try {
    await handleStripeEvent(event)
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString(), last_error: null })
      .eq('id', event.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Webhook handler error:', msg, 'event:', event.id)
    await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ last_error: msg.slice(0, 2000) })
      .eq('id', event.id)
    // Return 500 so Stripe retries with exponential backoff (~3 days)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
