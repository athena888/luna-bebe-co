import type { Product, ProductCategory } from '@/types'

export const PRODUCTS: Record<ProductCategory, Product[]> = {
  swaddle: [
    { id: 'swaddle-muslin', name: 'Organic Muslin Swaddle Set', description: 'Ultra-soft organic cotton muslin. Breathable, pre-washed, and gets softer with every wash. Set of 2.', price: 2800, category: 'swaddle', imageEmoji: '🌿', tag: 'Bestseller', ingredients: '100% Organic Cotton' },
    { id: 'swaddle-bamboo', name: 'Bamboo Stretch Swaddle', description: 'Silky bamboo blend with 4-way stretch for a perfect snug wrap every time. Temperature-regulating and hypoallergenic.', price: 3200, category: 'swaddle', imageEmoji: '🎋', tag: 'Silky Soft', ingredients: '70% Bamboo, 30% Organic Cotton' },
    { id: 'swaddle-knit', name: 'Heirloom Knit Blanket', description: 'Hand-finished open-weave knit blanket. Warm yet breathable, beautiful enough to frame. A keepsake for a lifetime.', price: 4500, category: 'swaddle', imageEmoji: '🧶', tag: 'Heirloom', ingredients: '100% Organic Merino Wool' },
    { id: 'swaddle-waffle', name: 'Waffle Knit Receiving Blanket', description: 'Textured waffle knit in cloud-soft pima cotton. Lightweight warmth that layers beautifully. Perfect year-round.', price: 3400, category: 'swaddle', imageEmoji: '🍦', tag: 'Year Round', ingredients: '100% Pima Cotton' },
    { id: 'swaddle-quilted', name: 'Quilted Linen Blanket', description: 'French linen quilted with organic cotton fill. Gets better with age — a true heirloom piece for generations.', price: 5200, category: 'swaddle', imageEmoji: '🪡', tag: 'Linen', ingredients: '100% French Linen, Organic Cotton Fill' },
    { id: 'swaddle-velvet', name: 'Velvet Bonding Wrap', description: 'Ultra-plush micro-velvet wrap perfect for skin-to-skin. Stretchy, washable, and impossibly cozy.', price: 3800, category: 'swaddle', imageEmoji: '🌙', tag: 'Skin-to-Skin', ingredients: '80% Polyester Velvet, 20% Spandex' },
  ],
  garment: [
    { id: 'garment-gown', name: 'Organic Knotted Gown', description: 'The midnight diaper-change hero. Expandable knotted bottom for easy access. Incredibly soft organic cotton.', price: 3400, category: 'garment', imageEmoji: '👶', tag: 'Mom Approved', ingredients: '100% Organic Cotton' },
    { id: 'garment-kimono', name: 'Bamboo Kimono Set', description: 'Side-snap closure makes dressing a newborn effortless. Included matching hat. Thermoregulating bamboo blend.', price: 3800, category: 'garment', imageEmoji: '🌸', tag: 'Gift Favorite', ingredients: '95% Bamboo, 5% Spandex' },
    { id: 'garment-romper', name: 'Ribbed Organic Romper', description: 'Minimalist ribbed romper in natural undyed cotton. No dyes, no chemicals — just pure softness against newborn skin.', price: 3000, category: 'garment', imageEmoji: '🤍', tag: 'Pure & Natural', ingredients: '100% Undyed Organic Cotton' },
    { id: 'garment-sleeper', name: 'Footed Zip Sleeper', description: 'Two-way zip for easy midnight changes. Snug fit with fold-over cuffs. Certified safe dyes on organic cotton.', price: 3600, category: 'garment', imageEmoji: '⭐', tag: 'Nighttime Hero', ingredients: '100% Organic Cotton' },
    { id: 'garment-bodysuit', name: 'Essential Organic Bodysuit Set', description: 'A set of three in soft undyed cotton. Envelope neckline, nickel-free snaps. The wardrobe foundation every baby needs.', price: 4200, category: 'garment', imageEmoji: '🕊️', tag: 'Set of 3', ingredients: '100% Organic Cotton' },
    { id: 'garment-cardigan', name: 'Hand-Knit Merino Cardigan', description: 'Delicate hand-knit in superfine merino. Timeless silhouette with wooden buttons. Sized to layer and last.', price: 5800, category: 'garment', imageEmoji: '🧵', tag: 'Hand Knit', ingredients: 'Superfine Merino Wool' },
  ],
  bath: [
    { id: 'bath-botanical', name: 'Botanical Baby Wash Duo', description: 'Chamomile & calendula wash and lotion. Dermatologist tested, fragrance-free, safe from day one. Packaged in glass.', price: 3600, category: 'bath', imageEmoji: '🌼', tag: 'Dermatologist Tested', ingredients: 'Chamomile, Calendula, Aloe Vera' },
    { id: 'bath-shea', name: 'Organic Shea Butter Set', description: 'Raw African shea butter whipped with coconut oil. Zero synthetics. Rich moisture for eczema-prone and sensitive skin.', price: 3200, category: 'bath', imageEmoji: '🥥', tag: 'Eczema Safe', ingredients: 'Shea Butter, Coconut Oil, Vitamin E' },
    { id: 'bath-calendula', name: 'Calendula Bath Soak Kit', description: 'Dried calendula petals, oat powder, and lavender for a calming first bath ritual. Comes with a mesh soak bag.', price: 2800, category: 'bath', imageEmoji: '🛁', tag: 'Bath Ritual', ingredients: 'Calendula, Colloidal Oat, Lavender' },
    { id: 'bath-oil', name: 'Nourishing Baby Oil Serum', description: 'Lightweight blend of jojoba, sweet almond, and rosehip. Absorbs instantly. Locks in moisture after every bath.', price: 2600, category: 'bath', imageEmoji: '✨', tag: 'Lightweight', ingredients: 'Jojoba, Sweet Almond, Rosehip' },
    { id: 'bath-towel', name: 'Organic Hooded Towel Set', description: 'Plush double-layered organic cotton. Generous size that grows with baby. Includes matching washcloth.', price: 3800, category: 'bath', imageEmoji: '🐻', tag: 'Plush', ingredients: '100% Organic Cotton Terry' },
  ],
  keepsake: [
    { id: 'keepsake-rattle', name: 'Handcrafted Wooden Rattle', description: 'Turned from sustainably sourced maple wood. Smooth, natural finish — no paint, no varnish. Safe from birth.', price: 2400, category: 'keepsake', imageEmoji: '🪵', tag: 'Artisan Made', ingredients: 'Sustainably Sourced Maple Wood' },
    { id: 'keepsake-bunny', name: 'Organic Cotton Bunny', description: 'Hand-sewn in certified organic cotton. Weighted for easy gripping, soft enough to be a first best friend.', price: 2800, category: 'keepsake', imageEmoji: '🐰', tag: 'Handmade', ingredients: '100% Organic Cotton, Hypoallergenic Fill' },
    { id: 'keepsake-blocks', name: 'Engraved Name Block Set', description: 'Solid maple blocks hand-engraved with baby\'s name. Finished with beeswax. A display-worthy gift for the nursery.', price: 4800, category: 'keepsake', imageEmoji: '🔤', tag: 'Personalized', ingredients: 'Maple Wood, Beeswax Finish' },
    { id: 'keepsake-print', name: 'Fingerprint Keepsake Kit', description: 'Archival ink pad and linen card for capturing tiny prints. Includes a gilt-edged frame ready to hang.', price: 3200, category: 'keepsake', imageEmoji: '🖐️', tag: 'First Memory', ingredients: 'Archival Ink, Linen Card, Maple Frame' },
    { id: 'keepsake-night-light', name: 'Moon Night Light', description: 'Warm amber glow, rechargeable, dimmable. Carved from sustainable beech. A nursery heirloom that soothes.', price: 5600, category: 'keepsake', imageEmoji: '🌕', tag: 'Nursery Essential', ingredients: 'Sustainable Beech Wood, LED' },
  ],
  mom: [
    { id: 'mom-lavender', name: 'Lavender Self-Care Kit', description: 'French lavender bath soak, organic lip balm, and a beeswax candle. For the mama who deserves a moment to herself.', price: 3800, category: 'mom', imageEmoji: '💜', tag: 'For Mama', ingredients: 'French Lavender, Organic Beeswax, Shea' },
    { id: 'mom-tea', name: 'Artisan Loose Leaf Tea Collection', description: '4 organic blends: lactation support, postpartum calm, energy boost, and chamomile sleep. Beautifully tin-packaged.', price: 2600, category: 'mom', imageEmoji: '🍵', tag: 'Lactation Support', ingredients: 'Certified Organic Herbs & Botanicals' },
    { id: 'mom-herbal', name: 'Organic Postpartum Bundle', description: 'Healing perineal herbal sitz bath herbs, magnesium body butter, and a nourishing belly balm. Recovery, elevated.', price: 4200, category: 'mom', imageEmoji: '🌺', tag: 'Recovery', ingredients: 'Witch Hazel, Magnesium, Calendula' },
    { id: 'mom-journal', name: 'Linen Baby Memory Journal', description: 'Stone-washed linen cover, gilded pages. Guided prompts for first-year milestones. A letter to the future.', price: 3400, category: 'mom', imageEmoji: '📖', tag: 'Keepsake', ingredients: 'Linen, Acid-Free Paper' },
    { id: 'mom-silk', name: 'Silk Nursing Scarf', description: 'Mulberry silk in a soft blush. Doubles as a nursing cover and elegant wrap. Machine washable, wrinkle-resistant.', price: 4600, category: 'mom', imageEmoji: '🎀', tag: 'Mulberry Silk', ingredients: '100% Mulberry Silk' },
  ],
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  swaddle: 'Swaddle & Blanket',
  garment: 'Baby Garment',
  bath: 'Bath & Skincare',
  keepsake: 'Keepsake & Toy',
  mom: "Mama's Gift",
}

export const CATEGORY_LABELS_ES: Record<ProductCategory, string> = {
  swaddle: 'Muselinas y mantas',
  garment: 'Ropita',
  bath: 'Baño y cuidado',
  keepsake: 'Recuerdos y juguetes',
  mom: 'Para mamá',
}

export const CATEGORY_ORDER: ProductCategory[] = ['swaddle', 'garment', 'bath', 'keepsake', 'mom']
export const BOX_BASE_PRICE = 1500

// Real per-box packaging cost (owner-stated): seagrass basket $5 + mailer $3
// + shredded kraft $0.50. Used by the portal box editor's cost panel.
export const BOX_PACKAGING_COST = 850

export const SHIPPING = {
  standard: { label: 'Standard Shipping', price: 1200, days: '5–7 business days' },
  premium: { label: 'Premium Rush Shipping', price: 2800, days: '1–2 business days', badge: 'Arrives Fast' },
}

// Free STANDARD shipping once the merchandise total (box base + items) reaches
// this many USD cents. NEXT_PUBLIC_ so the cart drawer, checkout page, and the
// checkout session API all read the same number. Premium rush stays paid.
export const FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || 10000)

// USD-only for now: the threshold is a USD amount and non-USD markets have
// their own per-currency shipping prices in lib/pricing.ts.
export function freeShippingApplies(merchandiseTotal: number, shippingType: keyof typeof SHIPPING, currency: string = 'USD') {
  return currency === 'USD' && shippingType === 'standard' && merchandiseTotal >= FREE_SHIPPING_THRESHOLD
}

export const FEATURED_IDS = [
  'swaddle-muslin',
  'swaddle-bamboo',
  'garment-romper',
  'garment-kimono',
  'bath-botanical',
  'keepsake-bunny',
]

export function getAllProducts(): Product[] {
  return Object.values(PRODUCTS).flat()
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((p) => p.id === id)
}
