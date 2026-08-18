import type { BoxSelection, Product } from '@/types'
import { PRODUCTS } from './products.ts'

function find(category: keyof typeof PRODUCTS, id: string): Product {
  const p = PRODUCTS[category].find(p => p.id === id)
  if (!p) throw new Error(`Product not found: ${id}`)
  return p
}

export interface PrebuiltBox {
  slug: string
  name: string
  style: string
  variant: 'neutral' | 'girl' | 'boy'
  tagline: string
  description: string
  aesthetic: string
  featured: boolean
  image?: string            // assembled box photo URL
  selection: BoxSelection   // 7 slots: 5 core + extra1 + extra2
  customPrice?: number      // optional override for calculated price (in cents)
}

export const PREBUILT_BOXES: PrebuiltBox[] = [
  {
    slug: 'douce-serenite',
    name: 'Douce Sérénité',
    style: 'Summer',
    variant: 'neutral',
    tagline: 'Quiet moments of calm, wrapped in nature\'s softest touch.',
    description: 'Two rompers in cream and khaki, a soft blanket, mulberry silk eye mask, lavender-infused rituals, and keepsakes to treasure.',
    aesthetic: 'Neutral · Serene · Essential',
    featured: true,
    customPrice: 16000,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),
      garment:  find('garment',  'garment-romper'),
      bath:     find('bath',     'bath-calendula'),
      keepsake: find('keepsake', 'keepsake-bunny'),
      mom:      find('mom',      'mom-lavender'),
      extra1:   find('keepsake', 'keepsake-rattle'),
      extra2:   find('bath',     'bath-botanical'),
    },
  },
  {
    // Renamed from "Petit Ciel" (2026-07-03) — slug kept stable for anchors &
    // uploaded images. Reserve list (names retired, free to reuse on a future
    // box): Petit Ciel.
    slug: 'petit-ciel',
    name: 'Mère et Bébé',
    style: 'Summer',
    variant: 'boy',
    tagline: 'Adventure begins with the gentlest sky blue dreams.',
    description: 'Khaki and slate blue rompers, cream blanket, silk eye mask, calming botanicals, and cherished keepsakes for his arrival.',
    aesthetic: 'Sky Blue · Soft · Adventurous',
    featured: true,
    customPrice: 17000,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),
      garment:  find('garment',  'garment-kimono'),
      bath:     find('bath',     'bath-botanical'),
      keepsake: find('keepsake', 'keepsake-bunny'),
      mom:      find('mom',      'mom-tea'),
      extra1:   find('keepsake', 'keepsake-rattle'),
      extra2:   find('bath',     'bath-calendula'),
    },
  },
  {
    slug: 'rose-tendre',
    name: 'Rose Tendre',
    style: 'Summer',
    variant: 'girl',
    tagline: 'Tender petals and soft whispers, a new world blooming.',
    description: 'Khaki and rosy rompers, cream blanket, silk eye mask, botanical care, and gentle keepsakes to welcome your little girl.',
    aesthetic: 'Rose · Tender · Blooming',
    featured: true,
    customPrice: 17000,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),
      garment:  find('garment',  'garment-bodysuit'),
      bath:     find('bath',     'bath-botanical'),
      keepsake: find('keepsake', 'keepsake-bunny'),
      mom:      find('mom',      'mom-lavender'),
      extra1:   find('keepsake', 'keepsake-print'),
      extra2:   find('bath',     'bath-calendula'),
    },
  },
]

/** Product IDs referenced by any prebuilt box — never delete these. */
export const PROTECTED_PRODUCT_IDS: Set<string> = new Set(
  PREBUILT_BOXES.flatMap(box =>
    Object.values(box.selection).filter(Boolean).map(p => (p as Product).id)
  )
)

export function getBoxBySlug(slug: string): PrebuiltBox | undefined {
  return PREBUILT_BOXES.find(b => b.slug === slug)
}

export function boxItemTotal(selection: BoxSelection): number {
  return Object.values(selection).reduce((sum, p) => sum + (p?.price ?? 0), 0)
}

export function featuredBoxes(): PrebuiltBox[] {
  return PREBUILT_BOXES.filter(b => b.featured)
}
