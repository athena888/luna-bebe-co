// Server-side Meta Conversions API (CAPI) — the server counterpart to the
// browser Pixel. Fired from the Stripe webhook so ad blockers / iOS tracking
// prevention can't erase Purchase signal. Deduplicated against the browser
// Pixel Purchase by a shared event_id (= order id): Meta collapses the two into
// one conversion, so firing both is correct, not double-counting.
//
// Env: NEXT_PUBLIC_META_PIXEL_ID (already set for the Pixel) + META_CAPI_ACCESS_TOKEN
// (Events Manager → Settings → Conversions API → Generate access token).
// Missing env → silent no-op; failures are logged and never block the order.

import crypto from 'crypto'

const GRAPH_VERSION = 'v19.0'

interface CapiItem { id: string; name?: string; price?: number; qty?: number }

const sha256 = (v: string) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

export async function sendPurchaseCapi(input: {
  orderId: string
  valueCents: number
  currency?: string
  email?: string | null
  items?: CapiItem[]
  eventSourceUrl?: string
}): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  if (!pixelId || !accessToken) return

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
  const body = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      // Shared with the browser Pixel Purchase (eventID = order id) so Meta dedupes.
      event_id: input.orderId,
      action_source: 'website',
      event_source_url: input.eventSourceUrl || `${baseUrl}/confirmation`,
      user_data: {
        // At least one user_data key is required; hashed email is enough to match.
        ...(input.email ? { em: [sha256(input.email)] } : {}),
      },
      custom_data: {
        currency: (input.currency ?? 'USD').toUpperCase(),
        value: input.valueCents / 100,
        content_type: 'product',
        content_ids: (input.items ?? []).map(i => i.id),
        num_items: (input.items ?? []).reduce((s, i) => s + (i.qty ?? 1), 0),
      },
    }],
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    )
    if (!res.ok) console.error('Meta CAPI purchase non-OK:', res.status, await res.text().catch(() => ''))
  } catch (e) {
    console.error('Meta CAPI purchase failed (order unaffected):', e)
  }
}
