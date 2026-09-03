import { OccasionCard } from './OccasionCard'
import { Eyebrow, SectionTitle } from './primitives'
import { OCCASIONS } from '@/lib/gifting'
import type { SiteImage } from '@/lib/site-images'

// SECTION 2 — shop by moment.
//
// Very early, and above any brand storytelling. The visitor's first question
// after "what is this?" is "is this for my situation?", and four photographed
// moments answer it faster than a category menu ever can. Blankets, Clothing,
// Toys, Bath is a warehouse taxonomy; The Baby Shower / She Just Had The Baby /
// Welcome Little One / From The Whole Team is how the purchase is actually
// thought about.

export function ShopByMoment({ images }: { images: Record<string, SiteImage> }) {
  return (
    <section className="pl-paper">
      <div className="relative max-w-6xl mx-auto px-6 py-12 sm:py-16">
        <div className="text-center max-w-xl mx-auto">
          <Eyebrow>Who are you celebrating?</Eyebrow>
          <SectionTitle className="mt-3">Find the gift for this moment.</SectionTitle>
        </div>
        {/* Two-up on phones, not one. Four full-width 4:5 cards is four
            screens of scrolling before the first price — and the section after
            this one is the product decision. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-9">
          {OCCASIONS.map((occasion, i) => (
            <OccasionCard
              key={occasion.key}
              occasion={occasion}
              image={images[occasion.imageSlot] ?? null}
              // The first card sits just below the fold on phones; loading it
              // eagerly costs one request and removes the most visible pop-in
              // on the page.
              priority={i === 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
