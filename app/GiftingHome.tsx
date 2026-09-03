import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { HomeHero, type HeroPhoto } from '@/components/gifting/HomeHero'
import { ShopByMoment } from '@/components/gifting/ShopByMoment'
import { GiftRecommendationSection } from '@/components/gifting/GiftRecommendationSection'
import { SocialProofStrip } from '@/components/gifting/SocialProofStrip'
import { UGCSection } from '@/components/gifting/UGCCard'
import {
  BasketReuseSection,
  BuildYourOwnFooterNote,
  CorporateGiftBanner,
  DifferentiatorSection,
  FounderNote,
  HowGiftingWorks,
  LittleCompanionsSection,
  MaterialStory,
} from '@/components/gifting/sections'
import { getHomeGalleries, getSiteImages, type SiteImage } from '@/lib/site-images'
import { getStoryContent } from '@/lib/story-content'
import { getCompanions, giftLadder, shoppableBoxes, freeShippingLine, GIFT_PROMISES } from '@/lib/gifting'
import { getBoxRatings, getFeaturedUgc, getGiftProofQuotes, getGiftProofSummary } from '@/lib/gift-social-proof'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/products'

// ── The homepage ─────────────────────────────────────────────────────────────
//
// Built in one psychological order, and the order is the point:
//
//   DESIRE → THIS IS FOR MY SITUATION → SHOW ME WHAT TO BUY → PROVE OTHERS
//   TRUST IT → WHY IT IS DIFFERENT → REDUCE MY ANXIETY → DEEPEN THE WORLD
//
// Which is why the founder's letter is section 11 and not section 2, why proof
// sits with the products rather than at the bottom, and why four photographed
// moments come before any category grid. A visitor arriving from an Instagram
// ad has about five seconds to learn what this is, who it's for, why it's
// different, which occasion it solves, and which button to press.
//
// Every product on this page resolves from the live catalog; every review is an
// approved row; every customer photo was granted rights and marked featured by
// a person. When any of those return nothing, the section disappears rather
// than filling itself in.
//
// Spanish (/es) deliberately keeps the previous homepage — see app/HomeView.tsx.
// This redesign targets cold US Meta traffic, and shipping a half-translated
// funnel would be worse for a Spanish visitor than the page they have today.

const HERO_SLOTS = ['gift.hero', 'gift.hero.mobile']
const SECTION_SLOTS = [
  'gift.occasion.baby_shower', 'gift.occasion.new_mama', 'gift.occasion.new_arrival', 'gift.occasion.team',
  'gift.mama_and_baby', 'gift.mama_and_baby.mobile',
  'gift.basket_reuse', 'gift.basket_reuse.mobile',
  'gift.companions', 'gift.companions.mobile',
  'gift.material', 'gift.material.2', 'gift.material.3',
  'gift.packing', 'gift.packing.mobile',
]

export default async function GiftingHome() {
  // One batched read for every managed photo on the page, resolved on the
  // server. The old homepage mounted a client island per slot and fetched them
  // after hydration, which cost a round trip and a visible shift on exactly
  // the traffic that can least afford either.
  const [images, legacyHero, boxes, quotes, summary, ratings, ugc, story, companions] = await Promise.all([
    getSiteImages([...HERO_SLOTS, ...SECTION_SLOTS]).catch((): Record<string, SiteImage> => ({})),
    getHomeGalleries(['hero', 'hero.mobile']).catch(() => ({ hero: [], 'hero.mobile': [] })),
    shoppableBoxes(),
    getGiftProofQuotes(4),
    getGiftProofSummary(),
    getBoxRatings(),
    getFeaturedUgc(5),
    getStoryContent().catch(() => null),
    getCompanions(3),
  ])

  const heroPhoto: HeroPhoto = {
    desktop: images['gift.hero'] ?? null,
    mobile: images['gift.hero.mobile'] ?? null,
    // Until the purpose-shot hero exists, the existing rotating gallery's first
    // frame keeps the page whole. It is product-forward rather than
    // gift-forward, which is exactly why it is the fallback and not the plan.
    legacy: legacyHero['hero']?.[0] ?? null,
  }

  const promises = [freeShippingLine(FREE_SHIPPING_THRESHOLD), ...GIFT_PROMISES.slice(0, 2)]
  const ladder = giftLadder(boxes)

  // Her own words, from Portal → Story. The homepage carries one paragraph of
  // it; the rest lives on /story where someone who wants it can go and read it.
  const founderBody =
    story?.founder.paragraphs?.[1]
    ?? 'I wanted something a mother would open and feel, for a moment, that she was being celebrated too. I couldn’t find it. So I built it.'

  return (
    <>
      <Header overHero />
      <main>
        {/* 1 — DESIRE */}
        <HomeHero photo={heroPhoto} proof={promises} />

        {/* 2 — THIS IS FOR MY SITUATION */}
        <ShopByMoment images={images} />

        {/* 3 — SHOW ME WHAT TO BUY */}
        <GiftRecommendationSection
          tiers={ladder}
          ratings={ratings}
          eyebrow="Our most-loved gifts"
          title={<>Beautiful choices.<span className="block">No overthinking required.</span></>}
          lede="Three gifts, one for every kind of moment. Pick the one that fits and we do the rest."
          moreHref="/boxes"
          moreLabel="See every gift"
        />

        {/* 4 — PROVE OTHER PEOPLE TRUST IT (nothing renders without real reviews) */}
        <SocialProofStrip quotes={quotes} summary={summary} />

        {/* 5 — WHY IT IS DIFFERENT */}
        <DifferentiatorSection images={images} />

        {/* 6 — the basket is part of the gift, not the packaging */}
        <BasketReuseSection images={images} />

        {/* 7 — the little world */}
        <LittleCompanionsSection images={images} companions={companions} />

        {/* 8 — how it feels */}
        <MaterialStory images={images} />

        {/* 9 — REDUCE MY PURCHASE ANXIETY */}
        <HowGiftingWorks
          images={images}
          shipDirectNote="Sending it straight to her? Tick “This is a gift” at checkout and enter her address — receipts and confirmations still come to you, and nothing showing a price goes in the box."
        />

        {/* 10 — DEEPER PROOF (renders only when customers have sent photos) */}
        <UGCSection
          items={ugc}
          eyebrow="From the people who sent one"
          title={<>The kind of gift they remember.</>}
        />

        {/* 11 — the founder, here rather than at the top */}
        <FounderNote
          heading="Made for the people we wish we could be closer to."
          body={founderBody}
        />

        {/* 12 — corporate */}
        <CorporateGiftBanner />

        {/* Build Your Own — kept, demoted, and never the cold-traffic path */}
        <BuildYourOwnFooterNote />
      </main>
      <Footer />
    </>
  )
}
