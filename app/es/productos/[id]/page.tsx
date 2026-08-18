import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/ui/JsonLd'
import ProductDetailClient from '@/app/products/[id]/ProductDetailClient'
import { getCatalog, getCatalogProduct, getProductStock } from '@/lib/products-db'
import { getTranslations, ES_PRODUCT_REQUIRED } from '@/lib/i18n'
import type { RelatedItem } from '@/components/ui/RelatedProducts'

export const dynamic = 'force-dynamic'

// Spanish product pages. Names stay EN/FR (they are the brand); descriptions
// come from the approved translations layer with English fallback. The CTA
// hands off to the (English) builder for now — checkout strings translate in
// a later phase.

const BASE = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')

const CATEGORY_ES: Record<string, string> = {
  swaddle: 'Muselinas y mantas',
  garment: 'Ropita',
  bath: 'Baño y cuidado',
  keepsake: 'Recuerdos',
  mom: 'Para mamá',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = await getCatalogProduct(id)
  if (!p || !p.active) return {}
  const es = (await getTranslations('product', [id])).get(id) ?? {}
  // Below the translation bar this route still renders (the description falls
  // back to English), but it must not advertise itself as the es-US alternate
  // or get indexed — that would put a near-duplicate of the English page on a
  // Spanish URL. Same gate the sitemap applies.
  const translated = ES_PRODUCT_REQUIRED.every(f => es[f])
  return {
    // Skip the "| Petite Lavande" template suffix when the name already
    // carries the brand (same doubled-title fix as the EN page).
    title: /petite lavande/i.test(p.name) ? { absolute: p.name } : p.name,
    description: (es.description ?? p.description ?? '').slice(0, 155),
    ...(translated ? {} : { robots: { index: false, follow: true } }),
    alternates: {
      canonical: `/es/productos/${id}`,
      ...(translated
        ? { languages: { en: `/products/${id}`, 'es-US': `/es/productos/${id}`, 'x-default': `/products/${id}` } } : {}),
    },
  }
}

export default async function EsProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getCatalogProduct(id)
  if (!p || !p.active) notFound()
  const es = (await getTranslations('product', [id])).get(id) ?? {}
  const stock = await getProductStock(id, p.has_variants)
  const inStock = stock == null ? true : stock > 0
  const description = es.description ?? p.description ?? ''

  let related: RelatedItem[] = []
  try {
    const catalog = await getCatalog({ activeOnly: true })
    const same = catalog.filter(x => x.id !== p.id && x.category === p.category)
    const rest = catalog.filter(x => x.id !== p.id && x.category !== p.category)
    related = [...same, ...rest].slice(0, 3).filter(x => x.image).map(x => ({ id: x.id, name: x.name, price: x.price, image: x.image! }))
  } catch { /* page renders without cross-links */ }

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: p.name,
        image: p.image ? [p.image] : undefined,
        description,
        inLanguage: 'es-US',
        brand: { '@type': 'Brand', name: 'Petite Lavande' },
        offers: {
          '@type': 'Offer',
          price: (p.price / 100).toFixed(2),
          priceCurrency: 'USD',
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url: `${BASE}/es/productos/${id}`,
        },
      }} />
      {/* initialProduct = full SSR (name/h1/price in the HTML) — without it the
          server renders only the loading spinner and crawlers see no content
          (same Phase 8 lesson as the EN pages; Bing flagged missing H1s). */}
      <ProductDetailClient related={related} locale="es" initialProduct={p} />
    </>
  )
}
