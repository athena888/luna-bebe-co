// Landed-cost + profit math for The First Year catalog. Customers never see any
// of this — it's admin-only, to show profit per sale.
//
// Cost model (per Emily's brief):
//   landed cost = wholesale (¥) + China→US freight (¥75 / kg × weight)  ... in RMB
//                 → converted to USD
//                 + US domestic shipping to the customer (USD)
//   profit      = retail price (USD) − landed cost (USD)

export const FREIGHT_RMB_PER_KG = 75

// RMB → USD. Override with NEXT_PUBLIC_RMB_TO_USD when the rate moves.
// ~7.1 RMB per USD ≈ 0.141.
export const RMB_TO_USD = (() => {
  const v = Number(process.env.NEXT_PUBLIC_RMB_TO_USD)
  return Number.isFinite(v) && v > 0 ? v : 0.141
})()

export interface CostInputs {
  wholesaleRmbCents?: number | null  // supplier cost, RMB cents
  weightGrams?: number | null        // item weight for the freight estimate
  usShipCents?: number | null        // US domestic shipping to the customer, USD cents
}

/** China-side cost (wholesale + ¥75/kg freight), in RMB cents. */
export function chinaCostRmbCents({ wholesaleRmbCents, weightGrams }: CostInputs): number {
  const wholesale = Math.max(0, Number(wholesaleRmbCents) || 0)
  // ¥75/kg = 7.5 RMB-cents per gram.
  const freight = Math.round(7.5 * Math.max(0, Number(weightGrams) || 0))
  return wholesale + freight
}

/** Total landed cost in USD cents (China cost converted + US shipping). */
export function landedCostUsdCents(c: CostInputs): number {
  const chinaUsd = Math.round(chinaCostRmbCents(c) * RMB_TO_USD)
  return chinaUsd + Math.max(0, Number(c.usShipCents) || 0)
}

/** Profit in USD cents, or null if we don't have enough to compute it. */
export function profitUsdCents(retailUsdCents: number | null | undefined, c: CostInputs): number | null {
  if (retailUsdCents == null || !Number.isFinite(Number(retailUsdCents))) return null
  const hasCost = (Number(c.wholesaleRmbCents) || 0) > 0 || (Number(c.usShipCents) || 0) > 0
  if (!hasCost) return null
  return Math.round(Number(retailUsdCents)) - landedCostUsdCents(c)
}

export function fmtUsd(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `${cents < 0 ? '-' : ''}$${(Math.abs(cents) / 100).toFixed(2)}`
}
