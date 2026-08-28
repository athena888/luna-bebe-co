import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { BoxBuyPanel } from '@/components/ui/BoxBuyPanel'
import { BoxGallery } from '@/components/ui/BoxGallery'
import { BoxVariantPills } from '@/components/ui/BoxVariantPills'
import { BoxItemModalTrigger } from '@/components/ui/BoxItemModal'
import { ReviewSection } from '@/components/ui/ReviewSection'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { TrackViewItem } from '@/components/ui/TrackViewItem'
import { boxSlotKey } from '@/lib/image-slots'
import { isShoppingOnly } from '@/lib/catalog-visibility'
import { SPANISH_ACTIVE, getTranslations } from '@/lib/i18n'
import { localePath } from '@/lib/locale-routes'
import { ReviewSummary } from '@/components/ui/ReviewSummary'
import { getBoxProduct, getItemSizeOptions, pieceCount, piecesPerItem, priceRange } from '@/lib/catalog-db'
import { CATEGORY_LABELS, CATEGORY_LABELS_ES, FREE_SHIPPING_THRESHOLD, formatDollars, freeShippingApplies } from '@/lib/products'

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
    alternates: {
      canonical: `${BASE}/boxes/${slug}`,
      // The /es twin declared this pair but the English side did not, and
      // hreflang is discarded unless BOTH sides confirm it — so box pages had
      // no locale pairing at all.
      ...(SPANISH_ACTIVE
        ? { languages: { en: `${BASE}/boxes/${slug}`, 'es-US': `${BASE}/es/canastillas/${slug}`, 'x-default': `${BASE}/boxes/${slug}` } }
        : {}),
    },
    openGraph: {
      title: `${box.name} | Petite Lavande`,
      description: box.subtitle || box.name,
      url: `${BASE}/boxes/${slug}`,
      type: 'website',
      ...(box.variants[0]?.images[0] ? { images: [{ url: box.variants[0].images[0], alt: box.name }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
    // Seasonally hidden boxes keep their route but leave the index; so do
    // Shopping-only boxes, which exist purely as an ad landing page.
    ...(box.visible && !isShoppingOnly(slug) ? {} : { robots: { index: false, follow: true } }),
  }
}

const T = {
  en: {
    inside: "What's inside", color: 'your choice of color',
    card: 'Personalized card — hand-finished for every box, with your message',
    basket: 'Everything arrives nested in a woven seagrass basket with lid, ribbon-tied and sealed by hand.',
    faq: 'Frequently asked questions', prefer: 'Prefer to choose every piece yourself?', build: 'Build your own box',
    options: 'Options',
    // Above-the-fold value proposition: what this is, in one line, before the
    // contents list a cold visitor has no reason to read yet.
    promise: 'A complete baby gift, ready to give.',
    benefits: {
      essentials: 'Thoughtfully selected baby essentials',
      basket: 'Gift-ready woven basket',
      card: 'Personalized gift card included',
      shipping: 'Free standard shipping',
      shippingOver: (over: string) => `Free standard shipping over ${over}`,
    },
    pieces: (n: number) => `${n} pieces`,
  },
  es: {
    inside: 'Qué contiene', color: 'el color lo eliges tú',
    card: 'Tarjeta personalizada — terminada a mano para cada canastilla, con tu mensaje',
    basket: 'Todo llega acomodado en una canasta tejida de fibra marina con tapa, atada con listón y sellada a mano.',
    faq: 'Preguntas frecuentes', prefer: '¿Prefieres elegir cada pieza?', build: 'Arma tu propia canastilla',
    options: 'Opciones',
    promise: 'Un regalo de bebé completo, listo para dar.',
    benefits: {
      essentials: 'Esenciales de bebé elegidos con cuidado',
      basket: 'Canasta tejida lista para regalar',
      card: 'Tarjeta personalizada incluida',
      shipping: 'Envío estándar gratis',
      shippingOver: (over: string) => `Envío estándar gratis desde ${over}`,
    },
    pieces: (n: number) => `${n} piezas`,
  },
} as const
const VARIANT_LABEL_ES: Record<string, string> = { Tier: 'Nivel', Theme: 'Tema', Set: 'Set' }

export async function BoxProductView({ params, searchParams, locale = 'en' }: { params: Params; searchParams: Search; locale?: 'en' | 'es' }) {
  const t = T[locale]
  const isEs = locale === 'es'
  const { slug } = await params
  const box = await getBoxProduct(slug)
  if (!box) notFound()

  // Spanish pages must carry Spanish PRODUCT copy, not just Spanish chrome.
  // Until now /es/canastillas rendered the English name and the French
  // subtitle, so the page was a near-duplicate of its English twin — and a
  // Merchant feed row submitted with content_language=es whose landing page
  // reads English is disapproved outright. The copy comes from the same
  // `translations` rows lib/google-feed-es.ts reads, so the page and the feed
  // cannot drift apart. Mutating the record is safe: getBoxProduct returns a
  // fresh object per request (these routes are force-dynamic), and doing it
  // here localises all thirteen downstream uses at once.
  if (isEs) {
    const es = (await getTranslations('catalog_product', [box.slug])).get(box.slug)
    if (es?.name) box.name = es.name
    if (es?.subtitle) box.subtitle = es.subtitle
  }

  const sp = await searchParams
  const requested = typeof sp[box.variantParam] === 'string' ? sp[box.variantParam] as string : ''
  const variant = box.variants.find(v => v.key === requested) ?? box.variants[0]
  const { low, high } = priceRange(box)
  // Locale-aware: the Spanish page used to advertise the English URL in its
  // Product offer and its breadcrumbs, which invites Google to treat /es/ as a
  // duplicate of /boxes/ rather than its own indexable page.
  const url = `${BASE}${isEs ? '/es/canastillas' : '/boxes'}/${box.slug}`
  const story = (box.story ?? {}) as Story
  const crossSell = (story.cross_sell ?? []).slice(0, 3)
  // Per-size stock for sized items (garments) — drives the size chips.
  const sizesByItem = await getItemSizeOptions(
    variant.contents.filter(c => (c.item as { has_variants?: boolean }).has_variants).map(c => c.item.id)
  )

  const pieces = pieceCount(variant)
  // Two tiers at $85 and one at $65 read as if the COLOUR set the price. It
  // does not — the tiers hold different amounts — so every option card carries
  // a one-line reason. The reason is DERIVED, never written here: the piece
  // count when the tiers actually differ in size, otherwise the variant's own
  // `adds` copy from the catalog. When neither distinguishes them (same count,
  // no copy), the cards stay as they were rather than saying something untrue.
  const variantPieces = new Map(box.variants.map(v => [v.key, pieceCount(v)]))
  const piecesDiffer = new Set(variantPieces.values()).size > 1
  const variantSub = (v: typeof variant): string | undefined =>
    piecesDiffer ? t.pieces(variantPieces.get(v.key) ?? pieceCount(v)) : (v.adds || undefined)
  // This box's own price already clears the free-standard-shipping bar, or it
  // doesn't and the benefit line says what it would take. One constant
  // (lib/products), never a hardcoded promise.
  const shipsFree = freeShippingApplies(variant.price, 'standard')

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
          // availability belongs on BOTH shapes: without it Google reads a
          // multi-variant box as having unknown stock, and the merchant feed
          // says in_stock for the same offer — a mismatch it can flag.
          : { '@type': 'AggregateOffer', lowPrice: (low / 100).toFixed(2), highPrice: (high / 100).toFixed(2), priceCurrency: 'USD', offerCount: box.variants.length, url, availability: 'https://schema.org/InStock' },
        ...reviewLd,
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: isEs ? 'Inicio' : 'Home', item: isEs ? BASE + '/es' : BASE },
          { '@type': 'ListItem', position: 2, name: isEs ? 'Canastillas' : 'Gift Boxes', item: BASE + (isEs ? '/es/canastillas' : '/boxes') },
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
            {/* 1 — Gallery: every variant's photos appended into one swipeable
                strip (starting on the selected variant); the variant pills
                below highlight whichever variant's photo is on screen. */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <BoxGallery
                images={box.variants.flatMap(v => v.images.map(src => ({ src, variantKey: v.key, variantLabel: v.label })))}
                alt={box.name}
                startKey={variant.key}
              />
            </div>

            {/* 2 — Buy panel. Phone order is deliberate and is the whole point
                of this column: name → rating → what it is → price → why it is
                worth it → the choices → Add to Cart. The contents list, which
                used to sit between the price and the button, now follows the
                CTA — a visitor arriving cold from Shopping or Instagram can
                decide before they ever scroll it. */}
            <div>
              <h1 className="font-serif text-4xl text-espresso">{box.name}</h1>

              {/* Social proof next to the price, not eight scrolls down. Real
                  average and count, or nothing at all — see ReviewSummary. */}
              <ReviewSummary productId={`box-${box.slug}`} className="mt-2" />

              <p className="font-sans text-[13px] tracking-[0.08em] text-bark-500 mt-2">
                {pieces} {isEs ? 'piezas, empacadas a mano' : 'pieces, hand-packed'}
              </p>
              <p className="font-sans text-2xl text-espresso mt-4">{formatDollars(variant.price)}</p>

              <p className="font-serif text-lg text-espresso-light mt-5">{t.promise}</p>
              <ul className="mt-3 space-y-1.5">
                {[
                  t.benefits.essentials,
                  t.benefits.basket,
                  t.benefits.card,
                  shipsFree ? t.benefits.shipping : t.benefits.shippingOver(formatDollars(FREE_SHIPPING_THRESHOLD)),
                ].map(line => (
                  <li key={line} className="flex items-start gap-2 font-sans text-[13px] leading-snug text-bark-600">
                    <span aria-hidden="true" className="text-[#7A8E7C] leading-none pt-[3px]">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {box.variants.length > 1 && (
                <div className="mt-6">
                  <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">{(isEs ? VARIANT_LABEL_ES[box.variantLabel] ?? box.variantLabel : box.variantLabel) || t.options}</p>
                  <BoxVariantPills
                    boxName={box.name}
                    selectedKey={variant.key}
                    variants={box.variants.map(v => ({
                      key: v.key,
                      label: v.label,
                      text: `${v.label} · ${formatDollars(v.price)}`,
                      sub: variantSub(v),
                      image: v.images[0] ?? null,
                      href: `${isEs ? '/es/canastillas' : '/boxes'}/${box.slug}?${box.variantParam}=${encodeURIComponent(v.key)}`,
                    }))}
                  />
                  {/* When the cards fall back to `adds` for their subtitle this
                      line would just repeat the selected one. */}
                  {piecesDiffer && variant.adds && <p className="font-sans text-xs text-bark-400 mt-3">{variant.adds}</p>}
                </div>
              )}

              {/* The per-variant italic story was removed from the buy column
                  (Emily 2026-08-17). The copy still lives in the box's `story`
                  JSON, so it can be restored by re-rendering
                  story.variant_stories[variant.key] here. */}

              {/* GA4 view_item / Meta ViewContent — boxes fired nothing before,
                  so the funnel showed no product views for the very products
                  the ads point at. Id matches the Merchant feed offer id. */}
              <TrackViewItem
                id={`box-${box.slug}--${variant.key}`}
                name={box.variants.length > 1 ? `${box.name} — ${variant.label}` : box.name}
                price={variant.price}
                category="Gift Box"
              />

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
                pieces={pieces}
              />

              {/* What's inside — the full contents list, now BELOW the
                  purchase CTA. Nothing was removed: a visitor who wants the
                  detail scrolls one screen for it, and one who was sold by
                  the photo and the price never has to. */}
              <div className="mt-8">
                <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-3">{t.inside}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                  {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>)
                    .map(cat => ({ cat, items: variant.contents.filter(c => c.item.category === cat) }))
                    .filter(g => g.items.length > 0)
                    .map(g => (
                      <div key={g.cat}>
                        {/* 2+ pieces in one category is ambiguous ("both, or pick
                            one?"). Contents are a flat include-list — no substitute
                            concept — so every piece IS included: say so. */}
                        <p className="font-sans text-[10px] tracking-[0.18em] uppercase text-bark-300 mb-2">
                          {(isEs ? CATEGORY_LABELS_ES : CATEGORY_LABELS)[g.cat]}
                          {g.items.length > 1 && (
                            <span className="text-bark-400/70"> · {isEs ? 'todo incluido' : 'all included'}</span>
                          )}
                        </p>
                        <ul className="space-y-2">
                          {g.items.map(c => (
                            <li key={c.item.id} className="border-b border-cream-200 pb-2">
                              {/* Whole row opens the same product-details modal
                                  the Build page uses (gallery, certs, story). */}
                              <BoxItemModalTrigger
                                isEs={isEs}
                                item={{
                                  id: c.item.id,
                                  name: c.item.name,
                                  price: c.item.price,
                                  category: c.item.category,
                                  image: c.item.image ?? null,
                                  imageEmoji: c.item.imageEmoji,
                                  organic: (c.item as { organic?: boolean }).organic,
                                }}
                                className="flex items-center gap-3 w-full text-left group cursor-pointer"
                              >
                              {c.item.image ? (
                                <span className="relative w-10 h-10 shrink-0 overflow-hidden border border-cream-200">
                                  <Image quality={88} src={c.item.image} alt={c.item.name} fill className="object-cover" />
                                </span>
                              ) : (
                                <span className="w-10 h-10 shrink-0 border border-dashed border-cream-300 bg-cream-100" />
                              )}
                              <span className="font-sans text-sm text-bark-600 group-hover:text-espresso transition-colors">
                                {c.qty > 1 || g.items.length > 1 ? `${c.qty} × ` : ''}{c.item.name}
                                {/* The heading counts PIECES, this list shows
                                    ITEMS, and a set counts as its pieces — so
                                    "12 pieces" over 10 rows looked like a bug.
                                    Both now read from the same piecesPerItem
                                    rule, and any multi-piece row says so. */}
                                {(() => {
                                  const per = c.pieces ?? piecesPerItem(c.item.id, c.item.name)
                                  if (c.item.id === 'swaddle-botanical-bath-melt-set') {
                                    return <span className="text-bark-400"> ({c.pieces ?? 5} {isEs ? 'bombas de baño' : 'bath bombs'})</span>
                                  }
                                  return per > 1
                                    ? <span className="text-bark-400"> ({per} {isEs ? 'piezas' : 'pieces'})</span>
                                    : null
                                })()}
                                {c.colorChoice ? ` — ${t.color}` : ''}
                                {(c.item as { organic?: boolean }).organic && (
                                  <span className="ml-2 font-sans text-[11px] tracking-[0.12em] uppercase border border-[#7A8E7C] text-[#7A8E7C] px-1.5 py-0.5 align-middle">{isEs ? 'orgánico' : 'organic'}</span>
                                )}
                              </span>
                              {c.note && <span className="font-sans text-xs text-bark-400">{c.note}</span>}
                              </BoxItemModalTrigger>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
                <p className="font-sans text-sm text-bark-600 mt-4">{t.card}</p>
                <p className="font-sans text-xs text-bark-400 mt-3">{t.basket}</p>
              </div>

              <p className="font-sans text-sm text-bark-500 mt-6">
                <Link href={localePath('/faq', isEs)} className="underline underline-offset-2 hover:text-bark-600">{t.faq}</Link>
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
                        <Image quality={88} src={s.image} alt={s.title} fill className="object-cover" />
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
                <Image quality={88} src={story.comparison_image} alt={`${box.name} — all ${box.variantLabel.toLowerCase()}s compared at relative scale`} fill className="object-contain" />
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
                        <Image quality={88} src={c.image} alt={c.label} fill className="object-cover" />
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
