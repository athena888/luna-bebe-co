import Link from 'next/link'
import { foundingBadge } from '@/lib/promo'
import { foundingPromoState } from '@/lib/promo-state'

// Site-wide announcement bar for the Founding Families launch.
//
// Rendered from the ROOT layout so it rides above every storefront page: the
// promotion's whole value is that a visitor from Instagram knows about it
// before they click into a box, and until now it only appeared once you were
// already on a product page.
//
// Renders NOTHING when the promo is off (sold out, outside its window, killed
// by env, or the count is unreadable) — no empty bar, no layout shift.

export async function FoundingBanner({ locale = 'en' }: { locale?: 'en' | 'es' }) {
  const promo = await foundingPromoState()
  if (!promo.active || promo.remaining <= 0) return null

  const isEs = locale === 'es'
  return (
    <div className="w-full bg-[#7A8E7C] text-white">
      <Link
        href={isEs ? '/es/canastillas' : '/boxes'}
        className="block max-w-6xl mx-auto px-6 py-2 text-center hover:opacity-90 transition-opacity"
      >
        <span className="font-sans text-[11px] sm:text-xs tracking-[0.14em] uppercase">
          {/* The count is the message. "15% off" alone is a sale; a number that
              goes down is a reason to act today. */}
          {foundingBadge(promo.remaining, isEs ? 'es' : 'en')}
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline mt-1 sm:mt-0 opacity-90">
            {isEs ? '15% de descuento en todas las canastillas' : '15% off every gift box'}
          </span>
        </span>
      </Link>
    </div>
  )
}
