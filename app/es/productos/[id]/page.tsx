import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/ui/JsonLd'
import { getCatalogProduct, getProductStock } from '@/lib/products-db'
import { getTranslations } from '@/lib/i18n'

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
  return {
    title: p.name,
    description: (es.description ?? p.description ?? '').slice(0, 155),
    alternates: { canonical: `/es/productos/${id}` },
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

  return (
    <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
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
      <div className="flex flex-col md:flex-row gap-10 items-start">
        <div className="w-full md:w-[45%] shrink-0">
          <div className="aspect-square overflow-hidden border border-cream-300 bg-cream-50">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-7xl">{p.imageEmoji}</div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 mb-2">{CATEGORY_ES[p.category] ?? p.category}</p>
          <h1 className="font-playfair text-3xl text-espresso leading-tight mb-2">{p.name}</h1>
          <p className="font-sans text-base text-bark-400 mb-5">${(p.price / 100).toFixed(2)}</p>
          {!inStock && (
            <span className="inline-block bg-cream-200 text-bark-400 font-sans text-[10px] tracking-[0.15em] uppercase font-bold px-2.5 py-1 mb-4">Agotado</span>
          )}
          <p className="font-sans text-[14px] leading-[1.8] text-espresso-light mb-7 whitespace-pre-wrap">{description}</p>
          <Link href="/build" className="inline-block bg-[#7A8E7C] text-white font-sans text-[12px] tracking-[0.2em] uppercase py-4 px-9 hover:bg-[#6b7d6d] transition-colors">
            Agregar a tu canastilla
          </Link>
          <p className="font-sans text-[11px] text-bark-400 mt-3">El armado de la canastilla continúa en inglés por ahora.</p>
        </div>
      </div>
    </div>
  )
}
