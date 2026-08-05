import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { BoxBuyPanel } from '@/components/ui/BoxBuyPanel'
import { BoxGallery } from '@/components/ui/BoxGallery'
import { OccasionCountdown } from '@/components/ui/OccasionCountdown'
import { ReviewSection } from '@/components/ui/ReviewSection'
import { getBoxProduct, getItemSizeOptions, priceRange } from '@/lib/catalog-db'

// Phase 3 box product page — one data-driven template for every parent
// product. Variants live in a query param (?tier=/?theme=); canonical strips
// it so one URL per product indexes. Seasonally hidden (visible=false) keeps
// serving with noindex so the URL and its reviews persist off-season.
// force-dynamic: ISR + async DB params 500s unknown slugs (collections lesson).
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

type Params = Promise<{ slug: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

// Rendered when a product has no FAQ rows of its own; FAQPage schema follows
// whichever set renders.
const DEFAULT_FAQS = [
  { q: 'Can I change what\'s inside?', a: 'Every piece is swappable — use Build Your Own Box to choose item by item, or note a swap at checkout and we\'ll accommodate where stock allows.' },
  { q: 'Is everything baby-safe?', a: 'Every textile is organic cotton from GOTS-certified makers, and every toy meets US safety standards for newborns. Safety notes for specific items appear on their product pages.' },
  { q: 'How fast does it ship?', a: 'Boxes are hand-packed and ship within 3 days. Add your occasion date above and we\'ll show you the order-by date.' },
  { q: 'Can I include a gift note?', a: 'Always — you\'ll write your message at checkout and we hand-finish a card for every box. If you add the recipient\'s email, they receive a digital note when the box ships.' },
]

interface Story {
  paragraphs?: string[]
  unboxing?: Array<{ title: string; text: string; image?: string }>
  comparison_image?: string
  cross_sell?: Array<{ label: string; sub?: string; href: string; image?: string }>
}

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
    openGraph: {
      title: `${box.name} | Petite Lavande`,
      description: box.subtitle || box.name,
      url: `${BASE}/boxes/${slug}`,
      type: 'website',
      ...(box.variants[0]?.images[0] ? { images: [{ url: box.variants[0].images[0], alt: box.name }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
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
  const story = (box.story ?? {}) as Story
  const faqs = box.faqs.length ? box.faqs : DEFAULT_FAQS
  const crossSell = (story.cross_sell ?? []).slice(0, 3)
  // Per-size stock for sized items (garments) — drives the size chips.
  const sizesByItem = await getItemSizeOptions(
    variant.contents.filter(c => (c.item as { has_variants?: boolean }).has_variants).map(c => c.item.id)
  )

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: box.name,
        description: box.subtitle || box.name,
        ...(variant.images[0] ? { image: variant.images } : {}),
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
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question', name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }} />
      <Header />
      <main className="bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <nav className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-400 mb-8">
            <Link href="/" className="hover:text-bark-600">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/boxes" className="hover:text-bark-600">Gift Boxes</Link>
            <span className="mx-2">/</span>
            <span className="text-bark-600">{box.name}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* 1 — Gallery: the selected variant's set only */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <BoxGallery images={variant.images} alt={`${box.name} — ${variant.label}`} />
            </div>

            {/* 2 — Buy panel */}
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
                        href={`/boxes/${box.slug}?${box.variantParam}=${encodeURIComponent(v.key)}`}
                        className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase border transition-colors ${
                          v.images[0] ? 'p-1.5 pr-3' : 'px-4 py-2'
                        } ${v.key === variant.key ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-500 hover:border-espresso-light'}`}
                      >
                        {v.images[0] && (
                          <span className="relative w-9 h-9 shrink-0 overflow-hidden">
                            <Image src={v.images[0]} alt="" fill className="object-cover" unoptimized />
                          </span>
                        )}
                        {v.label} · ${(v.price / 100).toFixed(0)}
                      </Link>
                    ))}
                  </div>
                  {variant.adds && <p className="font-sans text-xs text-bark-400 mt-3">{variant.adds}</p>}
                </div>
              )}

              <div className="mt-8">
                <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">What&apos;s inside</p>
                <ul className="space-y-2">
                  {variant.contents.map(c => (
                    <li key={c.item.id} className="flex items-center gap-3 border-b border-cream-200 pb-2">
                      {c.item.image ? (
                        <span className="relative w-10 h-10 shrink-0 overflow-hidden border border-cream-200">
                          <Image src={c.item.image} alt={c.item.name} fill className="object-cover" unoptimized />
                        </span>
                      ) : (
                        <span className="w-10 h-10 shrink-0 border border-dashed border-cream-300 bg-cream-100" />
                      )}
                      <span className="font-sans text-sm text-bark-600">
                        {c.qty > 1 ? `${c.qty} × ` : ''}{c.item.name}
                        {c.colorChoice ? ' — your choice of color' : ''}
                      </span>
                      {c.note && <span className="font-sans text-xs text-bark-400">{c.note}</span>}
                    </li>
                  ))}
                  <li className="flex items-center gap-3 pb-1">
                    <span className="w-10 h-10 shrink-0 border border-cream-200 bg-cream-100 flex items-center justify-center font-serif text-sm text-bark-400">✎</span>
                    <span className="font-sans text-sm text-bark-600">Personalized card — hand-finished for every box, with your message</span>
                  </li>
                </ul>
                <p className="font-sans text-xs text-bark-400 mt-3">Everything arrives nested in a woven seagrass basket with lid, ribbon-tied and sealed by hand.</p>
              </div>

              <OccasionCountdown />

              <BoxBuyPanel
                contents={variant.contents.map(c => ({ item: c.item, qty: c.qty, colorChoice: c.colorChoice }))}
                price={variant.price}
                boxName={box.name}
                needsColor={variant.contents.some(c => c.colorChoice)}
                sizesByItem={sizesByItem}
              />

              <p className="font-sans text-sm text-bark-500 mt-8">
                Prefer to choose every piece yourself? <Link href="/build" className="underline hover:text-bark-600">Build your own box</Link>.
              </p>
            </div>
          </div>

          {/* 3 — Story */}
          {(story.paragraphs?.length ?? 0) > 0 && (
            <section className="max-w-2xl mx-auto mt-16 pt-12 border-t border-cream-200">
              {story.paragraphs!.map((p, i) => (
                <p key={i} className="font-serif text-lg text-bark-600 leading-relaxed mb-5">{p}</p>
              ))}
            </section>
          )}

          {/* 4 — What she'll experience */}
          {(story.unboxing?.length ?? 0) > 0 && (
            <section className="mt-16 pt-12 border-t border-cream-200">
              <h2 className="font-serif text-2xl text-espresso mb-8 text-center">What she&apos;ll experience</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {story.unboxing!.map((s, i) => (
                  <div key={i}>
                    {s.image && (
                      <div className="relative aspect-square bg-cream-200 mb-3">
                        <Image src={s.image} alt={s.title} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-1">{i + 1} — {s.title}</p>
                    <p className="font-sans text-sm text-bark-500 leading-relaxed">{s.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tier comparison — the ONE allowed combined image */}
          {story.comparison_image && (
            <section className="mt-16">
              <div className="relative w-full aspect-[3/1] bg-cream-100">
                <Image src={story.comparison_image} alt={`${box.name} — all ${box.variantLabel.toLowerCase()}s compared at relative scale`} fill className="object-contain" unoptimized />
              </div>
            </section>
          )}

          {/* 5 — Reviews, pooled per product across variants */}
          <ReviewSection productId={`box-${box.slug}`} />

          {/* 6 — Cross-sell, one row, max 3 */}
          {crossSell.length > 0 && (
            <section className="mt-16 pt-12 border-t border-cream-200">
              <h2 className="font-serif text-2xl text-espresso mb-6">Pairs beautifully with</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {crossSell.map((c, i) => (
                  <Link key={i} href={c.href} className="group block border border-cream-300 hover:border-espresso-light transition-colors">
                    {c.image && (
                      <div className="relative aspect-[4/3] bg-cream-100">
                        <Image src={c.image} alt={c.label} fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-serif text-lg text-espresso">{c.label}</p>
                      {c.sub && <p className="font-sans text-xs text-bark-400 mt-1">{c.sub}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 7 — FAQ (schema above) */}
          <section className="max-w-2xl mx-auto mt-16 pt-12 border-t border-cream-200 pb-4">
            <h2 className="font-serif text-2xl text-espresso mb-6">Questions, answered</h2>
            <div className="space-y-6">
              {faqs.map((f, i) => (
                <div key={i}>
                  <p className="font-sans text-sm font-medium text-bark-600 mb-1.5">{f.q}</p>
                  <p className="font-sans text-sm text-bark-500 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
