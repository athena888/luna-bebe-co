'use client'

import { useIsEs } from '@/lib/use-is-es'
import { SHIPPING } from '@/lib/products'

// The footnote under every bag subtotal. It lived twice — the global drawer
// and the build-page drawer — and drifted: one still promised a "box fee"
// that BOX_BASE_PRICE = 0 retired in August, so the same shopper read two
// different stories depending on which drawer they opened.
//
// "Shipping calculated at checkout" is the honest line while the bag is still
// short of the free-shipping bar. Once the order has cleared it, the number IS
// known — zero — and saying it will be "calculated" alongside a banner
// congratulating the shopper on free shipping only invites the suspicion that
// something will be added at the last step. Past the bar the note states the
// service and the window instead, in the same words checkout uses.
export function CartFeeNote({ freeStandard = false, className = '' }: {
  /** This order already qualifies for free standard shipping (lib/products
   *  freeShippingApplies) — the caller decides, the copy follows. */
  freeStandard?: boolean
  className?: string
}) {
  const isEs = useIsEs()

  if (freeStandard) {
    // Numbers come from the one shipping table; only the words are localized.
    const days = SHIPPING.standard.days
    return (
      <p className={`font-sans text-[11px] leading-snug ${className}`}>
        <span className="tracking-[0.11em] uppercase text-[#7A8E7C]">
          {isEs ? 'Envío estándar GRATIS' : 'FREE Standard Shipping'}
        </span>
        <span className="block text-bark-400/80">{isEs ? days.replace('business days', 'días hábiles') : days}</span>
      </p>
    )
  }

  return (
    <p className={`font-sans text-[11px] text-bark-400/60 ${className}`}>
      {isEs ? 'Envío se calcula al pagar' : 'Shipping calculated at checkout'}
    </p>
  )
}
