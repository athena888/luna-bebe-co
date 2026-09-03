import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { OccasionCard } from '@/components/gifting/OccasionCard'
import { GiftRecommendationSection } from '@/components/gifting/GiftRecommendationSection'
import { DifferentiatorSection, CorporateGiftBanner, BuildYourOwnFooterNote } from '@/components/gifting/sections'
import { Eyebrow, Lede } from '@/components/gifting/primitives'
import { getSiteImages, type SiteImage } from '@/lib/site-images'
import { getBoxRatings } from '@/lib/gift-social-proof'
import { giftLadder, shoppableBoxes, OCCASIONS } from '@/lib/gifting'
import { SITE_URL } from '@/lib/site-config'

// The hub the "Shop by Occasion" nav item points at.
//
// It exists so that nav item is a real destination rather than a menu with no
// page behind it, and so the four landing pages have one internal link hub
// crawlers can find them through. It is deliberately thin: its job is to route
// a visitor to the occasion page built to convert them, not to sell here.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { absolute: 'Gifts by Occasion — Baby Shower, New Mama, Newborn | Petite Lavande' },
  description: 'Find the gift for the moment you are celebrating — a baby shower, a new arrival, a new mother, or a gift from the whole team.',
  alternates: { canonical: `${SITE_URL}/occasions` },
  openGraph: {
    title: 'Find the gift for this moment | Petite Lavande',
    description: 'Baby shower, new arrival, new mama, or from the whole team — start with the moment.',
    url: `${SITE_URL}/occasions`,
    type: 'website',
  },
}

const SLOTS = [
  ...OCCASIONS.map(o => o.imageSlot),
  'gift.mama_and_baby', 'gift.mama_and_baby.mobile',
]

export default async function OccasionsPage() {
  const [images, boxes, ratings] = await Promise.all([
    getSiteImages(SLOTS).catch((): Record<string, SiteImage> => ({})),
    shoppableBoxes(),
    getBoxRatings(),
  ])
  const ladder = giftLadder(boxes)

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Gifts by occasion',
        itemListElement: OCCASIONS.map((o, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${SITE_URL}${o.path}`,
          name: o.cardTitle,
        })),
      }} />
      <Header />
      <main>
        <section className="pl-paper border-b border-[color:var(--color-oat)]">
          <div className="relative max-w-6xl mx-auto px-6 py-12 sm:py-16">
            <div className="max-w-xl">
              <Eyebrow>Who are you celebrating?</Eyebrow>
              <h1 className="font-playfair text-[color:var(--color-ink)] text-[2.2rem] sm:text-[3rem] leading-[1.06] mt-3">
                Find the gift for this moment.
              </h1>
              <Lede className="mt-4">
                Start with the occasion and we will show you the three gifts that fit it — every one
                packed by hand, ribbon-tied, and finished with your message.
              </Lede>
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
                  priority={i < 2}
                />
              ))}
            </div>
          </div>
        </section>

        <GiftRecommendationSection
          tiers={ladder}
          ratings={ratings}
          eyebrow="Not sure which moment?"
          title={<>Beautiful choices.<span className="block">No overthinking required.</span></>}
          moreHref="/boxes"
          moreLabel="See every gift"
        />

        <DifferentiatorSection images={images} />
        <CorporateGiftBanner />
        <BuildYourOwnFooterNote />
      </main>
      <Footer />
    </>
  )
}
