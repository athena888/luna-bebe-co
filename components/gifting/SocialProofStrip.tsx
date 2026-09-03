import { ReviewQuote, ReviewStars } from './ReviewQuote'
import type { ProofQuote, ProofSummary } from '@/lib/gift-social-proof'

// Proof placed WITH the product decision rather than at the bottom of the page.
// The whole component returns null when there is nothing approved to show —
// an empty testimonial rail is worse than no testimonial rail, and inventing
// one is not on the table.

export function SocialProofStrip({ quotes, summary, className = '' }: {
  quotes: ProofQuote[]
  summary: ProofSummary | null
  className?: string
}) {
  if (quotes.length === 0) return null
  const [lead, ...rest] = quotes

  return (
    <section className={`pl-paper ${className}`} aria-label="Customer reviews">
      <div className="relative max-w-5xl mx-auto px-6 py-14 sm:py-20">
        {summary && (
          <p className="flex items-center justify-center gap-3 mb-8">
            <ReviewStars value={summary.average} size={16} />
            <span className="font-sans text-[13px] text-[color:var(--color-ink-soft)]">
              {summary.average.toFixed(1)} from {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            </span>
          </p>
        )}

        <ReviewQuote quote={lead} featured />

        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 mt-12 pt-10 border-t border-[color:var(--color-oat)]">
            {rest.slice(0, 3).map(q => <ReviewQuote key={q.id} quote={q} />)}
          </div>
        )}
      </div>
    </section>
  )
}
