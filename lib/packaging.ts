// ── Physical packaging cartons ────────────────────────────────────────────────
// The five gift-box carton sizes (inner dimensions, cm) and which prebuilt box
// each set ships in. Owner-confirmed 2026-07-05. Used for pack planning; wire
// into Shippo parcel dimensions when per-box shipping rates are needed
// (weights still to be measured per set).

export interface Carton {
  id: string
  lengthCm: number
  widthCm: number
  heightCm: number
}

export const CARTONS: Carton[] = [
  { id: 'XL', lengthCm: 34, widthCm: 29, heightCm: 9 },
  { id: 'L',  lengthCm: 32, widthCm: 27, heightCm: 8.5 },
  { id: 'M',  lengthCm: 27, widthCm: 22, heightCm: 8 },
  { id: 'S',  lengthCm: 25, widthCm: 19, heightCm: 7 },
  { id: 'XS', lengthCm: 22, widthCm: 16, heightCm: 6.5 },
]

// Prebuilt-box slug → carton id. Sets not listed default to 'M'.
// Dried bouquets are 16–20cm — they fit FLAT in every carton size.
// Flagged for physical test-packs: l-heritage in XL (fullest set) and
// petit-marin in M (may drop to S without the towel).
export const BOX_CARTON: Record<string, string> = {
  'l-heritage': 'XL',
  'aube-rosee': 'L',
  'champ-de-sauge': 'L',
  'coton-sable': 'M',
  'petite-rose': 'M',
  'petit-marin': 'M',
  'brume-de-lilas': 'M',
  'petit-ciel': 'M',          // Mère et Bébé (existing)
  'toujours': 'S',
  'rituel-de-maman': 'S',
  'jardin-de-grand-mere': 'S',
  'le-petit-cadeau': 'XS',
  'petit-marin-leger': 'XS',
  'petit-nuage': 'M',
  'rose-tendre': 'M',
  'fleur-eternelle': 'M',
}

export function cartonFor(slug: string): Carton {
  const id = BOX_CARTON[slug] ?? 'M'
  return CARTONS.find(c => c.id === id) ?? CARTONS[2]
}

// ── Shipping parcels ─────────────────────────────────────────────────────────
// Shippo/USPS want INCHES; CARTONS above are centimetres, so the conversion
// lives here rather than at each call site. These are the carton's own
// dimensions — if a carton ever ships inside a larger outer mailer, measure the
// mailer and put THOSE numbers in CARTONS, because USPS measures the outside.

const CM_PER_INCH = 2.54

/** Fallback declared weight, in pounds, when the packer doesn't type one. */
export const DEFAULT_WEIGHT_LB = 2

export const CARTON_IDS = CARTONS.map(c => c.id)

export interface Parcel { length: string; width: string; height: string; weightLb: string }

/** Carton id + weighed pounds → the parcel block Shippo expects. */
export function parcelFor(cartonId?: string, weightLb: number = DEFAULT_WEIGHT_LB): Parcel {
  const c = CARTONS.find(x => x.id === cartonId) ?? cartonFor('')
  const inches = (cm: number) => (cm / CM_PER_INCH).toFixed(2)
  return {
    length: inches(c.lengthCm),
    width: inches(c.widthCm),
    height: inches(c.heightCm),
    weightLb: weightLb.toFixed(2),
  }
}
