import type { AffiliateTier } from '@/types'

export const AFFILIATE_COOKIE = 'aff_ref'
export const AFFILIATE_COOKIE_DAYS = 30
export const REFUND_HOLD_DAYS = 30
export const MIN_PAYOUT_CENTS = 5000

export const COMMISSION_RATES: Record<AffiliateTier, number> = {
  standard: 0.15,
  vip: 0.20,
}

export function generateAffiliateCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'AFF'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${base}-${suffix}`
}

export function calculateCommission(orderSubtotalCents: number, rate: number): number {
  return Math.floor(orderSubtotalCents * rate)
}
