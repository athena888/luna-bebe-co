import Link from 'next/link'
import { Header, PerksMarquee } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CollectionsSection } from '@/components/ui/CollectionsSection'
import { PrebuiltBoxesSection } from '@/components/ui/PrebuiltBoxesSection'
import { TheCollection } from '@/components/ui/TheCollection'
import { RotatingImage } from '@/components/ui/RotatingImage'
import { HeroArrows } from '@/components/ui/HeroArrows'
import { ScrimOverlay } from '@/components/ui/ScrimOverlay'
import { ParallaxLayer } from '@/components/ui/ParallaxLayer'
import { getHomeContent } from '@/lib/home-content'
import { getStoryContent } from '@/lib/story-content'
import { getHomeGalleries } from '@/lib/site-images'
import { getActiveSocialPosts } from '@/lib/social-posts'
import { SpecialFeature } from '@/components/ui/SpecialFeature'
import { TestimonialsCarousel } from '@/components/ui/TestimonialsCarousel'
import { SlotBackground } from '@/components/ui/SlotBackground'

const SUPABASE_URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function collectionImg(slot: string) {
  return `${SUPABASE_URL_ENV}/storage/v1/object/public/home-images/${slot}.jpg`
}

// Server-fetch Shop by Occasion data so the section renders immediately
// (no client-side "Loading collections…" hang).
async function getCollectionsData(locale: 'en' | 'es' = 'en') {
  try {
    const { getCatalog } = await import('@/lib/products-db')
    const { getCollections } = await import('@/lib/collections-db')
    const { getBoxes } = await import('@/lib/prebuilt-boxes-db')
    const [catalog, collections, boxes] = await Promise.all([
      getCatalog({ activeOnly: true }),
      getCollections().catch(() => []),
      getBoxes({}).catch(() => []),
    ])
    // Tile names/subtitles are portal-editable (collections table); their
    // Spanish lives in the translations table (entity 'collection_tile',
    // fields label/sub — reviewable in Portal → Spanish Review). English
    // fallback per field.
    let tileEs = new Map<string, Record<string, string>>()
    if (locale === 'es') {
      try {
        const { getTranslations } = await import('@/lib/i18n')
        tileEs = await getTranslations('collection_tile', collections.map(c => c.id))
      } catch { /* fall back to English */ }
    }
    const byCategory: Record<string, typeof catalog> = {}
    for (const p of catalog) (byCategory[p.category] ??= []).push(p)
    return {
      categories: collections.map(c => ({
        id: c.id,
        label: tileEs.get(c.id)?.label ?? c.label,
        sub: tileEs.get(c.id)?.sub ?? c.sub,
        img: collectionImg(c.home_image_slot),
        productIds: c.product_ids,
      })),
      byCategory,
      boxes: boxes.map(b => ({ slug: b.slug, name: b.name, tagline: b.tagline, image: b.image })),
    }
  } catch {
    return null
  }
}

// Spanish strings for the homepage's hardcoded copy (reviewer-register).
// Sections whose text lives in the DB fall back to English until their
// translations are seeded — identical layout either way.
const ES: Record<string, string> = {
  'hero.sub': 'Canastillas de baby shower orgánicas de lujo — para mamá y bebé',  // 'baby shower' stays in English per es-US glossary
  'hero.cta': 'Ver las canastillas',
  'cat.eyebrow': 'Sets curados para cada nuevo comienzo — o arma la tuya desde cero.',
  'cat.title': 'Compra por categoría',
  'story.eyebrow': 'Nuestra historia',
  'story.cta': 'Lee nuestra historia',
  'corp.q': '¿Regalos para tu equipo o tus clientes?',
  'corp.cta': 'Regalos corporativos',
  'story.heading': 'Nacida de la certeza de que los comienzos merecen ser hermosos',
}
// (unforgettable/why Spanish moved into the Home Content blocks' own `es`
// subtrees — see lib/home-content.ts — so portal edits carry both languages.)

export default async function HomeView({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const isEs = locale === 'es'
  const s = (key: string, english: string) => (isEs ? ES[key] ?? english : english)
  const [collectionsData, content, galleries, igPosts, story] = await Promise.all([
    getCollectionsData(locale), getHomeContent(), getHomeGalleries(['hero', 'hero.mobile']), getActiveSocialPosts(6), getStoryContent(),
  ])

  return (
    <>
      <Header overHero />
      <main>

        {/* ── 1. Hero ── */}
        {/* Mobile hero trimmed 85vh → 68vh (Emily 2026-08-26: −20%); desktop keeps 92vh. */}
        <section className="relative w-full min-h-[68vh] sm:min-h-[92vh] bg-cream-200 overflow-hidden">
          <ParallaxLayer>
            {/* 2s interval (Emily 2026-08-27) — was 5s. */}
            <RotatingImage urls={galleries.hero} mobileUrls={galleries['hero.mobile']} alt="Petite Lavande — Timeless Moments, Made With Love" className="hero-fade" navEvent="pl:hero-nav" intervalMs={2000} mobileSizes="125vh" />
          </ParallaxLayer>
          <ScrimOverlay scrimKey="home.hero" defaultHex="#181716" defaultOpacity={0.4} variant="gradient-top" />
          {/* pt reserves a safe zone for the overlaid header so the copy never rides under it */}
          <div className="relative z-10 w-full min-h-[68vh] sm:min-h-[92vh] px-6 sm:px-12 pt-36 sm:pt-44 pb-10 sm:pb-14 flex flex-col justify-end items-end">
            {/* No plate (Emily 2026-08-27: both the dark and the cream panel
                were rejected — text sits straight on the photo like the L&F
                reference). The drop shadow on the h1 is the only legibility
                aid, plus whatever scrim the portal sets. */}
            <div className="hero-rise w-full max-w-[320px] sm:max-w-md text-right" style={{ animationDelay: '0.35s' }}>
              {/* The tagline IS the h1 now. The "We see the mother" headline was
                  removed 2026-08-24; leaving the hero with no h1 at all would cost
                  the homepage its strongest on-page keyword signal. Visual weight
                  is unchanged — only the tag differs. */}
              <h1 className="font-serif text-cream-50 drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)] text-base sm:text-xl leading-relaxed mb-6">
                {s('hero.sub', 'Luxury organic baby shower gift boxes — For mama and baby')}
              </h1>
              <Link
                href={isEs ? '/es/canastillas' : '/boxes'}
                className="inline-block bg-[#7A8E7C] text-white font-serif text-base sm:text-lg tracking-[0.06em] uppercase px-9 py-3 hover:bg-[#6d8070] transition-colors"
              >
                {s('hero.cta', 'Shop Gift Boxes')}
              </Link>
            </div>
          </div>
          {/* HeroArrows self-hides per viewport when that breakpoint's list
              has fewer than 2 photos (same rule as RotatingImage). */}
          <HeroArrows
            webCount={(galleries.hero ?? []).filter(Boolean).length}
            mobileCount={(galleries['hero.mobile'] ?? []).filter(Boolean).length}
          />
        </section>

        {/* ── Launch marquee — runs right below the hero ── */}
        <PerksMarquee />

        {/* ── Best Sellers ── */}
        <PrebuiltBoxesSection />

        {/* ── The Collection — Unforgettable panel + box carousel; lavender divider beneath ──
             Spanish comes from the block's own `es` subtree (edited alongside
             English in Portal → Home Content), falling back to English. */}
        <TheCollection
          title={isEs ? content.unforgettable.es?.title || content.unforgettable.title : content.unforgettable.title}
          body={isEs ? content.unforgettable.es?.body || content.unforgettable.body : content.unforgettable.body}
          items={isEs && content.unforgettable.es?.items?.length ? content.unforgettable.es.items : content.unforgettable.items}
        />

        {/* ── Shop by Category — heading above the image tiles, styled like Best Sellers ── */}
        <div className="pt-2 sm:pt-4">
          <div className="px-6 mb-8 text-center">
            <p className="font-sans text-[13px] tracking-[0.18em] uppercase font-medium text-gold-500 mb-2">{s('cat.eyebrow', 'Curated sets for every new chapter — or start from scratch.')}</p>
            <h2 className="font-playfair text-[2rem] sm:text-[2.6rem] uppercase tracking-[0.01em] font-medium text-espresso leading-none">{s('cat.title', 'Shop by Category')}</h2>
          </div>
          <CollectionsSection initial={collectionsData ?? undefined} />
        </div>

        {/* ── Our Story teaser — one quiet line linking to the full story,
             framed by mirrored lavender dividers (top one flipped).
             The headline is the Story page's hero heading (Portal → Story). ── */}
        <section className="bg-white py-8 sm:py-10 px-6 text-center">
          <div className="flex justify-center mb-7 sm:mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/decor/lavender-divider.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className="w-full max-w-xl h-auto rotate-180" />
          </div>
          <p className="font-sans text-[12px] tracking-[0.18em] uppercase font-bold text-[#7A8E7C] mb-4">{s('story.eyebrow', 'Our Story')}</p>
          <h2 className="font-playfair text-2xl sm:text-3xl text-espresso leading-snug max-w-2xl mx-auto mb-6">{s('story.heading', story.hero.heading)}</h2>
          <Link
            // A Spanish reader clicking "Lee nuestra historia" landed on the
            // ENGLISH story page, even though /es/historia exists and the
            // footer already linked it correctly.
            href={isEs ? '/es/historia' : '/story'}
            className="inline-block font-sans text-[12px] tracking-[0.18em] uppercase text-espresso border-b border-espresso pb-1 hover:text-gold-500 hover:border-gold-500 transition-colors"
          >
            {s('story.cta', 'Read Our Story')}
          </Link>
          {/* Quiet corporate cross-link — the only homepage path to /corporate */}
          <p className="mt-6 font-sans text-[13px] text-bark-400">
            {s('corp.q', 'Gifting for your team or clients?')}{' '}
            <Link href="/corporate" className="underline underline-offset-2 hover:text-gold-500 transition-colors">{s('corp.cta', 'Explore corporate gifting')}</Link>
          </p>
          <div className="flex justify-center mt-7 sm:mt-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/decor/lavender-divider.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" className="w-full max-w-xl h-auto" />
          </div>
        </section>

        {/* ── What makes it special — full-bleed editorial photo with overlaid
             heading (client component; photo managed via Portal → Homepage). ── */}
        <SpecialFeature
          title={isEs ? content.why.es?.title || content.why.title : content.why.title}
          intro={isEs ? content.why.es?.intro || content.why.intro : content.why.intro}
        />

        {/* ── 8. Testimonials — shown only when NEXT_PUBLIC_SHOW_REVIEWS=true and there are real reviews ── */}
        {process.env.NEXT_PUBLIC_SHOW_REVIEWS === 'true' && content.reviews.items.length > 0 && (
          <SlotBackground slotKey="home.testimonials_bg" scrim="bg-cream-50/85" className="border-t border-cream-300">
            <section className="py-12 sm:py-16 px-6 sm:px-10">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                  <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-gold-400 mb-3">{content.reviews.eyebrow}</p>
                  <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-espresso">{content.reviews.title}</h2>
                  {content.reviews.ratingLine && (
                    <p className="font-sans text-[11px] tracking-[0.14em] text-gold-400 mt-3">{content.reviews.ratingLine}</p>
                  )}
                </div>
                <TestimonialsCarousel reviews={content.reviews.items} />
              </div>
            </section>
          </SlotBackground>
        )}

        {/* ── Instagram feed — shows when posts are uploaded in Portal → Social Feed
             (the Find Us contact strip lives in the footer now) ── */}
        {igPosts.length > 0 && (
          <section className="border-t border-cream-300 bg-[#FEF8F4]">
            <div>
              <div className="py-4 text-center">
                <a href="https://www.instagram.com/petitelavandeco" target="_blank" rel="noopener noreferrer"
                  className="font-sans text-[11px] tracking-[0.18em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
                  Follow @petitelavandeco on Instagram
                </a>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6">
                {igPosts.map((post, i) => (
                  <a key={post.id}
                    href={post.embed_url || 'https://www.instagram.com/petitelavandeco'}
                    target="_blank" rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden group bg-cream-200 block"
                  >
                    {post.media_url && (
                      <img
                        src={post.media_url}
                        alt={post.caption || `Petite Lavande post ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-bark-800/0 group-hover:bg-bark-800/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="none"/></svg>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </>
  )
}
