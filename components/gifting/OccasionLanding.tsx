import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { JsonLd } from '@/components/ui/JsonLd'
import { FaqAccordion } from '@/components/ui/FaqAccordion'
import { OccasionHero } from './OccasionHero'
import { GiftRecommendationSection } from './GiftRecommendationSection'
import { SocialProofStrip } from './SocialProofStrip'
import { TrackGiftList } from './TrackGiftList'
import { BasketReuseSection, DifferentiatorSection, HowGiftingWorks } from './sections'
import { Cta, Eyebrow, Lede, SectionTitle } from './primitives'
import { getSiteImages, type SiteImage } from '@/lib/site-images'
import { getBoxRatings, getGiftProofQuotes, getGiftProofSummary } from '@/lib/gift-social-proof'
import { freeShippingLine, giftLadder, occasionGifts, GIFT_PROMISES, type GiftOccasion } from '@/lib/gifting'
import { priceRange } from '@/lib/catalog-db'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import { SITE_URL } from '@/lib/site-config'

// ── The Meta ad landing page ────────────────────────────────────────────────
//
// One template, four occasions. Sending every ad to the homepage throws away
// the single cheapest conversion win there is: a visitor who clicked "bring
// something she won't receive three of" should land on a page whose first line
// is that promise, not on a page that starts by explaining the brand.
//
// The order is fixed and deliberate:
//   promise (message match) → three gifts → which one should I choose →
//   proof → why it's different → what arrives → questions
//
// Everything product-shaped resolves from the live catalog. A page with no
// products renders its hero and its FAQ rather than an empty grid.

const SECTION_SLOTS = [
  'gift.mama_and_baby', 'gift.mama_and_baby.mobile',
  'gift.basket_reuse', 'gift.basket_reuse.mobile',
  'gift.packing', 'gift.packing.mobile',
]

export async function OccasionLanding({ occasion }: { occasion: GiftOccasion }) {
  const [images, gifts, quotes, summary, ratings] = await Promise.all([
    getSiteImages([occasion.imageSlot, `${occasion.imageSlot}.mobile`, ...SECTION_SLOTS]).catch((): Record<string, SiteImage> => ({})),
    occasionGifts(occasion, 3),
    getGiftProofQuotes(4),
    getGiftProofSummary(),
    getBoxRatings(),
  ])

  const ladder = giftLadder(gifts)
  const url = `${SITE_URL}${occasion.path}`
  const promises = [freeShippingLine(FREE_SHIPPING_THRESHOLD), ...GIFT_PROMISES.slice(0, 2)]

  // The first gift's anchor is the hero's primary destination when the catalog
  // has something to sell; otherwise the hero points at the shop, so the button
  // is never a link to an empty grid.
  const shopHref = ladder.length > 0 ? '#gifts' : '/boxes'

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: occasion.cardTitle, item: url },
        ],
      }} />
      {ladder.length > 0 && (
        <JsonLd data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: occasion.h1,
          itemListElement: ladder.map((tier, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/boxes/${tier.product.slug}`,
            name: tier.product.name,
          })),
        }} />
      )}
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: occasion.faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }} />

      <Header />
      <main>
        <OccasionHero
          image={images[occasion.imageSlot] ?? null}
          mobileImage={images[`${occasion.imageSlot}.mobile`] ?? null}
          imageAlt={occasion.imageAlt}
          slotKey={occasion.imageSlot}
          eyebrow={occasion.eyebrow}
          headline={occasion.h1}
          sub={occasion.sub}
          primaryCta={occasion.primaryCta}
          primaryHref={shopHref}
          proof={promises}
        />

        {ladder.length > 0 && (
          <>
            <TrackGiftList
              listId={`occasion-${occasion.key}`}
              listName={occasion.cardTitle}
              items={ladder.map(t => ({
                id: `box-${t.product.slug}`,
                name: t.product.name,
                price: priceRange(t.product).low,
                category: 'Gift Box',
              }))}
            />
            <div id="gifts" className="scroll-mt-4">
              <GiftRecommendationSection
                tiers={ladder}
                ratings={ratings}
                eyebrow="Which should I choose?"
                title={<>Three gifts.<span className="block">One obvious answer.</span></>}
                lede="Pick by what the moment is worth to you — every one arrives packed by hand, ribbon-tied and ready to give."
                notesByIndex={[...occasion.ladder]}
                ctaLabel="See this gift"
                moreHref="/boxes"
                moreLabel="See every gift"
                priority
              />
            </div>
          </>
        )}

        <SocialProofStrip quotes={quotes} summary={summary} />

        <DifferentiatorSection images={images} href={occasion.key === 'new_mama' ? '/boxes' : '/new-mama-gifts'} />

        {/* What actually arrives — the presentation question, answered before
            it becomes a reason to hesitate. */}
        <HowGiftingWorks
          images={images}
          shipDirectNote="Sending it straight to her? Tick “This is a gift” at checkout and enter her address — receipts and confirmations still come to you, and nothing showing a price goes in the box."
        />

        <BasketReuseSection images={images} />

        <section className="bg-[color:var(--color-cream-white)] border-t border-[color:var(--color-oat)]">
          <div className="max-w-3xl mx-auto px-6 py-14 sm:py-18">
            <Eyebrow>Before you send it</Eyebrow>
            <SectionTitle className="mt-3 mb-8">Questions people ask.</SectionTitle>
            <FaqAccordion items={occasion.faqs} />

            <div className="mt-10 pt-8 border-t border-[color:var(--color-oat)] flex flex-col sm:flex-row sm:items-center gap-5 sm:justify-between">
              <Lede className="max-w-sm">Ready when you are — every gift is packed by hand and finished with your message.</Lede>
              <Cta href={shopHref} variant="primary" className="shrink-0 self-start">{occasion.primaryCta}</Cta>
            </div>

            {occasion.guide && (
              <p className="font-sans text-[13px] text-[color:var(--color-ink-soft)] mt-8">
                <Link href={occasion.guide.href} className="underline underline-offset-4 decoration-[color:var(--color-oat)] hover:decoration-[color:var(--color-ink)] transition-colors">
                  {occasion.guide.label}
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

/** Metadata for one occasion route, so the four page files stay five lines. */
export function occasionMetadata(occasion: GiftOccasion) {
  return {
    title: { absolute: occasion.metaTitle },
    description: occasion.metaDescription,
    alternates: { canonical: `${SITE_URL}${occasion.path}` },
    openGraph: {
      title: occasion.metaTitle,
      description: occasion.metaDescription,
      url: `${SITE_URL}${occasion.path}`,
      type: 'website' as const,
    },
    twitter: { card: 'summary_large_image' as const },
  }
}
