import { supabaseAdmin } from './supabase.ts'
import {
  FOUNDING_LIMIT, FOUNDING_START, FOUNDING_FORCED_OFF, inFoundingWindow,
} from './promo.ts'

// Is the Founding Families promo live RIGHT NOW? Split out of lib/promo.ts so
// that module stays pure and testable; this one talks to the database.

export interface PromoState {
  active: boolean
  sold: number
  remaining: number
  /** Why it's off, for the portal and for logs. Empty when active. */
  reason: '' | 'forced-off' | 'sold-out' | 'outside-window' | 'unknown'
}

// A paid order. 'pending' means checkout was started and never completed, and
// 'refunded' means the sale came back — neither consumes a founding slot.
const PAID_STATUSES = ['processing', 'paid', 'shipped', 'delivered', 'fulfilled']

// The storefront, both feeds and every product page ask this question on every
// request. Without a cache that is one COUNT per render; with it, at most one
// per minute per instance. A minute of staleness can at worst sell box 31 at
// the founding price, which is a far better failure than hammering the
// database — or than blocking a page render on a network call.
const TTL_MS = 60_000
let cached: { at: number; value: PromoState } | null = null

export async function foundingPromoState(): Promise<PromoState> {
  if (FOUNDING_FORCED_OFF) return { active: false, sold: 0, remaining: 0, reason: 'forced-off' }
  if (!inFoundingWindow(new Date())) return { active: false, sold: 0, remaining: 0, reason: 'outside-window' }

  if (cached && Date.now() - cached.at < TTL_MS) return cached.value

  try {
    // NOTE ON WHAT IS COUNTED: every paid order since launch counts as one
    // founding slot. The orders table records `selected_items`, not the box
    // slug, so "was this a gift box?" is not answerable in SQL here — and an
    // order is a box in practice, since single items are not separately
    // purchasable (see INCLUDE_SINGLE_ITEMS in lib/google-feed-tsv.ts). If
    // standalone items ever become buyable, this needs a real box predicate.
    const { count, error } = await supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', FOUNDING_START)
      .in('status', PAID_STATUSES)
    if (error) throw error

    const sold = count ?? 0
    const value: PromoState = sold >= FOUNDING_LIMIT
      ? { active: false, sold, remaining: 0, reason: 'sold-out' }
      : { active: true, sold, remaining: FOUNDING_LIMIT - sold, reason: '' }
    cached = { at: Date.now(), value }
    return value
  } catch (err) {
    // FAIL CLOSED. If the count is unknown we must not keep advertising a sale
    // we may no longer be able to honour — and a feed that flickers between
    // sale and regular pricing on database blips is worse than no sale at all.
    console.error('founding promo state unavailable, treating as off:', err instanceof Error ? err.message : err)
    return { active: false, sold: 0, remaining: 0, reason: 'unknown' }
  }
}

/** Drop the cache — used after an order lands so the counter moves promptly. */
export function resetPromoStateCache(): void {
  cached = null
}
