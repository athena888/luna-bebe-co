// "The First Year" sub-line — additive, feature-flagged. Everything here is new;
// it does not touch existing products/cart/checkout. Flag OFF = site unchanged.

export function firstYearEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FIRST_YEAR_ENABLED === 'true'
}

// The single purchasable set product (one Stripe payment, three shipments).
// Price is a placeholder — edit here (or via the Phase-5 admin) when set.
export const FIRST_YEAR_PRODUCT = {
  id: 'first-year-set',
  name: 'The First Year',
  description: 'A gift that arrives three times — at birth, around six months, and near the first birthday.',
  priceCents: 29500,
}

/** ship_by_date = order date + monthOffset, as YYYY-MM-DD. */
export function shipByDate(orderDate: Date, monthOffset: number): string {
  const d = new Date(orderDate)
  d.setMonth(d.getMonth() + monthOffset)
  return d.toISOString().slice(0, 10)
}

// The three scheduled shipments that make up the set. target_month_offset drives
// the future-dated obligations created at purchase (Task 2 / Task 4).
export interface FirstYearShipment {
  index: 1 | 2 | 3
  numeral: string
  label: 'Welcome' | 'Growing' | 'One'
  milestone: string
  sizeRange: string
  blurb: string
  monthOffset: 0 | 6 | 12
}

export const FIRST_YEAR_SHIPMENTS: FirstYearShipment[] = [
  { index: 1, numeral: 'I', label: 'Welcome', milestone: 'Newborn – 3 months', sizeRange: 'NB–3mo', monthOffset: 0,
    blurb: 'Arrives at gifting — a beautiful outfit for those first tender days, hand-finished and wrapped to be remembered.' },
  { index: 2, numeral: 'II', label: 'Growing', milestone: 'Around six months', sizeRange: '6–9mo', monthOffset: 6,
    blurb: 'Arrives around six months, sized to the moment as baby grows into the world.' },
  { index: 3, numeral: 'III', label: 'One', milestone: 'Near the first birthday', sizeRange: '12–18mo', monthOffset: 12,
    blurb: 'Arrives near the first birthday — a piece to mark a whole year of becoming.' },
]
