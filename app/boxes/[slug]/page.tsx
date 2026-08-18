import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { BoxBuyPanel } from '@/components/ui/BoxBuyPanel'
import { BoxGallery } from '@/components/ui/BoxGallery'
import { ReviewSection } from '@/components/ui/ReviewSection'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { boxSlotKey } from '@/lib/image-slots'
import { getBoxProduct, getItemSizeOptions, pieceCount, priceRange } from '@/lib/catalog-db'
import { CATEGORY_LABELS, CATEGORY_LABELS_ES, formatDollars } from '@/lib/products'

// Phase 3 box product page — one data-driven template for every parent
// product. Variants live in a query param (?tier=/?theme=); canonical strips
// it so one URL per product indexes. Seasonally hidden (visible=false) keeps
// serving with noindex so the URL and its reviews persist off-season.
// force-dynamic: ISR + async DB params 500s unknown slugs (collections lesson).
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

type Params = Promise<{ slug: string }>
type Search = Promise<Record<string, string | string[] | undefined>>

interface Story {
  paragraphs?: string[]
  variant_stories?: Record<string, string>
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

const T = {
  en: {
    inside: "What's inside", color: 'your choice of color',
    card: 'Personalized card — hand-finished for every box, with your message',
    basket: 'Everything arrives nested in a woven seagrass basket with lid, ribbon-tied and sealed by hand.',
    faq: 'Frequently asked questions', prefer: 'Prefer to choose every piece yourself?', build: 'Build your own box',
    options: 'Options',
  },
  es: {
    inside: 'Qué contiene', color: 'el color lo eliges tú',
    card: 'Tarjeta personalizada — terminada a mano para cada canastilla, con tu mensaje',
    basket: 'Todo llega acomodado en una canasta tejida de fibra marina con tapa, atada con listón y sellada a mano.',
    faq: 'Preguntas frecuentes', prefer: '¿Prefieres elegir cada pieza?', build: 'Arma tu propia canastilla',
    options: 'Opciones',
  },
} as const
const VARIANT_LABEL_ES: Record<string, string> = { Tier: 'Nivel', Theme: 'Tema', Set: 'Set' }

export async function BoxProductView({ params, searchParams, locale = 'en' }: { params: Params; searchParams: Search; locale?: 'en' | 'es' }) {
  const t = T[locale]
  const isEs = locale === 'es'
  const { slug } = await params
  const box = await getBoxProduct(slug)
  if (!box) notFound()

  const sp = await searchParams
  const requested = typeof sp[box.variantParam] === 'string' ? sp[box.variantParam] as string : ''
  const variant = box.variants.find(v => v.key === requested) ?? box.variants[0]
  const { low, high } = priceRange(box)
  const url = `${BASE}/boxes/${box.slug}`
  const story = (box.story ?? {}) as Story
  const crossSell = (story.cross_sell ?? []).slice(0, 3)
  // Per-size stock for sized items (garments) — drives the size chips.
  const sizesByItem = await getItemSizeOptions(
    variant.contents.filter(c => (c.item as { has_variants?: boolean }).has_variants).map(c => c.item.id)
  )

  // Approved reviews (pooled per box, §47) feed the Product JSON-LD:
  // aggregateRating + up to 10 review objects, emitted ONLY when at least one
  // approved review exists. Incentivized reviews are excluded here for the
  // same reason they're excluded from the Google review feed (reward-based
  // exclusion, never star-based). Fail-soft: a DB hiccup drops the fields,
  // never the page.
  let reviewLd: Record<string, unknown> = {}
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin
      .from('reviews')
      .select('customer_name, rating, body, created_at, incentivized')
      .eq('product_id', `box-${box.slug}`)
      .eq('approved', true)
      .order('created_at', { ascending: false })
    const rs = ((data ?? []) as Array<{ customer_name: string; rating: number; body: string; created_at: string; incentivized?: boolean }>)
      .filter(r => !r.incentivized && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5)
    if (rs.length > 0) {
      const avg = rs.reduce((s, r) => s + r.rating, 0) / rs.length
      reviewLd = {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: (Math.round(avg * 10) / 10).toString(),
          reviewCount: rs.length,
          bestRating: '5',
          worstRating: '1',
        },
        review: rs.slice(0, 10).map(r => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r.customer_name || 'Verified customer' },
          datePublished: (r.created_at ?? '').slice(0, 10),
          reviewRating: { '@type': 'Rating', ratingValue: r.rating.toString(), bestRating: '5', worstRating: '1' },
          reviewBody: (r.body ?? '').slice(0, 1500),
        })),
      }
    }
  } catch { /* fields omitted */ }

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: box.name,
        description: box.subtitle || box.name,
        ...(variant.images[0] ? { image: variant.images } : {}),
        brand: { '@type': 'Brand', name: 'Petite Lavande' },
        sku: box.slug,
        mpn: box.slug,
        offers: low === high
          ? { '@type': 'Offer', price: (low / 100).toFixed(2), priceCurrency: 'USD', url, availability: 'https://schema.org/InStock' }
          : { '@type': 'AggregateOffer', lowPrice: (low / 100).toFixed(2), highPrice: (high / 100).toFixed(2), priceCurrency: 'USD', offerCount: box.variants.length, url },
        ...reviewLd,
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
      <main className="bg-white min-h-screen">
        {/* Optional per-box background (Portal → Site Images → Box Pages).
            Viewport-anchored so a long page doesn't stretch the photo; the
            scrim keeps the product copy readable and is tunable per box. */}
        <SlotBackground slotKey={boxSlotKey(box.slug)} scrim="bg-white/88" attach="fixed">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* 1 — Gallery: the selected variant's set only */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <BoxGallery images={variant.images} alt={`${box.name} — ${variant.label}`} />
            </div>

            {/* 2 — Buy panel */}
            <div>
              <h1 className="font-serif text-4xl text-espresso">{box.name}</h1>
              <p className="font-sans text-[13px] tracking-[0.08em] text-bark-500 mt-2">
                {pieceCount(variant)} {isEs ? 'piezas, empacadas a mano' : 'pieces, hand-packed'}
              </p>
              <p className="font-sans text-2xl text-espresso mt-4">{formatDollars(variant.price)}</p>

              {box.variants.length > 1 && (
                <div className="mt-6">
                  <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">{(isEs ? VARIANT_LABEL_ES[box.variantLabel] ?? box.variantLabel : box.variantLabel) || t.options}</p>
                  <div className="flex flex-wrap gap-2">
                    {box.variants.map(v => (
                      <Link
                        key={v.key}
                        href={`${isEs ? '/es/canastillas' : '/boxes'}/${box.slug}?${box.variantParam}=${encodeURIComponent(v.key)}`}
                        className={`flex items-center gap-2 font-sans text-[11px] tracking-[0.11em] uppercase border transition-colors ${
                          v.images[0] ? 'p-1.5 pr-3' : 'px-4 py-2'
                        } ${v.key === variant.key ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-500 hover:border-espresso-light'}`}
                      >
                        {v.images[0] && (
                          <span className="relative w-9 h-9 shrink-0 overflow-hidden">
                            <Image src={v.images[0]} alt={`${box.name} — ${v.label} option`} fill className="object-cover" />
                          </span>
                        )}
                        {v.label} · {formatDollars(v.price)}
                      </Link>
                    ))}
                  </div>
                  {variant.adds && <p className="font-sans text-xs text-bark-400 mt-3">{variant.adds}</p>}
                </div>
              )}

              {/* The per-variant italic story was removed from the buy column
                  (Emily 2026-08-17). The copy still lives in the box's `story`
                  JSON, so it can be restored by re-rendering
                  story.variant_stories[variant.key] here. */}

              <div className="mt-8">
                <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-3">{t.inside}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                  {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>)
                    .map(cat => ({ cat, items: variant.contents.filter(c => c.item.category === cat) }))
                    .filter(g => g.items.length > 0)
                    .map(g => (
                      <div key={g.cat}>
                        <p className="font-sans text-[10px] tracking-[0.18em] uppercase text-bark-300 mb-2">{(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[g.cat]}</p>
                        <ul className="space-y-2">
                          {g.items.map(c => (
                            <li key={c.item.id} className="flex items-center gap-3 border-b border-cream-200 pb-2">
                              {c.item.image ? (
                                <span className="relative w-10 h-10 shrink-0 overflow-hidden border border-cream-200">
                                  <Image src={c.item.image} alt={c.item.name} fill className="object-cover" />
                                </span>
                              ) : (
                                <span className="w-10 h-10 shrink-0 border border-dashed border-cream-300 bg-cream-100" />
                              )}
                              <span className="font-sans text-sm text-bark-600">
                                {c.qty > 1 ? `${c.qty} × ` : ''}{c.item.name}
                                {c.item.id === 'swaddle-botanical-bath-melt-set' && (
                                  <span className="text-bark-400"> ({c.pieces ?? 5} {isEs ? 'bombas de baño' : 'bath bombs'})</span>
                                )}
                                {c.colorChoice ? ` — ${t.color}` : ''}
                                {(c.item as { organic?: boolean }).organic && (
                                  <span className="ml-2 font-sans text-[11px] tracking-[0.12em] uppercase border border-[#7A8E7C] text-[#7A8E7C] px-1.5 py-0.5 align-middle">{isEs ? 'orgánico' : 'organic'}</span>
                                )}
                              </span>
                              {c.note && <span className="font-sans text-xs text-bark-400">{c.note}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
                <p className="font-sans text-sm text-bark-600 mt-4">{t.card}</p>
                <p className="font-sans text-xs text-bark-400 mt-3">{t.basket}</p>
              </div>

              <BoxBuyPanel
                contents={variant.contents.map(c => ({ item: c.item, qty: c.qty, colorChoice: c.colorChoice }))}
                price={variant.price}
                boxName={box.name}
                boxSlug={box.slug}
                variantKey={variant.key}
                variantLabel={box.variants.length > 1 ? variant.label : undefined}
                needsColor={variant.contents.some(c => c.colorChoice)}
                sizesByItem={sizesByItem}
                boxImage={variant.images[0] ?? null}
              />

              <p className="font-sans text-sm text-bark-500 mt-6">
                <Link href="/faq" className="underline underline-offset-2 hover:text-bark-600">{t.faq}</Link>
              </p>

              <p className="font-sans text-sm text-bark-500 mt-3">
                {t.prefer} <Link href={isEs ? '/es/build' : '/build'} className="underline hover:text-bark-600">{t.build}</Link>.
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
                        <Image src={s.image} alt={s.title} fill className="object-cover" />
                      </div>
                    )}
                    <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-1">{i + 1} — {s.title}</p>
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
                <Image src={story.comparison_image} alt={`${box.name} — all ${box.variantLabel.toLowerCase()}s compared at relative scale`} fill className="object-contain" />
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
                        <Image src={c.image} alt={c.label} fill className="object-cover" />
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

        </div>
        </SlotBackground>
      </main>
      <Footer />
    </>
  )
}

export default async function BoxProductPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return BoxProductView({ params, searchParams, locale: 'en' })
}
