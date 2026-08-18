'use client'

import { useIsEs } from '@/lib/use-is-es'

// The footnote under every bag subtotal. It lived twice — the global drawer
// and the build-page drawer — and drifted: one still promised a "box fee"
// that BOX_BASE_PRICE = 0 retired in August, so the same shopper read two
// different stories depending on which drawer they opened.
export function CartFeeNote({ className = '' }: { className?: string }) {
  const isEs = useIsEs()
  return (
    <p className={`font-sans text-[11px] text-bark-400/60 ${className}`}>
      {isEs ? 'Envío se calcula al pagar' : 'Shipping calculated at checkout'}
    </p>
  )
}
