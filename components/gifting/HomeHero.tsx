import { SlotPhoto, PhotoPending } from './SlotPhoto'
import { Cta, Eyebrow, ProofLine } from './primitives'
import type { SiteImage } from '@/lib/site-images'

// SECTION 1 — the homepage hero.
//
// Five seconds, five answers: what this is, who it's for, why it's different,
// which occasion it solves, which button to press. The headline carries the
// positioning; the two buttons carry the two occasions that account for most
// cold traffic; the proof line closes the three anxieties that follow.
//
// The layout differs by device, but the MARKUP does not: one h1, one set of
// buttons, one proof list. Rendering a phone block and a desktop block and
// hiding one with CSS would give the page two h1s and two of every link, which
// is a real SEO and accessibility defect for a purely visual difference.
//
// So: on phones the photo is a bounded band with the copy beneath it, because a
// full-viewport hero image pushes headline, support and button below the fold —
// the single most expensive mistake on ad-driven mobile. From `lg` the same
// photo becomes the full-bleed background and the same copy sits over its left
// third, where there is height to spare for both.

export interface HeroPhoto {
  desktop: SiteImage | null
  mobile: SiteImage | null
  /** Last-resort frame from the existing rotating hero gallery. */
  legacy: string | null
}

const HERO_ALT =
  'An open Petite Lavande gift basket with a crochet companion, a baby piece, something chosen for Mama, ribbon and a handwritten card'

export function HomeHero({ photo, proof }: { photo: HeroPhoto; proof: readonly string[] }) {
  // The legacy gallery frame keeps the page whole until the purpose-shot hero
  // exists. It is product-forward rather than gift-forward, which is exactly
  // why it is the fallback and not the plan.
  const desktop = photo.desktop ?? (photo.legacy ? { public_url: photo.legacy, alt_text: '' } : null)
  const mobile = photo.mobile

  return (
    <section className="relative pl-paper">
      {/* Phones: a band in normal flow. lg: the same element goes full-bleed
          behind the copy. One <picture>, so only one crop is ever downloaded. */}
      <div className="relative w-full h-[40vh] min-h-[14rem] max-h-[22rem] lg:absolute lg:inset-0 lg:h-full lg:max-h-none lg:min-h-0">
        <SlotPhoto
          image={desktop}
          mobileImage={mobile}
          mobileMedia="(max-width: 1023px)"
          alt={HERO_ALT}
          // The LCP element on the highest-traffic page: eager, high fetch
          // priority, never lazy.
          priority
          className="absolute inset-0 w-full h-full"
          sizes="100vw"
          fallback={<PhotoPending label="Photo pending · gift.hero" />}
        />
        {/* Legibility scrim — desktop only, where the copy sits on the photo.
            Drawn whether or not a photo is set, so the copy is never tuned
            against the wrong contrast. */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-0"
          style={{ backgroundImage: 'linear-gradient(to right, rgba(46,38,33,0.80), rgba(46,38,33,0.52) 42%, rgba(46,38,33,0.06) 72%)' }}
        />
      </div>

      <div className="relative px-6 pt-7 pb-9 lg:px-10 xl:px-14 lg:py-0 lg:min-h-[38rem] xl:lg:min-h-[42rem] lg:flex lg:items-center">
        <div className="lg:max-w-6xl lg:w-full lg:mx-auto">
          <div className="lg:max-w-lg">
            <Eyebrow tone="responsive">A gift for two</Eyebrow>

            <h1 className="font-playfair text-[color:var(--color-ink)] lg:text-[color:var(--color-parchment)] text-[2.1rem] lg:text-[3.4rem] xl:text-[4rem] leading-[1.05] lg:leading-[1.02] mt-2.5 lg:mt-4">
              For the baby.
              <span className="block italic text-[color:var(--color-burgundy)] lg:text-[color:var(--color-dusty-rose)]">
                For her, too.
              </span>
            </h1>

            <p className="font-sans text-[15px] lg:text-[17px] leading-relaxed text-[color:var(--color-ink-soft)] lg:text-[color:var(--color-parchment)]/90 mt-3.5 lg:mt-5 max-w-md">
              Beautifully prepared gifts for baby showers, new arrivals, and the mothers at the heart of them.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mt-6 lg:mt-8">
              <Cta
                href="/baby-shower-gifts"
                variant="heroPrimary"
                className="w-full sm:w-auto"
              >
                Shop baby shower gifts
              </Cta>
              <Cta
                href="/new-mama-gifts"
                variant="heroSecondary"
                className="w-full sm:w-auto"
              >
                Send a new mama gift
              </Cta>
            </div>

            <ProofLine items={[...proof]} tone="responsive" className="mt-6 lg:mt-8" />
          </div>
        </div>
      </div>
    </section>
  )
}
