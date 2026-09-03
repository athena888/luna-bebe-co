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
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { TrackViewItem } from '@/components/ui/TrackViewItem'
import { boxSlotKey } from '@/lib/image-slots'
import { isShoppingOnly } from '@/lib/catalog-visibility'
import { SPANISH_ACTIVE, getTranslations } from '@/lib/i18n'
import { localePath } from '@/lib/locale-routes'
import { getBoxProduct, getItemSizeOptions, pieceCount, piecesPerItem, priceRange } from '@/lib/catalog-db'
import { bestForLabel } from '@/lib/gifting-copy'
import { MobileStickyPurchaseCTA } from '@/components/gifting/MobileStickyPurchaseCTA'
import { formatDollars, FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import { RETURNS_SUMMARY, RETURNS_SUMMARY_ES } from '@/lib/site-config'
import type { ProductCategory } from '@/types'

// Phase 3 box product page — one data-driven template for every parent
// product. Variants live in a query param (?tier=/?theme=); canonical strips
// it so one URL per product indexes. Seasonally hidden (visible=false) keeps
// serving with noindex so the URL and its reviews persist off-season.
// force-dynamic: ISR + async DB params 500s unknown slugs (collections lesson).
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

// The buy panel's anchor. The mobile sticky bar scrolls back to this rather
// than duplicating the purchase control, so there is one place where a variant
// is chosen and one place where add_to_cart fires.
const BUY_ANCHOR_ID = 'pdp-buy'

// Printed wherever the page mentions the free-shipping bar, from the one
// constant the cart drawer, checkout and FAQ all read.
const FREE_SHIPPING_DOLLARS = Math.round(FREE_SHIPPING_THRESHOLD / 100)

// Contents are grouped by WHO a piece is for, not by the warehouse category
// the item happens to sit in. `bath` is baby bath & skincare in this catalog,
// so it belongs with the baby pieces; `mom` is the half of the box that makes
// the brand's whole argument, so it gets a group of its own even when it holds
// one item. A category that gains no group would simply not render, so the map
// is exhaustive over ProductCategory by construction.
const CONTENT_GROUPS = [
  { key: 'forBaby' as const, categories: ['swaddle', 'garment', 'bath'] as ProductCategory[] },
  { key: 'forMama' as const, categories: ['mom'] as ProductCategory[] },
  { key: 'keepsake' as const, categories: ['keepsake'] as ProductCategory[] },
]

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
    inside: 'What she’ll open', color: 'your choice of color',
    card: 'Personalized card — hand-finished for every box, with your message',
    basket: 'Everything arrives nested in a woven seagrass basket with lid, ribbon-tied and sealed by hand.',
    faq: 'Frequently asked questions', prefer: 'Prefer to choose every piece yourself?', build: 'Build your own box',
    options: 'Options',
    bestFor: 'Best for',
    pieces: 'pieces, hand-packed',
    send: 'Send this gift',
    forBaby: 'For baby', forMama: 'For Mama', keepsake: 'A little keepsake', presentation: 'The presentation',
    allIncluded: 'all included',
    whyTitle: 'Why this gift',
    whyBody: 'Most baby gifts are for the baby. This one pairs beautiful little things for the little one with something chosen for the mother — the one gift she opens that week that is actually hers.',
    reviews: 'What people said',
    details: 'Shipping, returns & details',
    shippingQ: 'When will it arrive?',
    returnsQ: 'Returns & cancellations',
    giftQ: 'Can you send it straight to her?',
    giftA: 'Yes. Tick “This is a gift” at checkout and enter her address — receipts and confirmations still come to you, and nothing showing a price goes in the box.',
    messageQ: 'How does the card message work?',
    messageA: 'You write it at checkout. We hand-finish the card and set it into the basket before it ships.',
    included: 'Personalized gift message included',
    ready: 'Arrives gift-ready — no wrapping needed',
    sticky: 'Send this gift',
  },
  es: {
    inside: 'Qué va a abrir', color: 'el color lo eliges tú',
    card: 'Tarjeta personalizada — terminada a mano para cada canastilla, con tu mensaje',
    basket: 'Todo llega acomodado en una canasta tejida de fibra marina con tapa, atada con listón y sellada a mano.',
    faq: 'Preguntas frecuentes', prefer: '¿Prefieres elegir cada pieza?', build: 'Arma tu propia canastilla',
    options: 'Opciones',
    bestFor: 'Ideal para',
    pieces: 'piezas, empacadas a mano',
    send: 'Enviar este regalo',
    forBaby: 'Para el bebé', forMama: 'Para mamá', keepsake: 'Un recuerdo', presentation: 'La presentación',
    allIncluded: 'todo incluido',
    whyTitle: 'Por qué este regalo',
    whyBody: 'Casi todos los regalos de bebé son para el bebé. Este suma algo elegido para la mamá — lo único que abre esa semana que de verdad es suyo.',
    reviews: 'Lo que dicen',
    details: 'Envío, devoluciones y detalles',
    shippingQ: '¿Cuándo llega?',
    returnsQ: 'Devoluciones y cancelaciones',
    giftQ: '¿Lo pueden enviar directamente a ella?',
    giftA: 'Sí. Marca «Es un regalo» al pagar y escribe su dirección — los recibos y confirmaciones te llegan a ti, y nada con precios va dentro de la canastilla.',
    messageQ: '¿Cómo funciona el mensaje de la tarjeta?',
    messageA: 'Lo escribes al pagar. Terminamos la tarjeta a mano y la colocamos en la canastilla antes de enviarla.',
    included: 'Incluye tu mensaje personalizado',
    ready: 'Llega listo para regalar — no hay que envolver nada',
    sticky: 'Enviar este regalo',
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

  // Approved reviews (pooled per box, §47) feed the Product JSON-LD:
  // aggregateRating + up to 10 review objects, emitted ONLY when at least one
  // approved review exists. Incentivized reviews are excluded here for the
  // same reason they're excluded from the Google review feed (reward-based
  // exclusion, never star-based). Fail-soft: a DB hiccup drops the fields,
  // never the page.
  let reviewLd: Record<string, unknown> = {}
  // The star line printed above the CTA. It comes off the SAME approved,
  // non-incentivized rows the JSON-LD is built from, so the page and the
  // structured data can never disagree — and it stays null below three
  // reviews, because an "average" over one opinion is arithmetic, not proof.
  let ratingSummary: { average: number; count: number } | null = null
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
      if (rs.length >= 3) ratingSummary = { average: Math.round(avg * 10) / 10, count: rs.length }
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
      {/* pb on phones reserves the sticky purchase bar's height so it can
          never sit over the last section or the footer links. */}
      <main className="bg-white min-h-screen pb-24 lg:pb-0">
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

            {/* 2 — Buy panel */}
            <div>
              {/* Above the fold, in decision order: which moment this is for,
                  what it is, why it matters, whether anyone else liked it, what
                  it costs, and one button. The contents inventory moved BELOW
                  the fold — a gift buyer decides on the gift, then reads what
                  is in it, never the other way round. */}
              {bestForLabel(box.slug, isEs) && (
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase font-semibold text-[#7A8E7C] mb-3">
                  {t.bestFor}: {bestForLabel(box.slug, isEs)}
                </p>
              )}

              <h1 className="font-serif text-4xl text-espresso leading-[1.08]">{box.name}</h1>

              {/* The one-line reason, in the catalog's own words. */}
              {box.subtitle && (
                <p className="font-sans text-[15px] leading-relaxed text-bark-600 mt-3 max-w-sm">{box.subtitle}</p>
              )}

              {ratingSummary && (
                <p className="flex items-center gap-2 mt-4">
                  <span className="inline-flex items-center gap-[3px]" role="img" aria-label={`${ratingSummary.average} ${isEs ? 'de 5 estrellas' : 'out of 5 stars'}`}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <svg key={n} viewBox="0 0 20 20" className="w-3.5 h-3.5" fill={n <= Math.round(ratingSummary!.average) ? '#CDA8A1' : 'none'} stroke="#CDA8A1" strokeWidth="1.4" aria-hidden="true">
                        <path d="M10 1.6l2.5 5.3 5.6.8-4.1 4 1 5.7-5-2.7-5 2.7 1-5.7-4.1-4 5.6-.8z" strokeLinejoin="round" />
                      </svg>
                    ))}
                  </span>
                  <a href="#reviews" className="font-sans text-[12px] text-bark-500 underline underline-offset-2 hover:text-espresso transition-colors">
                    {ratingSummary.average.toFixed(1)} · {ratingSummary.count} {isEs ? (ratingSummary.count === 1 ? 'reseña' : 'reseñas') : (ratingSummary.count === 1 ? 'review' : 'reviews')}
                  </a>
                </p>
              )}

              <p className="font-sans text-2xl text-espresso mt-4">{formatDollars(variant.price)}</p>
              <p className="font-sans text-[13px] tracking-[0.06em] text-bark-500 mt-1">
                {pieceCount(variant)} {t.pieces}
              </p>

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
                      image: v.images[0] ?? null,
                      href: `${isEs ? '/es/canastillas' : '/boxes'}/${box.slug}?${box.variantParam}=${encodeURIComponent(v.key)}`,
                    }))}
                  />
                  {variant.adds && <p className="font-sans text-xs text-bark-400 mt-3">{variant.adds}</p>}
                </div>
              )}

              {/* GA4 view_item / Meta ViewContent — boxes fired nothing before,
                  so the funnel showed no product views for the very products
                  the ads point at. Id matches the Merchant feed offer id. */}
              <TrackViewItem
                id={`box-${box.slug}--${variant.key}`}
                name={box.variants.length > 1 ? `${box.name} — ${variant.label}` : box.name}
                price={variant.price}
                category="Gift Box"
              />

              {/* The one primary action on the page. `id` is also what the
                  mobile sticky bar scrolls back to, so variant, size and colour
                  are chosen in exactly one place and add_to_cart fires once. */}
              <div id={BUY_ANCHOR_ID}>
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
                  ctaLabel={t.send}
                />
              </div>

              {/* Directly under the button: the two things a gift buyer is
                  quietly unsure about, answered before either can become a
                  reason to leave. No delivery promise is made here — the
                  estimate inside the buy panel prints a date only once it
                  knows the destination ZIP. */}
              <ul className="mt-4 space-y-1.5">
                {[t.included, t.ready].map(line => (
                  <li key={line} className="flex items-start gap-2 font-sans text-[13px] text-bark-600">
                    <span aria-hidden="true" className="mt-[7px] w-1 h-1 bg-[#CDA8A1] shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>

              <p className="font-sans text-sm text-bark-500 mt-6">
                <Link href={localePath('/faq', isEs)} className="underline underline-offset-2 hover:text-bark-600">{t.faq}</Link>
              </p>

              <p className="font-sans text-sm text-bark-500 mt-3">
                {t.prefer} <Link href={isEs ? '/es/build' : '/build'} className="underline hover:text-bark-600">{t.build}</Link>.
              </p>
            </div>
          </div>

          {/* ── What she'll open ────────────────────────────────────────
              Grouped by WHO each piece is for, not by warehouse category. A
              gift buyer's question is "does this include something for her?",
              and Swaddle & Blanket / Baby Garment / Bath & Skincare does not
              answer it. The presentation is a group of its own because the
              basket, the ribbon and the card are part of what is bought. */}
          <section className="mt-14 pt-12 border-t border-cream-200">
            <h2 className="font-serif text-2xl sm:text-3xl text-espresso mb-8">{t.inside}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10">
              {CONTENT_GROUPS
                .map(g => ({
                  key: g.key,
                  label: t[g.key],
                  items: variant.contents.filter(c => g.categories.includes(c.item.category)),
                }))
                .filter(g => g.items.length > 0)
                .map(g => (
                  <div key={g.key}>
                    <p className="font-sans text-[11px] tracking-[0.18em] uppercase font-semibold text-[#7A8E7C] mb-3 pb-2 border-b border-cream-200">
                      {g.label}
                      {g.items.length > 1 && (
                        <span className="text-bark-400/70 font-normal"> · {t.allIncluded}</span>
                      )}
                    </p>
                    <ul className="space-y-2.5">
                      {g.items.map(c => (
                        <li key={c.item.id}>
                          {/* The whole row opens the same product-details modal
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
                              <span className="relative w-11 h-11 shrink-0 overflow-hidden border border-cream-200">
                                <Image quality={88} src={c.item.image} alt="" fill sizes="44px" className="object-cover" />
                              </span>
                            ) : (
                              <span className="w-11 h-11 shrink-0 border border-dashed border-cream-300 bg-cream-100" />
                            )}
                            <span className="font-sans text-[13px] leading-snug text-bark-600 group-hover:text-espresso transition-colors">
                              {c.qty > 1 ? `${c.qty} × ` : ''}{c.item.name}
                              {/* The heading counts PIECES, this list shows
                                  ITEMS, and a set counts as its pieces — so
                                  "12 pieces" over 10 rows looked like a bug.
                                  Both read from the same piecesPerItem rule. */}
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
                              {/* `organic` is a per-ITEM fact from the catalog.
                                  It is never stated of the box as a whole. */}
                              {(c.item as { organic?: boolean }).organic && (
                                <span className="ml-2 font-sans text-[10px] tracking-[0.12em] uppercase border border-[#7A8E7C] text-[#7A8E7C] px-1.5 py-0.5 align-middle">{isEs ? 'orgánico' : 'organic'}</span>
                              )}
                              {c.note && <span className="block font-sans text-[11px] text-bark-400 mt-0.5">{c.note}</span>}
                            </span>
                          </BoxItemModalTrigger>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

              {/* The presentation is part of the gift, so it is listed as part
                  of the gift rather than buried in fine print. */}
              <div>
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase font-semibold text-[#7A8E7C] mb-3 pb-2 border-b border-cream-200">
                  {t.presentation}
                </p>
                <ul className="space-y-2.5 font-sans text-[13px] leading-relaxed text-bark-600">
                  <li>{t.card}</li>
                  <li>{t.basket}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── Why this gift ─────────────────────────────────────────────── */}
          <section className="mt-14 pt-12 border-t border-cream-200">
            <div className="max-w-2xl">
              <h2 className="font-serif text-2xl sm:text-3xl text-espresso">{t.whyTitle}</h2>
              <p className="font-sans text-[15px] leading-relaxed text-bark-600 mt-4">{t.whyBody}</p>
            </div>
          </section>

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

          {/* 5 — Reviews, pooled per product across variants. The id is what
              the star line above the CTA links to. */}
          <div id="reviews" className="scroll-mt-6">
            <ReviewSection productId={`box-${box.slug}`} />
          </div>

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

          {/* ── Shipping, returns & details ───────────────────────────────
              Secondary factual information, in accordions, at the bottom —
              where a shopper who wants it can find it and a shopper who has
              already decided is not made to scroll past it. Every answer is
              generated from the same constants the cart and checkout read, so
              this block cannot drift from what the system actually does. */}
          <section className="mt-16 pt-12 border-t border-cream-200 max-w-2xl">
            <h2 className="font-serif text-2xl text-espresso mb-6">{t.details}</h2>
            <FaqAccordion
              items={[
                {
                  q: t.shippingQ,
                  a: isEs
                    ? `Enviamos desde Seattle. Escribe tu código postal arriba y te mostramos la ventana de entrega para esa dirección. Envío gratis a partir de $${FREE_SHIPPING_DOLLARS}.`
                    : `We ship from Seattle. Enter a ZIP above and we show the delivery window for that address. Free shipping over $${FREE_SHIPPING_DOLLARS}.`,
                },
                { q: t.giftQ, a: t.giftA },
                { q: t.messageQ, a: t.messageA },
                { q: t.returnsQ, a: isEs ? RETURNS_SUMMARY_ES : RETURNS_SUMMARY },
              ]}
            />
          </section>

        </div>
        </SlotBackground>

      </main>

      {/* Outside <main> on purpose: globals.css clips main's overflow to kill
          mobile side-scroll, and a clipped ancestor also clips a fixed-position
          descendant's paint. The bar appears only once the real buy control has
          scrolled away, and it does not duplicate that control — it scrolls back
          to it. Two live purchase buttons on one screen is a competing-button
          problem, and two add paths is a double-counted add_to_cart. */}
      <MobileStickyPurchaseCTA
        targetId={BUY_ANCHOR_ID}
        label={t.sticky}
        price={formatDollars(variant.price)}
        productName={box.variants.length > 1 ? `${box.name} — ${variant.label}` : box.name}
      />
      <Footer />
    </>
  )
}

export default async function BoxProductPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  return BoxProductView({ params, searchParams, locale: 'en' })
}
