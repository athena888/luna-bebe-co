import Link from 'next/link'
import Image from 'next/image'
import { coverImage, giftLine, type GiftTier } from '@/lib/gifting'
import { PriceLabel } from './primitives'

// One rung of the entry / signature / heirloom ladder.
//
// The card answers "which one should I choose?" — not "what are all thirteen
// objects inside?". So: one photo, the name, the price, one sentence of reason,
// the occasion it suits, real rating if there is one, and a single CTA. A
// contents inventory belongs on the product page, after the visitor has chosen.

export interface TierCardProps {
  tier: GiftTier
  /** The moments this box is the right answer to, from BEST_FOR_BY_SLUG. */
  bestFor?: string | null
  /** The rung's own phrase on an occasion page ("The signature baby shower
   *  gift"). Kept separate from `bestFor` so neither has to be worded to read
   *  correctly after the other's label. */
  note?: string
  /** Real approved-review count for this box, or null. Never a placeholder. */
  reviews?: { average: number; count: number } | null
  ctaLabel?: string
  priority?: boolean
}

function Stars({ value }: { value: number }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} viewBox="0 0 20 20" className="w-3 h-3" fill={n <= rounded ? 'var(--color-dusty-rose)' : 'none'} stroke="var(--color-dusty-rose)" strokeWidth="1.4">
          <path d="M10 1.6l2.5 5.3 5.6.8-4.1 4 1 5.7-5-2.7-5 2.7 1-5.7-4.1-4 5.6-.8z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}

export function GiftTierCard({ tier, bestFor, note, reviews, ctaLabel = 'See this gift', priority = false }: TierCardProps) {
  const { product } = tier
  const cover = coverImage(product)
  const href = `/boxes/${product.slug}`
  const line = giftLine(product) || tier.reason

  return (
    <article
      className={`group relative flex flex-col bg-[color:var(--color-cream-white)] border ${
        // The recommended rung reads as recommended. On a "which should I
        // choose?" grid, three identical frames put the decision back on the
        // visitor — which is the decision they came here to have made for them.
        tier.mostLoved
          ? 'border-[color:var(--color-burgundy)] sm:-mt-3 sm:shadow-[0_10px_30px_rgba(75,63,55,0.10)]'
          : 'border-[color:var(--color-oat)]'
      }`}
    >
      {tier.mostLoved && (
        <p className="absolute top-0 left-0 z-10 bg-[color:var(--color-burgundy)] text-[color:var(--color-parchment)] pl-eyebrow px-3 py-1.5">
          Most loved
        </p>
      )}

      <Link href={href} className="block" tabIndex={-1} aria-hidden="true">
        {/* Square on phones, portrait from sm: a 4:5 crop on a 390px screen
            pushes the price and the button most of a screen down, and the
            price is half the decision. */}
        <div className="relative aspect-square sm:pl-ratio-45 w-full bg-[color:var(--color-parchment)] overflow-hidden">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              quality={88}
              priority={priority}
              sizes="(max-width: 639px) 92vw, (max-width: 1023px) 46vw, 31vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center pl-eyebrow text-[color:var(--color-ink-soft)]/60">
              Photography coming soon
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-5 sm:p-6">
        <p className="pl-eyebrow text-[color:var(--color-ink-soft)]">{tier.tierLabel}</p>

        <h3 className="font-playfair text-[1.5rem] leading-tight text-[color:var(--color-ink)] mt-1.5">
          <Link href={href} className="hover:text-[color:var(--color-burgundy)] transition-colors">
            {product.name}
          </Link>
        </h3>

        <p className="font-sans text-[14px] leading-relaxed text-[color:var(--color-ink-soft)] mt-2">{line}</p>

        {bestFor && (
          <p className="font-sans text-[12px] tracking-[0.04em] text-[color:var(--color-ink-soft)]/80 mt-3">
            <span className="pl-eyebrow text-[color:var(--color-soft-sage)]">Best for</span>{' '}
            {bestFor}
          </p>
        )}

        {note && (
          <p className="font-sans text-[12px] italic text-[color:var(--color-ink-soft)]/80 mt-1.5">{note}</p>
        )}

        {reviews && (
          <p className="flex items-center gap-2 mt-3">
            <Stars value={reviews.average} />
            <span className="font-sans text-[12px] text-[color:var(--color-ink-soft)]">
              {reviews.average.toFixed(1)} · {reviews.count} {reviews.count === 1 ? 'review' : 'reviews'}
            </span>
          </p>
        )}

        {/* Price sits directly above the CTA — the two decisions a gift buyer
            makes together should never be separated by a scroll. */}
        <div className="mt-auto pt-5">
          <PriceLabel low={tier.low} high={tier.high} className="block text-[1.35rem] text-[color:var(--color-ink)]" />
          <Link
            href={href}
            className="mt-3 w-full inline-flex items-center justify-center bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-sans text-[12px] tracking-[0.16em] uppercase font-semibold px-6 py-3.5 hover:bg-[color:var(--color-burgundy)] transition-colors"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  )
}
