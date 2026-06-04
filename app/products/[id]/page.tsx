import type { Metadata } from 'next'
import { getCatalogProduct } from '@/lib/products-db'
import { CATEGORY_LABELS } from '@/lib/products'
import { JsonLd } from '@/components/ui/JsonLd'
import ProductDetailClient from './ProductDetailClient'

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
  // Derived from product data; owner can supply dedicated SEO copy later (TODO)
  const description = (p.description || `${p.name} — a premium organic baby gift from Petite Lavande.`).slice(0, 160)
  const img = productImage(p)
  return {
    title: p.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${p.name} | Petite Lavande`,
      description,
      url,
      type: 'website',
      images: img ? [{ url: img, width: 1200, height: 1600, alt: p.name }] : undefined,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getCatalogProduct(id)
  const url = `${BASE}/products/${id}`

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
              availability: p.active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              url,
            },
            // No aggregateRating until real reviews exist (Google policy)
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
        </>
      )}
      <ProductDetailClient />
    </>
  )
}
