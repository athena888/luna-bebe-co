'use client'

import { useEffect, useRef } from 'react'
import { trackViewItem } from '@/lib/analytics-events'

// Fires GA4 `view_item` + Meta `ViewContent` for a server-rendered product
// page. Single-item pages track from ProductDetailClient (a client component
// already); box pages render on the server, so they mount this island instead.
// Without it the BOXES — the $65–165 products the ads point at — produced no
// view_item at all, so the funnel looked empty no matter what shoppers did.
//
// `id` is the Merchant feed's offer id (box-<slug>--<variant>) so GA4, the
// Meta pixel and Google Shopping all key on the same identifier.
export function TrackViewItem({ id, name, price, category }: {
  id: string
  name: string
  price: number
  category?: string
}) {
  const sent = useRef<string | null>(null)
  useEffect(() => {
    // Variant switches are full navigations, but guard anyway so a re-render
    // can't double-count.
    if (sent.current === id) return
    sent.current = id
    trackViewItem({ id, name, price, category })
  }, [id, name, price, category])
  return null
}
