import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getProductById, FEATURED_IDS } from '@/lib/products'
import type { Product } from '@/types'
import { ProductCarousel } from '@/components/ui/ProductCarousel'
import { EditorialFeature } from '@/components/ui/EditorialFeature'
import { EditorialStrip } from '@/components/ui/EditorialStrip'
import { CollectionsSection } from '@/components/ui/CollectionsSection'
import { PrebuiltBoxesSection } from '@/components/ui/PrebuiltBoxesSection'
import { RotatingImage } from '@/components/ui/RotatingImage'
import { ParallaxLayer } from '@/components/ui/ParallaxLayer'
import { getHomeContent } from '@/lib/home-content'
import { getHomeGalleries } from '@/lib/site-images'
import { Package, PenLine, Leaf, Heart, Truck } from 'lucide-react'

// Icons for the under-hero perks bar, mapped by index to the default perks.
const PERK_ICONS = [Package, PenLine, Leaf, Heart]

export const metadata: Metadata = {
  title: 'Petite Lavande — Luxury Curated Baby Gift Boxes',
  description: 'Build a bespoke luxury baby shower gift box. Choose 5 premium organic items, add a personalized printed card, and deliver an unforgettable unboxing experience.',
  alternates: { canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com' },
  openGraph: { title: 'Petite Lavande', description: 'Luxury curated organic baby gift boxes — built item by item, shipped with love.' },
}

// Revalidate bestsellers periodically so they reflect real sales
export const revalidate = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}


async function getBestsellers(): Promise<Product[]> {
  try {
    const { getBestsellerProducts } = await import('@/lib/bestsellers')
    const { products } = await getBestsellerProducts(8)
    return products
  } catch (e) {
    console.error('getBestsellers failed, using static featured:', e)
    return FEATURED_IDS.flatMap(id => {
      const p = getProductById(id)
      return p ? [p] : []
    })
  }
}

const SUPABASE_URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function collectionImg(slot: string) {
  return `${SUPABASE_URL_ENV}/storage/v1/object/public/home-images/${slot}.jpg`
}

// Server-fetch Shop by Occasion data so the section renders immediately
// (no client-side "Loading collections…" hang).
async function getCollectionsData() {
  try {
    const { getCatalog } = await import('@/lib/products-db')
    const { getCollections } = await import('@/lib/collections-db')
    const { getBoxes } = await import('@/lib/prebuilt-boxes-db')
    const [catalog, collections, boxes] = await Promise.all([
      getCatalog({ activeOnly: true }),
      getCollections().catch(() => []),
      getBoxes({}).catch(() => []),
    ])
    const byCategory: Record<string, typeof catalog> = {}
    for (const p of catalog) (byCategory[p.category] ??= []).push(p)
    return {
      categories: collections.map(c => ({ id: c.id, label: c.label, sub: c.sub, img: collectionImg(c.home_image_slot), productIds: c.product_ids })),
      byCategory,
      boxes: boxes.map(b => ({ slug: b.slug, name: b.name, tagline: b.tagline, image: b.image })),
    }
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [featured, collectionsData, content, galleries] = await Promise.all([
    getBestsellers(), getCollectionsData(), getHomeContent(), getHomeGalleries(['hero', 'box', 'brand', 'inside']),
  ])

  return (
    <>
      <Header />
      <main>

        {/* ── 1. Hero ── */}
        <section className="relative w-full min-h-[85vh] sm:min-h-[92vh] bg-cream-200 flex items-end overflow-hidden">
          <ParallaxLayer>
            <RotatingImage urls={galleries.hero} alt="Petite Lavande — Timeless Moments, Made With Love" />
          </ParallaxLayer>
          <div className="absolute inset-0 bg-gradient-to-t from-bark-800/40 via-transparent to-transparent" />
          <div className="relative z-10 w-full px-6 sm:px-12 pb-10 sm:pb-14 flex justify-end">
            <div className="w-full max-w-[300px] sm:max-w-sm text-right">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-cream-200/80 mb-3 pt-8 md:pt-12">Petite Lavande</p>
              <h1 className="font-serif text-[2.25rem] sm:text-[4.5rem] text-cream-50 leading-[1.05] mb-3">
                A New Chapter,<br />Wrapped in Care.
              </h1>
              <p className="font-serif italic text-cream-200/80 text-sm sm:text-base leading-relaxed mb-6 sm:mb-8">This is the moment Petite Lavande was made for.</p>
              <div className="flex flex-col gap-2 items-end">
                <Link
                  href="/build"
                  className="bg-cream-50 text-bark-600 font-sans text-[9px] tracking-[0.2em] uppercase px-6 sm:px-9 py-3 sm:py-3.5 hover:bg-cream-100 transition-colors"
                >
                  Build Your Own Box
                </Link>
                <Link
                  href="/boxes"
                  className="border border-cream-50/70 text-cream-50 font-sans text-[9px] tracking-[0.2em] uppercase px-6 sm:px-9 py-3 sm:py-3.5 hover:bg-cream-50/10 transition-colors"
                >
                  Shop Ready-Made
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Perks bar — attached directly under the hero (matches header banner, espresso text) ── */}
        <section className="bg-[#FEF8F4] border-b border-cream-300">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
            {content.perks.map(({ label, sub }, i) => {
              const Icon = PERK_ICONS[i % PERK_ICONS.length]
              return (
                <div key={label} className={`text-center py-5 px-4 border-cream-300
                  ${i % 2 === 0 ? 'border-r' : ''}
                  ${i < 2 ? 'border-b md:border-b-0' : ''}
                  md:border-r md:last:border-r-0`}>
                  <Icon size={18} className="text-espresso mb-2 mx-auto" strokeWidth={1.5} />
                  <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-espresso mb-0.5">{label}</p>
                  <p className="font-sans text-[9px] text-espresso/80 tracking-wide">{sub}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Shop by Occasion ── */}
        <section className="pt-14 sm:pt-16 pb-0">
          <div className="pl-6 sm:pl-9 pr-6 mb-8">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Collections</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Shop by Occasion</h2>
            <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Tap any collection to see what&apos;s inside</p>
          </div>
          <CollectionsSection initial={collectionsData ?? undefined} />
        </section>

        {/* ── Curated Gift Sets ── */}
        <PrebuiltBoxesSection />

        {/* ── What makes it special — editable intro + editorial features, all from Portal → Home Content ── */}
        <section className="border-t border-cream-300 bg-cream-white">

          {/* Editable intro */}
          <div className="max-w-3xl mx-auto text-center px-6 sm:px-8 pt-10 sm:pt-14 pb-6 sm:pb-10">
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">{content.why.eyebrow}</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600 leading-tight mb-5">{content.why.title}</h2>
            <p className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose">
              {content.why.intro}
            </p>
          </div>

          {/* Editable image features — image + copy edited together in the portal.
              Images alternate flush-left / flush-right as they fly in. */}
          {content.why.features.map((f, i) => {
            const bullets = f.bullets.filter(b => b.trim())
            return (
              <EditorialFeature key={i} images={galleries[f.slot] ?? [homeImg(f.slot)]} alt={f.eyebrow || 'Petite Lavande'} side={i % 2 === 0 ? 'left' : 'right'}>
                {f.eyebrow && <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-5">{f.eyebrow}</p>}
                <h2 className="font-serif text-[2rem] sm:text-[2.75rem] text-bark-600 leading-[1.05] mb-5 whitespace-pre-line">{f.title}</h2>
                <p className="font-cormorant text-lg text-bark-400 leading-loose whitespace-pre-line">{f.body}</p>
                {bullets.length > 0 && (
                  <ul className="space-y-2.5 mt-6">
                    {bullets.map((b, j) => (
                      <li key={j} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 flex items-center gap-3">
                        <span className="w-4 h-px bg-gold-400 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </EditorialFeature>
            )
          })}

        </section>

        {/* ── Bestsellers — center-snap looping carousel, above the editorial strip ── */}
        <section className="border-t border-cream-300 pt-16 pb-12">
          <div className="pl-6 sm:pl-9 pr-6 mb-10 flex items-end justify-between">
            <div>
              <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Curated Picks</p>
              <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Bestsellers</h2>
            </div>
            <Link
              href="/build"
              className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5"
            >
              View All →
            </Link>
          </div>
          <ProductCarousel products={featured} />
        </section>

        {/* ── Editorial strip — video or image ── */}
        <EditorialStrip />

        {/* ── 8. Testimonials ── */}
        <section className="py-14 sm:py-28 px-6 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">{content.reviews.eyebrow}</p>
              <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">{content.reviews.title}</h2>
            </div>
            <p className="font-sans text-[11px] tracking-[0.2em] text-gold-400 text-center mb-14">
              {content.reviews.ratingLine}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-cream-300">
              {content.reviews.items.map(({ quote, name, context }) => (
                <div key={name} className="py-10 md:py-0 md:px-10 first:pl-0 last:pr-0 text-center">
                  <p className="font-sans text-[10px] tracking-[0.25em] text-gold-400 mb-5">★★★★★</p>
                  <p className="font-serif text-sm text-bark-600 leading-relaxed italic mb-8">&ldquo;{quote}&rdquo;</p>
                  <p className="font-sans text-xs font-medium text-bark-600">{name}</p>
                  <p className="font-sans text-xs text-bark-400 mt-0.5">{context}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. Dark CTA — now carries the three steps ── */}
        <section className="relative py-10 sm:py-14 px-6 text-center overflow-hidden bg-bark-600">
          <RotatingImage urls={galleries.box} alt="Petite Lavande gift box" className="opacity-40" />
          <div className="relative z-10 max-w-3xl mx-auto">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-5">Begin</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight mb-2">
              Create Something
            </h2>
            <p className="font-script text-4xl text-gold-300 mb-10">unforgettable.</p>

            {/* Three simple steps */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 mb-10 text-center">
              {[
                { Icon: Package, title: 'Build Your Box', body: 'Choose from curated organic items across thoughtful categories — or start from a ready-made set.' },
                { Icon: PenLine, title: 'Customize Your Card', body: 'Pick a card design and your message — we print it on premium card stock.' },
                { Icon: Truck, title: 'We Ship With Care', body: 'Arrives sealed with a wax stamp, linen ribbon, and dried lavender.' },
              ].map(({ Icon, title, body }) => (
                <div key={title}>
                  <Icon size={18} strokeWidth={1.5} className="text-gold-300 mx-auto mb-3 sm:mb-4 sm:size-[22px]" />
                  <div className="w-6 sm:w-8 h-px bg-cream-300/30 mx-auto mb-3 sm:mb-4" />
                  <h3 className="font-serif text-sm sm:text-lg text-cream-50 mb-1.5 sm:mb-2.5 leading-tight">{title}</h3>
                  <p className="font-sans text-[10px] sm:text-xs text-cream-200/70 leading-snug sm:leading-loose hidden sm:block">{body}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/build"
                className="bg-cream-50 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-cream-100 transition-colors"
              >
                Build Your Own Box
              </Link>
              <Link
                href="/boxes"
                className="border border-cream-300/40 text-cream-300 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:border-cream-50 hover:text-cream-50 transition-colors"
              >
                Shop Ready-Made
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
