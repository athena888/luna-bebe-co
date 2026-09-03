import { GiftTierCard } from './GiftTierCard'
import { Cta, Eyebrow, Lede, SectionTitle } from './primitives'
import { bestForLabel, type GiftTier } from '@/lib/gifting'
import type { ProofSummary } from '@/lib/gift-social-proof'

// SECTION 3 — the immediate product decision.
//
// Three choices, never more. A gift buyer's question is "which one should I
// choose?", and every card past the third turns that into "how do I compare
// eleven of these?", which is the question people close a tab over.
//
// Renders nothing when the catalog returns no products: a heading over an empty
// grid is worse than no section, and a placeholder product would be a lie.

export function GiftRecommendationSection({
  tiers,
  ratings = {},
  eyebrow = 'Our most-loved gifts',
  title,
  lede,
  notesByIndex,
  ctaLabel,
  moreHref,
  moreLabel,
  className = '',
  priority = false,
}: {
  tiers: GiftTier[]
  ratings?: Record<string, ProofSummary>
  eyebrow?: string
  title: React.ReactNode
  lede?: string
  /** The rung's own phrase per index, on an occasion page. The "best for"
   *  line beside it comes from the catalog's own occasion mapping. */
  notesByIndex?: string[]
  ctaLabel?: string
  moreHref?: string
  moreLabel?: string
  className?: string
  priority?: boolean
}) {
  if (tiers.length === 0) return null

  return (
    <section className={`bg-[color:var(--color-cream-white)] ${className}`}>
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-20">
        <div className="max-w-2xl">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SectionTitle className="mt-3">{title}</SectionTitle>
          {lede && <Lede className="mt-4 max-w-lg">{lede}</Lede>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mt-9">
          {tiers.map((tier, i) => (
            <GiftTierCard
              key={tier.product.slug}
              tier={tier}
              bestFor={bestForLabel(tier.product.slug)}
              note={notesByIndex?.[i]}
              reviews={ratings[tier.product.slug] ?? null}
              ctaLabel={ctaLabel}
              priority={priority && i === 0}
            />
          ))}
        </div>

        {moreHref && moreLabel && (
          <div className="mt-10">
            <Cta href={moreHref} variant="quiet">{moreLabel}</Cta>
          </div>
        )}
      </div>
    </section>
  )
}
