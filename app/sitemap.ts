import type { MetadataRoute } from 'next'
import { getCatalog } from '@/lib/products-db'
import { LANDING_PAGES } from '@/lib/landing-pages'
import { getJournalPosts } from '@/lib/journal-db'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
  const now = new Date()

  const urls: MetadataRoute.Sitemap = [
    { url: base,                  lastModified: now, changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/build`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/boxes`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/journal`,     lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/story`,       lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/our-cotton`,  lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/gift-cards`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/corporate`,   lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/same-day-delivery`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/faq`,         lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/gift-guides`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/press`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/track`,       lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/terms`,   lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/legal/returns`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Search-intent landing pages
  for (const lp of LANDING_PAGES) {
    urls.push({ url: `${base}/gifts/${lp.slug}`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 })
  }
  // Box products (§46) — active AND visible only: seasonally hidden products
  // keep their route but leave the sitemap off-season.
  try {
    const { getBoxProducts } = await import('@/lib/catalog-db')
    for (const p of await getBoxProducts()) {
      urls.push({ url: `${base}/boxes/${p.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 })
    }
  } catch { /* §46 not run yet */ }
  // Collections — only active ones above their product threshold (the
  // empty-collection guard in lib/collections applies here too).
  try {
    const { getLiveCollections } = await import('@/lib/collections')
    for (const c of await getLiveCollections()) {
      urls.push({ url: `${base}/collections/${c.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 })
    }
  } catch { /* §42 not run yet */ }
  // Spanish locale — only when live, only pages with complete translations.
  try {
    const { SPANISH_ACTIVE, translationCoverage, ES_PRODUCT_REQUIRED } = await import('@/lib/i18n')
    if (SPANISH_ACTIVE) {
      urls.push({ url: `${base}/es`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })
      urls.push({ url: `${base}/es/legal/devoluciones`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 })
      urls.push({ url: `${base}/es/historia`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
      urls.push({ url: `${base}/es/canastillas`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })
      urls.push({ url: `${base}/es/tarjetas-regalo`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
      urls.push({ url: `${base}/es/build`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })
      urls.push({ url: `${base}/es/nuestro-algodon`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 })
      const { getLiveCollections } = await import('@/lib/collections')
      for (const c of await getLiveCollections()) {
        urls.push({ url: `${base}/es/colecciones/${c.slug}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 })
      }
      const products = await getCatalog({ activeOnly: true })
      const { complete } = await translationCoverage('product', ES_PRODUCT_REQUIRED, products.map(p => p.id))
      for (const id of complete) {
        urls.push({ url: `${base}/es/productos/${id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 })
      }
    }
  } catch { /* §44 not run yet */ }
  // Journal posts — DB-published posts merged over the built-in starters, so
  // portal-created posts get indexed too (fails soft to the starters).
  for (const post of await getJournalPosts()) {
    urls.push({ url: `${base}/journal/${post.slug}`, lastModified: new Date(post.date), changeFrequency: 'monthly', priority: 0.6 })
  }
  // Live product pages (best-effort)
  try {
    const products = await getCatalog({ activeOnly: true })
    for (const p of products) {
      urls.push({ url: `${base}/products/${p.id}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 })
    }
  } catch { /* sitemap still returns the static routes */ }
  return urls
}
