import { supabaseAdmin } from './supabase'
import { isOptedOut } from './unsubscribe'
import { storeCheckoutEnabled } from './store-flags'
import {
  sendWelcomeSeries2Email,
  sendWelcomeSeries3Email,
  sendWinBackEmail,
  sendReviewRequestEmail,
  sendOrderConfirmationEmail,
  sendOccasionDueEmail,
  sendOccasionBirthdayEmail,
  sendCartReminder2Email,
} from './resend'

// Customer email flows on top of the `email_events` table (§31). Triggers
// insert scheduled rows; the daily cron (/api/cron/daily-flows) sends the due
// ones. Every send re-checks the opt-out list.

const DAY = 24 * 60 * 60 * 1000

// Templates that invite a purchase. While the store checkout is paused
// (NEXT_PUBLIC_STORE_OPEN != true) these are HELD, not canceled — they stay
// queued in email_events and the first daily cron after reopening sends them.
// Review asks are not marketing and always flow.
const MARKETING_TEMPLATES = new Set(['welcome-2', 'welcome-3', 'winback', 'occasion-due', 'occasion-birthday', 'occasion-anniversary', 'cart-2', 'restock'])

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

/** Queue a retry for an order-confirmation email that failed to send inside the
 *  webhook, so a transient Resend error doesn't silently lose it. Transactional,
 *  so it always flows (never held while checkout is paused). One retry per order. */
export async function enqueueOrderConfirmationRetry(orderId: string, email: string): Promise<void> {
  const recipient = email.trim().toLowerCase()
  const { data: existing } = await supabaseAdmin
    .from('email_events').select('id').eq('order_id', orderId).eq('flow', 'transactional').limit(1)
  if (existing?.length) return
  await supabaseAdmin.from('email_events').insert({
    flow: 'transactional', step: 1, recipient, order_id: orderId,
    template: 'order-confirmation', scheduled_at: new Date().toISOString(),
  })
}

/** Enroll customers whose last paid order is 75+ days old (one email, ever).
 *  Returns how many were newly enrolled. */
export async function scheduleWinBacks(): Promise<number> {
  // Don't enroll anyone while checkout is paused — the scan runs daily, so
  // enrollment resumes by itself once the store reopens.
  if (!storeCheckoutEnabled()) return 0

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

/** Send every due, uncanceled event. Opt-outs are canceled instead of sent;
 *  marketing templates are held (left queued) while checkout is paused. */
export async function processDueEmails(limit = 50): Promise<{ sent: number; skipped: number; held: number; errors: number }> {
  const storeOpen = storeCheckoutEnabled()
  const nowIso = new Date().toISOString()

  let query = supabaseAdmin
    .from('email_events')
    .select('*')
    .is('sent_at', null)
    .is('canceled_at', null)
    .lte('scheduled_at', nowIso)
    .order('scheduled_at')
    .limit(limit)
  // Held marketing rows stay out of the batch entirely so they can't starve
  // review asks queued behind them.
  if (!storeOpen) query = query.not('template', 'in', `(${[...MARKETING_TEMPLATES].join(',')})`)
  const { data: due } = await query

  let held = 0
  if (!storeOpen) {
    const { count } = await supabaseAdmin
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .is('sent_at', null)
      .is('canceled_at', null)
      .lte('scheduled_at', nowIso)
      .in('template', [...MARKETING_TEMPLATES])
    held = count ?? 0
  }

  let sent = 0, skipped = 0, errors = 0
  for (const ev of due ?? []) {
    if (await isOptedOut(ev.recipient)) {
      await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
      skipped++
      continue
    }
    try {
      switch (ev.template) {
        case 'welcome-2': {
          const { segmentOf } = await import('./contacts')
          await sendWelcomeSeries2Email({ customerEmail: ev.recipient, segment: await segmentOf(ev.recipient) })
          break
        }
        case 'welcome-3': {
          const { welcomeCodeOf } = await import('./welcome-code')
          await sendWelcomeSeries3Email({ customerEmail: ev.recipient, code: await welcomeCodeOf(ev.recipient) })
          break
        }
        case 'winback': {
          const { segmentOf } = await import('./contacts')
          await sendWinBackEmail({ customerEmail: ev.recipient, segment: await segmentOf(ev.recipient) })
          break
        }
        case 'occasion-due':
          await sendOccasionDueEmail({ customerEmail: ev.recipient })
          break
        case 'occasion-birthday':
          await sendOccasionBirthdayEmail({ customerEmail: ev.recipient })
          break
        case 'occasion-anniversary': {
          const { sendAnniversaryEmail } = await import('./resend')
          await sendAnniversaryEmail({ customerEmail: ev.recipient })
          break
        }
        case 'restock': {
          // Re-check stock at send time — never announce a restock that
          // already sold out again.
          const { restockProductIdFromCampaign } = await import('./waitlist')
          const pid = restockProductIdFromCampaign(ev.campaign)
          const { getCatalogProduct, getProductStock } = await import('./products-db')
          const product = pid ? await getCatalogProduct(pid) : null
          const stock = pid ? await getProductStock(pid, false) : null
          if (!product || !product.active || (stock !== null && stock <= 0)) {
            await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
            skipped++
            continue
          }
          const { sendRestockEmail } = await import('./resend')
          await sendRestockEmail({ customerEmail: ev.recipient, productName: product.name, productId: product.id })
          break
        }
        case 'cart-2': {
          // Second cart touch — only if the cart is STILL pending. Anything
          // else (paid, canceled, deleted) cancels the event silently.
          const { data: order } = await supabaseAdmin
            .from('orders').select('status').eq('id', ev.order_id).maybeSingle()
          if (order?.status !== 'pending') {
            await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
            skipped++
            continue
          }
          await sendCartReminder2Email({ customerEmail: ev.recipient })
          break
        }
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
        case 'order-confirmation': {
          // Retry of a confirmation email that failed inside the webhook.
          const { data: order } = await supabaseAdmin
            .from('orders').select('customer_name, recipient_name, total_amount, tracking_number, selected_items').eq('id', ev.order_id).maybeSingle()
          if (!order) {
            await supabaseAdmin.from('email_events').update({ canceled_at: new Date().toISOString() }).eq('id', ev.id)
            skipped++
            continue
          }
          const { resolveOrderItemImages } = await import('./order-item-images')
          await sendOrderConfirmationEmail({
            customerName: order.customer_name,
            customerEmail: ev.recipient,
            orderId: ev.order_id ?? '',
            recipientName: order.recipient_name ?? undefined,
            total: order.total_amount ?? 0,
            trackingNumber: order.tracking_number ?? undefined,
            items: await resolveOrderItemImages(((order.selected_items ?? []) as Array<{ id?: string; name: string; price?: number; qty?: number; image?: string | null }>).map(i => ({
              id: i.id, name: i.name, price: i.price, qty: i.qty ?? 1, image: i.image ?? null,
            }))),
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
  return { sent, skipped, held, errors }
}
