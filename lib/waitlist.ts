import { supabaseAdmin } from './supabase'

// Build 12 — waitlist + restock notifications. Joining the waitlist is an
// explicit "email me about this" (source: waitlist, opted in). Restock
// notifications ride the email_events queue in signup order and are treated
// as marketing (held while the store is closed — a restock email pointing at
// a closed checkout would dead-end). Gated by WAITLIST_ACTIVE.

export const WAITLIST_ACTIVE = process.env.WAITLIST_ACTIVE === 'true'

export async function joinWaitlist(input: { email: string; productId: string; segment?: string }): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid email' }
  const { error } = await supabaseAdmin.from('product_waitlist').upsert(
    { email, product_id: input.productId, segment: input.segment ?? null },
    { onConflict: 'email,product_id' }
  )
  if (error) return { ok: false, error: error.message }
  try {
    const { upsertContact } = await import('./contacts')
    await upsertContact({
      email,
      source: `waitlist:${input.productId}`,
      marketingOptIn: true,
      segment: (['parent_to_be', 'grandparent', 'friend_coworker'].includes(input.segment ?? '')
        ? input.segment as 'parent_to_be' | 'grandparent' | 'friend_coworker'
        : undefined),
    })
  } catch { /* fail-soft */ }
  return { ok: true }
}

/**
 * Daily sweep (piggybacks the restock-alerts cron): for every waitlisted
 * product back above zero stock, queue notifications in signup order.
 * Idempotent — notified_at marks each row once. Returns queued count.
 */
export async function processRestocks(): Promise<number> {
  if (!WAITLIST_ACTIVE) return 0
  const { data: waiting } = await supabaseAdmin
    .from('product_waitlist').select('*').is('notified_at', null).order('created_at')
  if (!waiting?.length) return 0

  const productIds = [...new Set(waiting.map(w => w.product_id as string))]
  const { getProductStock, getCatalogProduct } = await import('./products-db')

  let queued = 0
  for (const pid of productIds) {
    const product = await getCatalogProduct(pid)
    if (!product || !product.active) continue
    const stock = await getProductStock(pid, false)
    if (stock === null || stock <= 0) continue

    const rows = waiting.filter(w => w.product_id === pid)
    for (const w of rows) {
      const campaign = `restock:${pid}:${w.id}`
      const { data: existing } = await supabaseAdmin
        .from('email_events').select('id').eq('campaign', campaign).limit(1)
      if (!existing?.length) {
        const { error } = await supabaseAdmin.from('email_events').insert({
          flow: 'restock', step: 1, recipient: w.email, template: 'restock',
          campaign, scheduled_at: new Date().toISOString(),
        })
        if (error) continue
        queued++
      }
      await supabaseAdmin.from('product_waitlist').update({ notified_at: new Date().toISOString() }).eq('id', w.id)
    }
  }
  return queued
}

/** Product name for the restock template (campaign carries the product id). */
export function restockProductIdFromCampaign(campaign: string | null): string | null {
  const m = campaign?.match(/^restock:([^:]+):/)
  return m ? m[1] : null
}
