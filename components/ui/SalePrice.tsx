import { formatDollars } from '@/lib/products'
import { foundingBadge } from '@/lib/promo'

// One renderer for promo pricing, so every surface strikes through the same
// way. Passing salePrice={null} renders exactly what the site rendered before
// the promotion existed — that is what makes the sold-out revert a one-line
// change rather than an audit of every price on the site.

export function SalePrice({
  price, salePrice, locale = 'en', className = '', badge = true, remaining = 0,
}: {
  price: number
  salePrice: number | null
  locale?: 'en' | 'es'
  className?: string
  /** Cards in a dense grid suppress the badge; product pages show it. */
  badge?: boolean
  /** Founding boxes still available — the badge counts down from this. */
  remaining?: number
}) {
  if (salePrice == null) {
    return <p className={`font-sans text-2xl text-espresso ${className}`}>{formatDollars(price)}</p>
  }
  return (
    <div className={className}>
      <p className="font-sans text-2xl text-espresso flex items-baseline gap-2 flex-wrap">
        <span>{formatDollars(salePrice)}</span>
        {/* line-through on its own is ambiguous to a screen reader — the
            label says which number is the old one. */}
        <span className="text-base text-bark-400 line-through" aria-label={locale === 'es' ? 'Precio regular' : 'Regular price'}>
          {formatDollars(price)}
        </span>
      </p>
      {badge && <FoundingBadge locale={locale} remaining={remaining} />}
    </div>
  )
}

export function FoundingBadge({ locale = 'en', className = '', remaining = 0 }: { locale?: 'en' | 'es'; className?: string; remaining?: number }) {
  return (
    <span className={`inline-block mt-2 font-sans text-[10px] tracking-[0.14em] uppercase border border-[#7A8E7C] text-[#7A8E7C] px-2 py-1 ${className}`}>
      {foundingBadge(remaining, locale)}
    </span>
  )
}

/** Compact form for cards: "$68" with the old price small beside it. */
export function SalePriceInline({ price, salePrice }: { price: number; salePrice: number | null }) {
  if (salePrice == null) return <>{formatDollars(price)}</>
  return (
    <>
      {formatDollars(salePrice)}{' '}
      <span className="text-bark-400 line-through">{formatDollars(price)}</span>
    </>
  )
}
