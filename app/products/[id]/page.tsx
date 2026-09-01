import type { Metadata } from 'next'
import { getCatalogProduct, getProductStock } from '@/lib/products-db'
import { CATEGORY_LABELS } from '@/lib/products'
import { JsonLd } from '@/components/ui/JsonLd'
import { SPANISH_ACTIVE, esProductComplete } from '@/lib/i18n'
import { conflictsWithReturnsPolicy } from '@/lib/site-config'
import ProductDetailClient from './ProductDetailClient'
import { getCatalog } from '@/lib/products-db'
import type { RelatedItem } from '@/components/ui/RelatedProducts'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

function productImage(p: { id: string; image?: string | null }) {
  return p.image || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : '')
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const p = await getCatalogProduct(id)
  if (!p) return { title: 'Product Not Found' }
  const url = `${BASE}/products/${id}`
  // Prefer the owner/AI SEO title + meta; fall back to product data.
  // seo_title is a complete tag → use absolute so the "| Petite Lavande" template doesn't double up.
  const description = (p.seo_description || p.description || `${p.name} — a premium organic baby gift from Petite Lavande.`).slice(0, 155)
  const img = productImage(p)
  // Only claim a Spanish alternate once that page is actually translated —
  // otherwise /es/productos/<id> serves English copy and the pair is a
  // duplicate, not a locale variant. Same gate the sitemap applies.
  const esLive = SPANISH_ACTIVE && await esProductComplete(id)
  return {
    // Names that already carry the brand skip the "| Petite Lavande" template
    // suffix (Bing "title too long": brand doubled to 73 chars on such names).
    title: p.seo_title ? { absolute: p.seo_title } : /petite lavande/i.test(p.name) ? { absolute: p.name } : p.name,
    description,
    alternates: {
      canonical: url,
      ...(esLive ? { languages: { en: url, 'es-US': `${BASE}/es/productos/${id}`, 'x-default': url } } : {}),
    },
    openGraph: {
      title: `${p.name} | Petite Lavande`,
      description,
      url,
      type: 'website',
      images: img ? [{ url: img, width: 1200, height: 1600, alt: p.name }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
    // Product/price tags so Pinterest can build Product Rich Pins (and other
    // crawlers can read price + availability).
    other: {
      'og:type': 'product',
      'product:price:amount': (p.price / 100).toFixed(2),
      'product:price:currency': 'USD',
      'product:availability': p.active ? 'in stock' : 'out of stock',
      'og:price:amount': (p.price / 100).toFixed(2),
      'og:price:currency': 'USD',
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getCatalogProduct(id)
  const url = `${BASE}/products/${id}`

  // Stored FAQs, minus any answer that contradicts the returns policy — see
  // the FAQPage block below for why this is filtered here and nowhere else.
  const policyFaqs = (Array.isArray(p?.faqs) ? p.faqs : [])
    .filter(f => f && !conflictsWithReturnsPolicy(`${f.q ?? ''} ${f.a ?? ''}`))

  // Availability from live stock, not just the active flag: an active-but-sold-
  // out product should render OutOfStock. Unknown stock (null) → trust `active`.
  const stock = p ? await getProductStock(p.id, p.has_variants) : null
  const inStock = !!p?.active && (stock == null ? true : stock > 0)

  // Approved reviews → aggregateRating + review structured data (Build 20).
  // Emitted ONLY when real reviews exist (Google policy); fails soft.
  let reviewStats: { avg: number; count: number; latest: Array<{ author: string; rating: number; body: string; date: string }> } | null = null
  if (p) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase')
      const { data: reviews } = await supabaseAdmin
        .from('reviews')
        .select('customer_name, rating, body, created_at')
        .eq('product_id', p.id).eq('approved', true)
        .order('created_at', { ascending: false })
      if (reviews?.length) {
        reviewStats = {
          avg: Math.round((reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length) * 10) / 10,
          count: reviews.length,
          latest: reviews.slice(0, 5).map(r => ({
            author: r.customer_name || 'Verified customer',
            rating: r.rating ?? 5,
            body: (r.body || '').slice(0, 500),
            date: (r.created_at || '').slice(0, 10),
          })),
        }
      }
    } catch { /* schema simply omits ratings */ }
  }

  // Related cross-links (same category first, topped up from the catalog) —
  // rendered by ProductDetailClient above its footer. Best-effort.
  let related: RelatedItem[] = []
  if (p) {
    try {
      const catalog = await getCatalog({ activeOnly: true })
      const same = catalog.filter(x => x.id !== p.id && x.category === p.category)
      const rest = catalog.filter(x => x.id !== p.id && x.category !== p.category)
      related = [...same, ...rest].slice(0, 3).map(x => ({ id: x.id, name: x.name, price: x.price, image: productImage(x) }))
    } catch { /* page renders without cross-links */ }
  }

  return (
    <>
      {p && (
        <>
          <JsonLd data={{
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name,
            image: productImage(p) ? [productImage(p)] : undefined,
            description: p.description || '',
            brand: { '@type': 'Brand', name: 'Petite Lavande' },
            category: CATEGORY_LABELS[p.category] || p.category,
            offers: {
              '@type': 'Offer',
              price: (p.price / 100).toFixed(2),
              priceCurrency: 'USD',
              availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url,
            },
            // aggregateRating/review appear only once real approved
            // reviews exist (Google policy — never emit empty ratings).
            ...(reviewStats ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: reviewStats.avg,
                reviewCount: reviewStats.count,
                bestRating: 5,
                worstRating: 1,
              },
              review: reviewStats.latest.map(r => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: r.author },
                reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
                reviewBody: r.body,
                datePublished: r.date,
              })),
            } : {}),
          }} />
          <JsonLd data={{
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
              { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS[p.category] || p.category, item: `${BASE}/build` },
              { '@type': 'ListItem', position: 3, name: p.name, item: url },
            ],
          }} />
          {/* Product FAQs live in the database and reach Google ONLY through
              this block — nothing renders them on the page. That makes it the
              one place a stored answer can promise something /legal/returns
              does not ("returnable within 30 days", "free returns"), and the
              landing page Google compares against a Merchant return policy of
              "defective products only". Such an answer is dropped from the
              structured data rather than published; the row still needs
              fixing in the portal, and `npm run check:copy` lists them. */}
          {policyFaqs.length > 0 && (
            <JsonLd data={{
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: policyFaqs.map(f => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }} />
          )}
        </>
      )}
      <ProductDetailClient related={related} initialProduct={p as import('@/types').Product} />
    </>
  )
}
