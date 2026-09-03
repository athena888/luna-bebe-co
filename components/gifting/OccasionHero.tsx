import { SlotPhoto, PhotoPending } from './SlotPhoto'
import { Cta, Eyebrow, ProofLine } from './primitives'
import type { SiteImage } from '@/lib/site-images'

// The hero for a Meta ad landing page.
//
// Mobile is the whole design constraint: a visitor arriving from an ad must see
// the headline, one line of support and the primary button WITHOUT scrolling.
// So the photo is a bounded band above the copy on phones — not a full-viewport
// image the headline hides beneath — and becomes a split with the copy on
// desktop, where there is room for both.

export function OccasionHero({
  image,
  mobileImage,
  imageAlt,
  eyebrow,
  headline,
  sub,
  primaryCta,
  primaryHref,
  secondaryCta,
  secondaryHref,
  proof,
  slotKey,
}: {
  image: SiteImage | null
  mobileImage?: SiteImage | null
  imageAlt: string
  eyebrow: string
  headline: React.ReactNode
  sub: string
  primaryCta: string
  primaryHref: string
  secondaryCta?: string
  secondaryHref?: string
  proof: readonly string[]
  slotKey: string
}) {
  return (
    <section className="pl-paper border-b border-[color:var(--color-oat)]">
      <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        {/* Photo: capped at 42vh on phones so the copy and the button are
            always on the first screen. It is the LCP element either way, so it
            loads eagerly at high priority — never lazily. */}
        <SlotPhoto
          image={image}
          mobileImage={mobileImage}
          alt={imageAlt}
          priority
          className="w-full h-[42vh] min-h-[15rem] lg:h-auto lg:min-h-[32rem] order-1"
          sizes="(max-width: 1023px) 100vw, 50vw"
          fallback={<PhotoPending label={`Photo pending · ${slotKey}`} />}
        />

        <div className="order-2 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-9 sm:py-12 lg:py-16">
          <Eyebrow>{eyebrow}</Eyebrow>
          {/* The one h1 on the page. */}
          <h1 className="font-playfair text-[color:var(--color-ink)] text-[2rem] sm:text-[2.7rem] lg:text-[3rem] leading-[1.06] mt-3">
            {headline}
          </h1>
          <p className="font-sans text-[15px] sm:text-base leading-relaxed text-[color:var(--color-ink-soft)] mt-4 max-w-md">
            {sub}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7">
            <Cta href={primaryHref} variant="primary">{primaryCta}</Cta>
            {secondaryCta && secondaryHref && (
              <Cta href={secondaryHref} variant="secondary">{secondaryCta}</Cta>
            )}
          </div>

          <ProofLine items={[...proof]} className="mt-7" />
        </div>
      </div>
    </section>
  )
}
