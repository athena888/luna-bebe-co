import { supabaseAdmin } from './supabase'
import { isOptedOut } from './unsubscribe'
import {
  sendWelcomeSeries2Email,
  sendWelcomeSeries3Email,
  sendWinBackEmail,
  sendReviewRequestEmail,
} from './resend'

// Customer email flows on top of the `email_events` table (§31). Triggers
// insert scheduled rows; the daily cron (/api/cron/daily-flows) sends the due
// ones. Every send re-checks the opt-out list.

const DAY = 24 * 60 * 60 * 1000

/** Newsletter signup → welcome steps 2 (D+2) and 3 (D+4). Step 1 is the
 *  immediate welcome email the subscribe route already sends. */
export async function scheduleWelcomeSeries(email: string): Promise<void> {
  const recipient = email.trim().toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_events').select('id').eq('recipient', recipient).eq('flow', 'welcome').limit(1)
  if (existing?.length) return
  await supabaseAdmin.from('email_events').insert([
    { flow: 'welcome', step: 2, recipient, template: 'welcome-2', scheduled_at: new Date(Date.now() + 2 * DAY).toISOString() },
    { flow: 'welcome', step: 3, recipient, template: 'welcome-3', scheduled_at: new Date(Date.now() + 4 * DAY).toISOString() },
  ])
}

/** Order shipped → review ask ~10 days later (standard transit 5–7 days, then
 *  a few days to live with the box). One per order. */
export async function schedulePostPurchaseReview(orderId: string, email: string): Promise<void> {
  const recipient = email.trim().toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_events').select('id').eq('order_id', orderId).eq('flow', 'postpurchase').limit(1)
  if (existing?.length) return
  await supabaseAdmin.from('email_events').insert({
    flow: 'postpurchase', step: 1, recipient, order_id: orderId,
    template: 'postpurchase-review', scheduled_at: new Date(Date.now() + 10 * DAY).toISOString(),
  })
}

/** Enroll customers whose last paid order is 75+ days old (one email, ever).
 *  Returns how many were newly enrolled. */
export async function scheduleWinBacks(): Promise<number> {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('customer_email, created_at, status')
    .neq('status', 'pending')

  const lastOrder = new Map<string, string>()
  for (const o of orders ?? []) {
    const email = o.customer_email?.trim().toLowerCase()
    if (!email) continue
    const prev = lastOrder.get(email)
    if (!prev || o.created_at > prev) lastOrder.set(email, o.created_at)
  }

  const cutoff = new Date(Date.now() - 75 * DAY).toISOString()
  const candidates = [...lastOrder.entries()].filter(([, at]) => at < cutoff).map(([email]) => email)
  if (candidates.length === 0) return 0

  const { data: prior } = await supabaseAdmin.from('email_events').select('recipient').eq('flow', 'winback')
  const enrolled = new Set((prior ?? []).map(r => r.recipient))

  const rows = candidates
    .filter(email => !enrolled.has(email))
    .map(email => ({
      flow: 'winback', step: 1, recipient: email,
      template: 'winback', scheduled_at: new Date().toISOString(),
    }))
  if (rows.length === 0) return 0

  const { error } = await supabaseAdmin.from('email_events').insert(rows)
  if (error) throw error
  return rows.length
}

/** Send every due, uncanceled event. Opt-outs are canceled instead of sent. */
export async function processDueEmails(limit = 50): Promise<{ sent: number; skipped: number; errors: number }> {
  const { data: due } = await supabaseAdmin
    .from('email_events')
    .select('*')
    .is('sent_at', null)
    .is('canceled_at', null)
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit)

  let sent = 0, skipped = 0, errors = 0
  for (const ev of due ?? []) {
    if (await isOptedOut(ev.recipient)) {
      await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
      skipped++
      continue
    }
    try {
      switch (ev.template) {
        case 'welcome-2':
          await sendWelcomeSeries2Email({ customerEmail: ev.recipient })
          break
        case 'welcome-3':
          await sendWelcomeSeries3Email({ customerEmail: ev.recipient })
          break
        case 'winback':
          await sendWinBackEmail({ customerEmail: ev.recipient })
          break
        case 'postpurchase-review': {
          const { data: order } = await supabaseAdmin
            .from('orders').select('customer_name, selected_items').eq('id', ev.order_id).maybeSingle()
          const items = ((order?.selected_items ?? []) as Array<{ id: string; name: string }>).filter(i => i?.id)
          await sendReviewRequestEmail({
            customerName: order?.customer_name || 'there',
            customerEmail: ev.recipient,
            orderId: ev.order_id ?? '',
            selectedItems: items,
          })
          break
        }
        default:
          // Unknown template — cancel so it doesn't retry forever.
          await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
          skipped++
          continue
      }
      await supabaseAdmin.from('email_events').update({ sent_at: new Date().toISOString() }).eq('id', ev.id)
      sent++
    } catch (e) {
      console.error(`email_events send failed (${ev.template} → ${ev.recipient}):`, e)
      errors++
    }
  }
  return { sent, skipped, errors }
}
