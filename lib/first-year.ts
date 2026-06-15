// "The First Year" sub-line — additive, feature-flagged. Everything here is new;
// it does not touch existing products/cart/checkout. Flag OFF = site unchanged.

export function firstYearEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FIRST_YEAR_ENABLED === 'true'
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
