import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { EditorialFeature } from '@/components/ui/EditorialFeature'
import { StepsFeature } from '@/components/ui/StepsFeature'
import { EditorialStrip } from '@/components/ui/EditorialStrip'
import { CollectionsSection } from '@/components/ui/CollectionsSection'
import { PrebuiltBoxesSection } from '@/components/ui/PrebuiltBoxesSection'
import { RotatingImage } from '@/components/ui/RotatingImage'
import { ScrimOverlay } from '@/components/ui/ScrimOverlay'
import { ParallaxLayer } from '@/components/ui/ParallaxLayer'
import { getHomeContent } from '@/lib/home-content'
import { getHomeGalleries } from '@/lib/site-images'
import { getActiveSocialPosts } from '@/lib/social-posts'
import { Package, PenLine, Leaf, Heart } from 'lucide-react'
import { TestimonialsCarousel } from '@/components/ui/TestimonialsCarousel'
import { SlotBackground } from '@/components/ui/SlotBackground'

// Icons for the under-hero perks bar, mapped by index to the default perks.
const PERK_ICONS = [Package, PenLine, Leaf, Heart]

export const metadata: Metadata = {
  // `absolute` so the "| Petite Lavande" template isn't appended (avoids the
  // brand name appearing twice in the homepage title).
  title: { absolute: 'Petite Lavande — Luxury Organic Baby & New-Mama Gift Boxes' },
  description: 'Bespoke luxury baby gift boxes — soft GOTS-cotton organic clothing, gentle botanical care, and a personalized printed card. Newborn & postpartum gifts, finished by hand and shipped with love.',
  keywords: ['organic baby gift box', 'luxury baby gift', 'newborn gift box', 'postpartum gift', 'new mama gift'],
  alternates: { canonical: process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com' },
  openGraph: { title: 'Petite Lavande — Luxury Organic Baby Gifts', description: 'Organic newborn & postpartum gift boxes — built item by item, finished by hand, shipped with love.' },
}

// Revalidate bestsellers periodically so they reflect real sales
export const revalidate = 300

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function homeImg(slot: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/home-images/${slot}.jpg`
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
  const [collectionsData, content, galleries, igPosts] = await Promise.all([
    getCollectionsData(), getHomeContent(), getHomeGalleries(['hero', 'box', 'brand', 'inside']), getActiveSocialPosts(6),
  ])

  return (
    <>
      <Header overHero />
      <main>

        {/* ── 1. Hero ── */}
        <section className="relative w-full min-h-[85vh] sm:min-h-[92vh] bg-cream-200 overflow-hidden">
          <ParallaxLayer>
            <RotatingImage urls={galleries.hero} alt="Petite Lavande — Timeless Moments, Made With Love" className="hero-fade" />
          </ParallaxLayer>
          <ScrimOverlay scrimKey="home.hero" defaultHex="#181716" defaultOpacity={0.4} variant="gradient-top" />
          {/* pt reserves a safe zone for the fixed header so the copy never rides under it */}
          <div className="relative z-10 w-full min-h-[85vh] sm:min-h-[92vh] px-6 sm:px-12 pt-36 sm:pt-44 pb-10 sm:pb-14 flex flex-col justify-end items-end">
            <div className="hero-rise w-full max-w-[300px] sm:max-w-sm text-right" style={{ animationDelay: '0.35s' }}>
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

        {/* ── Curated Gift Sets — moved to right below the hero ── */}
        <PrebuiltBoxesSection />

        {/* ── Shop by Occasion — images only ── */}
        <div className="border-t border-cream-300">
          <CollectionsSection initial={collectionsData ?? undefined} />
        </div>

        {/* ── What makes it special — editable intro + editorial features, all from Portal → Home Content ── */}
        <section className="border-t border-cream-300 bg-cream-white">

          {/* Editable intro */}
          <div className="max-w-3xl mx-auto text-center px-6 sm:px-8 pt-10 sm:pt-14 pb-6 sm:pb-10">
            <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">{content.why.eyebrow}</p>
            <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-espresso leading-tight mb-5">{content.why.title}</h2>
            <p className="font-cormorant text-lg sm:text-xl text-bark-400 leading-loose">
              {content.why.intro}
            </p>
          </div>

          {/* Editable image features — image + copy edited together in the portal.
              Images alternate flush-left / flush-right as they fly in. */}
          {content.why.features.map((f, i) => {
            const imgs = galleries[f.slot] ?? [homeImg(f.slot)]
            // First beat = the "Create Something Unforgettable" 3-step how-it-works.
            if (i === 0) return <StepsFeature key={i} images={imgs} side="left" />
            const bullets = f.bullets.filter(b => b.trim())
            return (
              <EditorialFeature key={i} images={imgs} alt={f.eyebrow || 'Petite Lavande'} side={i % 2 === 0 ? 'left' : 'right'}>
                {f.eyebrow && <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-5">{f.eyebrow}</p>}
                <h2 className="font-serif text-[2rem] sm:text-[2.75rem] text-espresso leading-[1.05] mb-5 whitespace-pre-line">{f.title}</h2>
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

        {/* ── Editorial strip — video or image ── */}
        <EditorialStrip />

        {/* ── 8. Testimonials — shown only when NEXT_PUBLIC_SHOW_REVIEWS=true and there are real reviews ── */}
        {process.env.NEXT_PUBLIC_SHOW_REVIEWS === 'true' && content.reviews.items.length > 0 && (
          <SlotBackground slotKey="home.testimonials_bg" scrim="bg-cream-50/85" className="border-t border-cream-300">
            <section className="py-12 sm:py-16 px-6 sm:px-10">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                  <p className="font-sans text-[9px] tracking-[0.45em] uppercase text-gold-400 mb-3">{content.reviews.eyebrow}</p>
                  <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-espresso">{content.reviews.title}</h2>
                  {content.reviews.ratingLine && (
                    <p className="font-sans text-[11px] tracking-[0.2em] text-gold-400 mt-3">{content.reviews.ratingLine}</p>
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
                  className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
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
