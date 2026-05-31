import type { BoxSelection, Product } from '@/types'
import { PRODUCTS } from './products'

function find(category: keyof typeof PRODUCTS, id: string): Product {
  const p = PRODUCTS[category].find(p => p.id === id)
  if (!p) throw new Error(`Product not found: ${id}`)
  return p
}

export interface PrebuiltBox {
  slug: string
  name: string
  style: string
  variant: 'neutral' | 'girl'
  tagline: string
  description: string
  aesthetic: string
  featured: boolean
  selection: BoxSelection   // 7 slots: 5 core + extra1 + extra2
}

export const PREBUILT_BOXES: PrebuiltBox[] = [
  // ── The Boho ────────────────────────────────────────────────────────────────
  {
    slug: 'the-boho',
    name: 'The Boho',
    style: 'Bohemian',
    variant: 'neutral',
    tagline: 'Earthy, layered, and deeply intentional.',
    description: "For the free-spirited family — raw textures, artisan-made keepsakes, and herbal rituals rooted in nature. Every piece feels like it was found at a small-batch maker's market.",
    aesthetic: 'Knit · Artisan · Botanical',
    featured: true,
    selection: {
      swaddle:  find('swaddle',  'swaddle-knit'),       // Heirloom Knit Blanket
      garment:  find('garment',  'garment-kimono'),      // Bamboo Kimono Set
      bath:     find('bath',     'bath-calendula'),      // Calendula Bath Soak Kit
      keepsake: find('keepsake', 'keepsake-rattle'),     // Handcrafted Wooden Rattle
      mom:      find('mom',      'mom-lavender'),        // Lavender Self-Care Kit
      extra1:   find('keepsake', 'keepsake-bunny'),      // Organic Cotton Bunny
      extra2:   find('bath',     'bath-towel'),          // Organic Hooded Towel Set
    },
  },
  {
    slug: 'the-boho-girl',
    name: 'The Boho — Girl',
    style: 'Bohemian',
    variant: 'girl',
    tagline: 'Wild, soft, and entirely her own.',
    description: "Velvet softness, silk, and a moon to light her nursery — the boho aesthetic with a feminine heart. For the little girl who'll grow up with wildflowers in her hair.",
    aesthetic: 'Velvet · Silk · Moonlit',
    featured: false,
    selection: {
      swaddle:  find('swaddle',  'swaddle-velvet'),      // Velvet Bonding Wrap
      garment:  find('garment',  'garment-kimono'),      // Bamboo Kimono Set
      bath:     find('bath',     'bath-botanical'),      // Botanical Baby Wash Duo
      keepsake: find('keepsake', 'keepsake-bunny'),      // Organic Cotton Bunny
      mom:      find('mom',      'mom-silk'),            // Silk Nursing Scarf
      extra1:   find('garment',  'garment-bodysuit'),    // Essential Organic Bodysuit Set
      extra2:   find('keepsake', 'keepsake-night-light'),// Moon Night Light
    },
  },

  // ── The Garden ──────────────────────────────────────────────────────────────
  {
    slug: 'the-garden',
    name: 'The Garden',
    style: 'Botanical',
    variant: 'neutral',
    tagline: 'Fresh, floral, and impossibly soft.',
    description: 'Chamomile washes, muslin swaddles, and a hand-sewn bunny — a box that feels like a Sunday morning in a sun-drenched garden. Gentle on newborn skin, beautiful to receive.',
    aesthetic: 'Muslin · Chamomile · Organic',
    featured: true,
    selection: {
      swaddle:  find('swaddle',  'swaddle-muslin'),      // Organic Muslin Swaddle Set
      garment:  find('garment',  'garment-gown'),        // Organic Knotted Gown
      bath:     find('bath',     'bath-botanical'),      // Botanical Baby Wash Duo
      keepsake: find('keepsake', 'keepsake-bunny'),      // Organic Cotton Bunny
      mom:      find('mom',      'mom-tea'),             // Artisan Loose Leaf Tea Collection
      extra1:   find('garment',  'garment-romper'),      // Ribbed Organic Romper
      extra2:   find('bath',     'bath-oil'),            // Nourishing Baby Oil Serum
    },
  },
  {
    slug: 'the-garden-girl',
    name: 'The Garden — Girl',
    style: 'Botanical',
    variant: 'girl',
    tagline: 'Blooming, tender, and made to be cherished.',
    description: "Waffle knit textures, botanical washes, and a fingerprint kit to capture the smallest hands — the Garden in full bloom, for a little girl who arrived like spring.",
    aesthetic: 'Waffle Knit · Botanicals · Keepsake',
    featured: false,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),      // Waffle Knit Receiving Blanket
      garment:  find('garment',  'garment-kimono'),      // Bamboo Kimono Set
      bath:     find('bath',     'bath-botanical'),      // Botanical Baby Wash Duo
      keepsake: find('keepsake', 'keepsake-bunny'),      // Organic Cotton Bunny
      mom:      find('mom',      'mom-herbal'),          // Organic Postpartum Bundle
      extra1:   find('garment',  'garment-bodysuit'),    // Essential Organic Bodysuit Set
      extra2:   find('keepsake', 'keepsake-print'),      // Fingerprint Keepsake Kit
    },
  },

  // ── The Classique ───────────────────────────────────────────────────────────
  {
    slug: 'the-classique',
    name: 'The Classique',
    style: 'Heirloom',
    variant: 'neutral',
    tagline: 'Timeless, refined, and made to last generations.',
    description: "French linen, superfine merino, and gilded memory pages — this box is built to become an heirloom. The kind of gift that gets passed down, not packed away.",
    aesthetic: 'Linen · Merino · Gilded',
    featured: true,
    selection: {
      swaddle:  find('swaddle',  'swaddle-quilted'),     // Quilted Linen Blanket
      garment:  find('garment',  'garment-cardigan'),    // Hand-Knit Merino Cardigan
      bath:     find('bath',     'bath-shea'),           // Organic Shea Butter Set
      keepsake: find('keepsake', 'keepsake-print'),      // Fingerprint Keepsake Kit
      mom:      find('mom',      'mom-journal'),         // Linen Baby Memory Journal
      extra1:   find('garment',  'garment-sleeper'),     // Footed Zip Sleeper
      extra2:   find('keepsake', 'keepsake-blocks'),     // Engraved Name Block Set
    },
  },
  {
    slug: 'the-classique-girl',
    name: 'The Classique — Girl',
    style: 'Heirloom',
    variant: 'girl',
    tagline: 'Silk, merino, and a light to guide her.',
    description: "The same Classique DNA — dressed in bamboo silk and lit by warm amber. For the little girl who deserves a nursery that feels like a French countryside château.",
    aesthetic: 'Bamboo Silk · Amber · Merino',
    featured: false,
    selection: {
      swaddle:  find('swaddle',  'swaddle-bamboo'),      // Bamboo Stretch Swaddle
      garment:  find('garment',  'garment-cardigan'),    // Hand-Knit Merino Cardigan
      bath:     find('bath',     'bath-shea'),           // Organic Shea Butter Set
      keepsake: find('keepsake', 'keepsake-night-light'),// Moon Night Light
      mom:      find('mom',      'mom-silk'),            // Silk Nursing Scarf
      extra1:   find('garment',  'garment-gown'),        // Organic Knotted Gown
      extra2:   find('bath',     'bath-oil'),            // Nourishing Baby Oil Serum
    },
  },

  // ── Summer Editions ─────────────────────────────────────────────────────────
  {
    slug: 'douce-serenite',
    name: 'Douce Sérénité',
    style: 'Summer',
    variant: 'neutral',
    tagline: 'Quiet moments of calm, wrapped in nature\'s softest touch.',
    description: 'Two rompers in cream and khaki, a soft blanket, mulberry silk eye mask, lavender-infused rituals, and keepsakes to treasure.',
    aesthetic: 'Neutral · Serene · Essential',
    featured: true,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),      // Cream blanket (closest match)
      garment:  find('garment',  'garment-romper'),      // Ribbed Organic Romper (khaki + cream)
      bath:     find('bath',     'bath-calendula'),      // Bath soak + salts ritual
      keepsake: find('keepsake', 'keepsake-bunny'),      // Cream lovey
      mom:      find('mom',      'mom-lavender'),        // Lavender-centered self-care
      extra1:   find('keepsake', 'keepsake-rattle'),     // Khaki teether
      extra2:   find('bath',     'bath-botanical'),      // Bath bomb duo
    },
  },
  {
    slug: 'petit-ciel',
    name: 'Petit Ciel',
    style: 'Summer',
    variant: 'neutral',
    tagline: 'Adventure begins with the gentlest sky blue dreams.',
    description: 'Khaki and slate blue rompers, cream blanket, silk eye mask, calming botanicals, and cherished keepsakes for his arrival.',
    aesthetic: 'Sky Blue · Soft · Adventurous',
    featured: true,
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),      // Cream blanket
      garment:  find('garment',  'garment-kimono'),      // Bamboo romper in slate blue tones
      bath:     find('bath',     'bath-botanical'),      // Botanical wash + bath ritual
      keepsake: find('keepsake', 'keepsake-bunny'),      // Cream lovey
      mom:      find('mom',      'mom-tea'),             // Calming herbal support
      extra1:   find('keepsake', 'keepsake-rattle'),     // Khaki teether
      extra2:   find('bath',     'bath-calendula'),      // Bath salts + bomb
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
    selection: {
      swaddle:  find('swaddle',  'swaddle-waffle'),      // Cream blanket
      garment:  find('garment',  'garment-bodysuit'),    // Rose/pink-toned essentials
      bath:     find('bath',     'bath-botanical'),      // Botanical wash + self-care
      keepsake: find('keepsake', 'keepsake-bunny'),      // Cream lovey
      mom:      find('mom',      'mom-lavender'),        // Lavender self-care
      extra1:   find('keepsake', 'keepsake-print'),      // Fingerprint kit (khaki teether substitute)
      extra2:   find('bath',     'bath-calendula'),      // Bath ritual (salts + bomb)
    },
  },
]

export function getBoxBySlug(slug: string): PrebuiltBox | undefined {
  return PREBUILT_BOXES.find(b => b.slug === slug)
}

export function boxItemTotal(selection: BoxSelection): number {
  return Object.values(selection).reduce((sum, p) => sum + (p?.price ?? 0), 0)
}

export function featuredBoxes(): PrebuiltBox[] {
  return PREBUILT_BOXES.filter(b => b.featured)
}
