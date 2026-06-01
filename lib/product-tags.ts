import { getAllProducts } from './products'

export function getProductTags(): string[] {
  const tags = new Set<string>()
  getAllProducts().forEach(product => {
    if (product.tag) tags.add(product.tag)
  })
  return Array.from(tags).sort()
}

export const PRODUCT_TAGS = [
  'Artisan Made',
  'Bath Ritual',
  'Bestseller',
  'Dermatologist Tested',
  'Eczema Safe',
  'First Memory',
  'For Mama',
  'Gift Favorite',
  'Handknit',
  'Handmade',
  'Hand Knit',
  'Heirloom',
  'Lactation Support',
  'Linen',
  'Lightweight',
  'Mom Approved',
  'Mulberry Silk',
  'Nighttime Hero',
  'Nursery Essential',
  'Personalized',
  'Plush',
  'Pure & Natural',
  'Recovery',
  'Set of 3',
  'Silky Soft',
  'Skin-to-Skin',
  'Year Round',
] as const
