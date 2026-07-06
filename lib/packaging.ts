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
// Flagged for physical test-packs: l-heritage in XL (fullest set), the
// bouquet sets in S (bouquet ~25cm fits diagonally), petit-marin in M
// (may drop to S without the towel).
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
