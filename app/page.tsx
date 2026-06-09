import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getProductById, FEATURED_IDS } from '@/lib/products'
import type { Product } from '@/types'
import { ProductCarousel } from '@/components/ui/ProductCarousel'
import { EditorialStrip } from '@/components/ui/EditorialStrip'
import { EditorialFeature } from '@/components/ui/EditorialFeature'
import { CollectionsSection } from '@/components/ui/CollectionsSection'
import { PrebuiltBoxesSection } from '@/components/ui/PrebuiltBoxesSection'

export const metadata: Metadata = {
  title: 'Petite Lavande — Luxury Curated Baby Gift Boxes',
  description: 'Build a bespoke luxury baby shower gift box. Choose 5 premium organic items, add a personalized printed card, and deliver an unforgettable unboxing experience.',
  openGraph: { title: 'Petite Lavande', description: 'Luxury curated organic baby gift boxes — built item by item, shipped with love.' },
}

// Revalidate bestsellers periodically so they reflect real sales
export const revalidate = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
}


const TESTIMONIALS = [
  { quote: "I've never seen a gift box this beautiful. My best friend cried when she opened it. The personal card was the most special part.", name: 'Camille R.', context: 'Gifted to her sister' },
  { quote: "Ordered rush shipping and it arrived the next day. Gorgeous box, everything so soft and organic. Worth every penny.", name: 'Maya T.', context: 'Baby shower gift' },
  { quote: "Everyone at the shower was asking where the box was from. Building it myself meant I picked perfectly for someone I barely know.", name: 'Priya N.', context: 'Office baby shower' },
]

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
  const [featured, collectionsData] = await Promise.all([getBestsellers(), getCollectionsData()])

  return (
    <>
      <Header />
      <main>

        {/* ── 1. Hero ── */}
        <section className="relative w-full min-h-[85vh] sm:min-h-[92vh] bg-cream-200 flex items-end overflow-hidden">
          <Image
            src={homeImg('hero')}
            alt="Petite Lavande — Timeless Moments, Made With Love"
            fill
            className="object-cover object-center"
            priority
            unoptimized
          />
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

        {/* ── Perks bar — attached directly under the hero ── */}
        <section className="bg-terra-100 border-b border-cream-300">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
            {[
              { label: 'Free Shipping', sub: 'On orders over $150' },
              { label: 'Personalized Card', sub: 'Printed for every box' },
              { label: 'Organic Cotton', sub: 'From a GOTS-certified maker' },
              { label: 'Gift-Ready', sub: 'Wax seal & ribbon, always' },
            ].map(({ label, sub }, i) => (
              <div key={label} className={`text-center py-5 px-4 border-cream-300
                ${i % 2 === 0 ? 'border-r' : ''}
                ${i < 2 ? 'border-b md:border-b-0' : ''}
                md:border-r md:last:border-r-0`}>
                <p className="font-sans text-[9px] tracking-[0.3em] uppercase text-bark-600 mb-0.5">{label}</p>
                <p className="font-sans text-[9px] text-bark-400 tracking-wide">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Shop by Occasion ── */}
        <section className="py-14 sm:py-16">
          <div className="pl-6 sm:pl-9 pr-6 mb-10">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Collections</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Shop by Occasion</h2>
            <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Tap any collection to see what&apos;s inside</p>
          </div>
          <CollectionsSection initial={collectionsData ?? undefined} />
        </section>

        {/* ── Curated Gift Sets ── */}
        <PrebuiltBoxesSection />

        {/* ── Why families choose Petite Lavande ── */}
        <section className="border-t border-cream-300 bg-cream-50 py-16 sm:py-24 px-6 sm:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">Why Petite Lavande</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600 leading-tight mb-5">What makes it special</h2>
            <p className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose max-w-2xl mx-auto mb-14">
              Anyone can send a gift. We help you send a moment — every box built around the mother, not just the baby, and finished by hand as if a daughter chose it herself.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 text-left">
              {[
                { t: 'Chosen for her, not just baby', b: 'Most gifts forget the mother. Every box carries something for her too — a quiet reminder that she is seen.' },
                { t: 'Organic, traced to the source', b: 'Soft on new skin and gentle on the planet — cotton made with GOTS-certified organic cotton from a GOTS-certified maker, ingredients traced to their origin.' },
                { t: 'Finished by hand', b: 'Sealed with a wax stamp, tied with satin ribbon, tucked with dried lavender, and a card printed just for them.' },
                { t: 'Built your way', b: 'Start from a ready-made set or build your own — pick exactly what goes inside. No two boxes alike.' },
              ].map(({ t, b }) => (
                <div key={t}>
                  <div className="w-8 h-px bg-gold-400 mb-5" />
                  <h3 className="font-serif text-lg text-bark-600 mb-3 leading-snug">{t}</h3>
                  <p className="font-sans text-xs text-bark-400 leading-loose">{b}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/build" className="inline-block bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-700 transition-colors">
                Build Your Box
              </Link>
              <Link href="/boxes" className="inline-block border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-bark-600 hover:text-cream-50 transition-colors">
                Shop Ready-Made
              </Link>
            </div>
          </div>
        </section>

        {/* ── Editorial strip — video or image ── */}
        <EditorialStrip />

        {/* ── Bestsellers — center-snap looping carousel, below the editorial strip ── */}
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

        {/* ── 6 + 6b. Editorial pair — full-bleed, edge-attached, fly in/out ── */}
        <section className="border-t border-cream-300 bg-cream-50">

          {/* Block 1: image flush LEFT · text right */}
          <EditorialFeature image={homeImg('brand')} alt="Petite Lavande brand story" side="left">
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-5">For the Giver</p>
            <h2 className="font-serif text-[2rem] sm:text-[2.75rem] text-bark-600 leading-[1.05] mb-5">
              Not a gift basket.<br />Something for her.
            </h2>
            <p className="font-cormorant text-lg text-bark-400 leading-loose mb-8">
              You&apos;re here because someone you love is becoming a mother. You want to send something that says <em>I see you. I see how much love you carry.</em> Every box we send is built around one question: what would the most thoughtful person in her life choose?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/build" className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-bark-700 transition-colors">
                Build Your Box
              </Link>
              <Link href="/boxes" className="border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors">
                Shop Ready-Made
              </Link>
            </div>
          </EditorialFeature>

          {/* Block 2: image flush RIGHT · text left */}
          <EditorialFeature image={homeImg('inside')} alt="What's inside a Petite Lavande box" side="right">
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-5">Traced to the Source</p>
            <h2 className="font-serif text-[2rem] sm:text-[2.75rem] text-bark-600 leading-[1.05] mb-5">
              From the source,<br />to her.
            </h2>
            <p className="font-cormorant text-lg text-bark-400 leading-loose mb-6">
              Every ingredient, every material — traced to its origin. Provence lavender fields. Pacific Northwest farms. Small American makers. Everything chosen the way a daughter would choose for her own mother.
            </p>
            <ul className="space-y-2.5">
              {['5 curated organic items', 'Personalized printed card', 'Dried lavender & wax seal', 'Satin ribbon & gift-ready box'].map(item => (
                <li key={item} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 flex items-center gap-3">
                  <span className="w-4 h-px bg-gold-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </EditorialFeature>

        </section>

        {/* ── 7. How it works ── */}
        <section id="how-it-works" className="py-12 sm:py-16 px-6 sm:px-8 bg-cream-100 border-t border-b border-cream-300">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">The Process</p>
              <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Three Simple Steps</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {[
                { n: '01', title: 'Build Your Box', body: 'Choose from curated organic items across thoughtful categories — or start from a ready-made set.' },
                { n: '02', title: 'Customize Your Card', body: 'Pick a card design and your message — we print it on premium card stock.' },
                { n: '03', title: 'We Ship With Care', body: 'Arrives sealed with a wax stamp, ribbon pull, and dried lavender.' },
              ].map(({ n, title, body }) => (
                <div key={n} className="text-center">
                  <p className="font-sans text-[10px] tracking-[0.35em] uppercase text-gold-400 mb-5">{n}</p>
                  <div className="w-8 h-px bg-cream-300 mx-auto mb-5" />
                  <h3 className="font-serif text-lg text-bark-600 mb-3">{title}</h3>
                  <p className="font-sans text-xs text-bark-400 leading-loose">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Testimonials ── */}
        <section className="py-14 sm:py-28 px-6 sm:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-4">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">Stories</p>
              <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Loved by Gift-Givers</h2>
            </div>
            <p className="font-sans text-[11px] tracking-[0.2em] text-gold-400 text-center mb-14">
              ★★★★★&nbsp;&nbsp;5.0 · Over 300 happy orders
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-cream-300">
              {TESTIMONIALS.map(({ quote, name, context }) => (
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

        {/* ── 9. Dark CTA ── */}
        <section className="relative py-24 sm:py-40 px-6 text-center overflow-hidden bg-bark-600">
          <Image
            src={homeImg('box')}
            alt="Petite Lavande gift box"
            fill
            className="object-cover object-center opacity-40"
            unoptimized
          />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-8">Begin</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight mb-3">
              Create Something
            </h2>
            <p className="font-script text-4xl text-gold-300 mb-14">unforgettable.</p>
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
