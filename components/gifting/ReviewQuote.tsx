import Image from 'next/image'
import type { ProofQuote } from '@/lib/gift-social-proof'

// One real, approved review. Rendered only from data; there is no prop that
// lets a caller pass in text of their own invention.

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} viewBox="0 0 20 20" style={{ width: size, height: size }} fill={n <= rounded ? 'var(--color-dusty-rose)' : 'none'} stroke="var(--color-dusty-rose)" strokeWidth="1.4" aria-hidden="true">
          <path d="M10 1.6l2.5 5.3 5.6.8-4.1 4 1 5.7-5-2.7-5 2.7 1-5.7-4.1-4 5.6-.8z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  )
}

export function ReviewQuote({ quote, featured = false }: { quote: ProofQuote; featured?: boolean }) {
  return (
    <figure className={featured ? 'text-center max-w-2xl mx-auto' : ''}>
      <Stars value={quote.rating} size={featured ? 16 : 13} />
      <blockquote
        className={`font-playfair text-[color:var(--color-ink)] mt-3 ${
          featured ? 'text-[1.4rem] sm:text-[1.9rem] leading-snug' : 'text-[1.05rem] leading-snug'
        }`}
      >
        &ldquo;{quote.quote}&rdquo;
      </blockquote>
      <figcaption className="font-sans text-[12px] tracking-[0.08em] text-[color:var(--color-ink-soft)] mt-3">
        {quote.name}
      </figcaption>
      {quote.imageUrl && (
        <div className="relative w-full pl-ratio-45 mt-4 overflow-hidden bg-[color:var(--color-parchment)]">
          <Image src={quote.imageUrl} alt="" fill sizes="(max-width: 639px) 88vw, 30vw" className="object-cover" />
        </div>
      )}
    </figure>
  )
}

export { Stars as ReviewStars }
