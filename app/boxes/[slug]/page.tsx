import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { BoxBuyPanel } from '@/components/ui/BoxBuyPanel'
import { getBoxProduct, priceRange } from '@/lib/catalog-db'

// Phase 1 box product page — one server-rendered template for every parent
// product (Signature, La Collection, Mama, …). Variants live in a query param
// (?tier= / ?theme=); the canonical always strips it so exactly one URL per
// product indexes. Seasonally hidden products (visible=false) keep serving
// with noindex so the URL and its reviews survive off-season.
// force-dynamic on purpose: ISR + async DB generateStaticParams 500s unknown
// slugs (same lesson as /collections).
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

type Params = Promise<{ slug: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const box = await getBoxProduct(slug)
  if (!box) return { title: 'Not Found' }
  const { low, high } = priceRange(box)
  const priceText = low === high ? `$${low / 100}` : `$${low / 100}–$${high / 100}`
  return {
    title: `${box.name} — Baby Gift Box (${priceText})`,
    description: `${box.subtitle || box.name} — hand-packed organic gift box from Petite Lavande. ${box.variants.length} ${box.variantLabel.toLowerCase() || 'option'}${box.variants.length !== 1 ? 's' : ''}, ${priceText}.`,
    alternates: { canonical: `${BASE}/boxes/${slug}` },
    ...(box.visible ? {} : { robots: { index: false, follow: true } }),
  }
}

export default async function BoxProductPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params
  const box = await getBoxProduct(slug)
  if (!box) notFound()

  const sp = await searchParams
  const requested = typeof sp[box.variantParam] === 'string' ? sp[box.variantParam] as string : ''
  const variant = box.variants.find(v => v.key === requested) ?? box.variants[0]
  const { low, high } = priceRange(box)
  const url = `${BASE}/boxes/${box.slug}`
  const cover = variant.images[0]

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: box.name,
        description: box.subtitle || box.name,
        ...(cover ? { image: cover } : {}),
        brand: { '@type': 'Brand', name: 'Petite Lavande' },
        offers: low === high
          ? { '@type': 'Offer', price: (low / 100).toFixed(2), priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' }
          : { '@type': 'AggregateOffer', lowPrice: (low / 100).toFixed(2), highPrice: (high / 100).toFixed(2), priceCurrency: 'USD', offerCount: box.variants.length, url },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
          { '@type': 'ListItem', position: 2, name: 'Gift Boxes', item: `${BASE}/boxes` },
          { '@type': 'ListItem', position: 3, name: box.name, item: url },
        ],
      }} />
      <Header />
      <main className="bg-cream-50 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <nav className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-400 mb-8">
            <Link href="/" className="hover:text-bark-600">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/boxes" className="hover:text-bark-600">Gift Boxes</Link>
            <span className="mx-2">/</span>
            <span className="text-bark-600">{box.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="relative aspect-[4/3] bg-cream-200 border border-cream-300">
              {cover
                ? <Image src={cover} alt={`${box.name} — ${variant.label}`} fill className="object-cover" unoptimized />
                : <div className="absolute inset-0 flex items-center justify-center font-sans text-xs tracking-[0.2em] uppercase text-bark-300">Photography coming soon</div>}
            </div>

            <div>
              <h1 className="font-serif text-4xl text-espresso">{box.name}</h1>
              {box.subtitle && <p className="font-serif italic text-lg text-bark-400 mt-1">{box.subtitle}</p>}
              <p className="font-sans text-2xl text-espresso mt-4">${(variant.price / 100).toFixed(0)}</p>

              {box.variants.length > 1 && (
                <div className="mt-6">
                  <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">{box.variantLabel || 'Options'}</p>
                  <div className="flex flex-wrap gap-2">
                    {box.variants.map(v => (
                      <Link
                        key={v.key}
                        href={`${`/boxes/${box.slug}`}?${box.variantParam}=${encodeURIComponent(v.key)}`}
                        className={`font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                          v.key === variant.key ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-500 hover:border-espresso-light'
                        }`}
                      >
                        {v.label} · ${(v.price / 100).toFixed(0)}
                      </Link>
                    ))}
                  </div>
                  {variant.adds && (
                    <p className="font-sans text-xs text-bark-400 mt-3">{variant.adds}</p>
                  )}
                </div>
              )}

              <div className="mt-8">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">What&apos;s inside</p>
                <ul className="space-y-2.5">
                  {variant.contents.map(c => (
                    <li key={c.item.id} className="flex items-baseline gap-3 border-b border-cream-200 pb-2.5">
                      <span className="font-sans text-sm text-bark-600">
                        {c.qty > 1 ? `${c.qty} × ` : ''}{c.item.name}
                        {c.colorChoice ? ' — your choice of color' : ''}
                      </span>
                      {c.note && <span className="font-sans text-xs text-bark-400">{c.note}</span>}
                    </li>
                  ))}
                  <li className="flex items-baseline gap-3 pb-1">
                    <span className="font-sans text-sm text-bark-600">Personalized card — hand-finished for every box</span>
                  </li>
                </ul>
                {variant.basket && (
                  <p className="font-sans text-xs text-bark-400 mt-3">Woven basket, {variant.basket} cm — everything arrives nested, ribbon-tied, and sealed by hand.</p>
                )}
              </div>

              <BoxBuyPanel
                contents={variant.contents.map(c => ({ item: c.item, qty: c.qty, colorChoice: c.colorChoice }))}
                price={variant.price}
                boxName={box.name}
                needsColor={variant.contents.some(c => c.colorChoice)}
              />

              <p className="font-sans text-sm text-bark-500 mt-8">
                Prefer to choose every piece yourself? <Link href="/build" className="underline hover:text-bark-600">Build your own box</Link>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
