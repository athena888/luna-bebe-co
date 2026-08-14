import { supabaseAdmin } from './supabase'
import type { Currency } from './markets'

// Per-currency box fee and shipping (explicit, rounded per market — no FX).
// USD mirrors lib/products (BOX_BASE_PRICE / SHIPPING) so the US flow is identical.
export const BOX_BASE_BY_CURRENCY: Record<Currency, number> = { USD: 0, GBP: 2500, EUR: 2900 }
export const SHIPPING_BY_CURRENCY: Record<Currency, { standard: number; premium: number; sameday: number }> = {
  USD: { standard: 995, premium: 2800, sameday: 1500 },
  GBP: { standard: 1000, premium: 2400, sameday: 1500 },
  EUR: { standard: 1200, premium: 2800, sameday: 1500 },
}

// Active per-currency product prices, keyed by product id. Missing ⇒ that
// product isn't sold in this currency (no silent USD fallback).
export async function getProductPrices(productIds: string[], currency: Currency): Promise<Record<string, number>> {
  const ids = [...new Set(productIds)].filter(Boolean)
  if (!ids.length) return {}
  try {
    const { data } = await supabaseAdmin
      .from('product_prices')
      .select('product_id, unit_amount')
      .eq('currency', currency)
      .eq('active', true)
      .in('product_id', ids)
    const out: Record<string, number> = {}
    for (const r of data ?? []) out[r.product_id as string] = r.unit_amount as number
    return out
  } catch {
    return {}
  }
}

// All currency rows for one product (admin editor).
export async function getPricesForProduct(productId: string): Promise<Record<Currency, { unit_amount: number; active: boolean }>> {
  const out = {} as Record<Currency, { unit_amount: number; active: boolean }>
  try {
    const { data } = await supabaseAdmin
      .from('product_prices').select('currency, unit_amount, active').eq('product_id', productId)
    for (const r of data ?? []) out[r.currency as Currency] = { unit_amount: r.unit_amount as number, active: r.active as boolean }
  } catch { /* table may not exist yet */ }
  return out
}
