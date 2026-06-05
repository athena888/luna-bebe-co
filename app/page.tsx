import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getProductById, FEATURED_IDS } from '@/lib/products'
import type { Product } from '@/types'
import { ProductCarousel } from '@/components/ui/ProductCarousel'
import { EditorialStrip } from '@/components/ui/EditorialStrip'
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
  { quote: "Everyone at the shower was asking where the box was from. The gift guide helped me pick perfectly for someone I barely know.", name: 'Priya N.', context: 'Office baby shower' },
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
                  href="/guide"
                  className="bg-cream-50 text-bark-600 font-sans text-[9px] tracking-[0.2em] uppercase px-6 sm:px-9 py-3 sm:py-3.5 hover:bg-cream-100 transition-colors"
                >
                  Take the Gift Guide
                </Link>
                <Link
                  href="/build"
                  className="border border-cream-50/70 text-cream-50 font-sans text-[9px] tracking-[0.2em] uppercase px-6 sm:px-9 py-3 sm:py-3.5 hover:bg-cream-50/10 transition-colors"
                >
                  Build a Box
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Perks bar ── */}
        <section className="bg-terra-100 border-b border-cream-300">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4">
            {[
              { label: 'Free Shipping', sub: 'On orders over $150' },
              { label: 'Personalized Card', sub: 'Printed for every box' },
              { label: '100% Organic', sub: 'GOTS-certified materials' },
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

        {/* ── 2b. Pre-assembled boxes ── */}
        <PrebuiltBoxesSection />

        {/* ── 3. Collections — click to see items inside ── */}
        <section className="border-t border-cream-300 py-16">
          <div className="pl-6 sm:pl-9 pr-6 mb-10">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Collections</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Shop by Occasion</h2>
            <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Tap any collection to see what&apos;s inside</p>
          </div>
          <CollectionsSection initial={collectionsData ?? undefined} />
        </section>

        {/* ── 4. Featured products — center-snap looping carousel ── */}
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

        {/* ── 5. Editorial strip — video or image ── */}
        <EditorialStrip />

        {/* ── 6 + 6b. Editorial pair — flush, no gap ── */}
        <section>

          {/* Row 1: image left · text right */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[60vh] order-1">
              <Image
                src={homeImg('brand')}
                alt="Petite Lavande brand story"
                fill
                className="object-cover object-center"
                             />
            </div>
            <div className="bg-cream-100 flex items-center justify-center px-8 sm:px-16 py-16 sm:py-24 order-2">
              <div className="max-w-sm">
                <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-6">For the Giver</p>
                <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600 leading-[1.05] mb-6">
                  Not a gift basket.<br />Something for her.
                </h2>
                <p className="font-cormorant text-lg text-bark-400 leading-loose mb-10">
                  You&apos;re here because someone you love is becoming a mother. You want to send something that says <em>I see you. I see how much love you carry.</em> Every box we send is built around one question: what would the most thoughtful person in her life choose?
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/build"
                    className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-bark-700 transition-colors"
                  >
                    Build Your Box
                  </Link>
                  <Link
                    href="/guide"
                    className="border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors"
                  >
                    Take the Guide
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: text left · image right — reversed, flush below row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Text — always renders first in DOM for mobile, shown left on desktop */}
            <div className="bg-cream-100 flex items-center justify-center px-8 sm:px-16 py-16 sm:py-24 order-2 md:order-1">
              <div className="max-w-sm">
                <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-6">Traced to the Source</p>
                <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600 leading-[1.05] mb-6">
                  From the source,<br />to her.
                </h2>
                <p className="font-cormorant text-lg text-bark-400 leading-loose mb-4">
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
              </div>
            </div>
            {/* Image — shown right on desktop */}
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[65vh] order-1 md:order-2">
              <Image
                src={homeImg('inside')}
                alt="What's inside a Petite Lavande box"
                fill
                className="object-cover object-center"
                             />
            </div>
          </div>

        </section>

        {/* ── 6c. The Box — photo gallery scroll ── */}
        <section className="border-t border-cream-300 py-16">
          <div className="pl-6 sm:pl-9 pr-6 mb-8">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Petite Lavande</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">The Box</h2>
            <p className="font-serif italic text-bark-400 text-base mt-1">Every detail, made with love.</p>
          </div>
          <div className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3 pl-6 sm:pl-9">
            {(['gallery-1', 'gallery-2', 'gallery-3', 'gallery-4'] as const).map(slot => (
              <div
                key={slot}
                className="relative shrink-0 w-[80vw] sm:w-[55vw] lg:w-[40vw] snap-start overflow-hidden bg-cream-200"
                style={{ aspectRatio: '4/3' }}
              >
                <Image
                  src={homeImg(slot)}
                  alt="Petite Lavande box"
                  fill
                  className="object-cover object-center"
                                 />
              </div>
            ))}
            <div className="shrink-0 w-6 sm:w-9" />
          </div>
        </section>

        {/* ── 7. How it works ── */}
        <section id="how-it-works" className="py-14 sm:py-28 px-6 sm:px-8 bg-cream-100 border-t border-b border-cream-300">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">The Process</p>
              <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Four Simple Steps</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {[
                { n: '01', title: 'Take the Guide', body: 'Answer 4 questions. Get a personalized box recommendation instantly.' },
                { n: '02', title: 'Build Your Box', body: 'Choose from curated organic items across 5 thoughtful categories.' },
                { n: '03', title: 'Customize Your Card', body: 'Pick a card design and your message — we print it on premium card stock.' },
                { n: '04', title: 'We Ship With Care', body: 'Arrives sealed with a wax stamp, ribbon pull, and dried lavender.' },
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
                     />
          <div className="relative z-10 max-w-xl mx-auto">
            <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-8">Begin</p>
            <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight mb-3">
              Create Something
            </h2>
            <p className="font-script text-4xl text-gold-300 mb-14">unforgettable.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/guide"
                className="bg-cream-50 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-cream-100 transition-colors"
              >
                Take the Gift Guide
              </Link>
              <Link
                href="/build"
                className="border border-cream-300/40 text-cream-300 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-4 hover:border-cream-50 hover:text-cream-50 transition-colors"
              >
                Build a Box
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
