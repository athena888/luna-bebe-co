import type { WholesaleTier } from '@/types'

export const TIER_DISCOUNTS: Record<WholesaleTier, number> = {
  silver: 0.30,
  gold: 0.40,
  platinum: 0.50,
}

export const TIER_MIN_ORDER_CENTS: Record<WholesaleTier, number> = {
  silver: 50000,
  gold: 200000,
  platinum: 500000,
}

export const TIER_LABELS: Record<WholesaleTier, string> = {
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

export const NET30_TERM_DAYS = 30

export function applyTierPrice(msrpCents: number, tier: WholesaleTier): number {
  return Math.round(msrpCents * (1 - TIER_DISCOUNTS[tier]))
}

export function meetsMinimumOrder(subtotalCents: number, tier: WholesaleTier): boolean {
  return subtotalCents >= TIER_MIN_ORDER_CENTS[tier]
}

export function calculateDueDate(from: Date = new Date()): Date {
  const due = new Date(from)
  due.setDate(due.getDate() + NET30_TERM_DAYS)
  return due
}
