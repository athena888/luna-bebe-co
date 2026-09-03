'use client'

import { useEffect, useRef } from 'react'
import { trackViewItemList } from '@/lib/analytics-events'

// Reports the products an occasion landing page merchandised, so a Meta ad's
// traffic finally shows product impressions on the page the ad actually points
// at. Fires once per list per mount; `view_item` stays on the product pages
// where a real product detail view happens.
export function TrackGiftList({ listId, listName, items }: {
  listId: string
  listName: string
  items: Array<{ id: string; name: string; price: number; category?: string }>
}) {
  const sent = useRef<string | null>(null)
  useEffect(() => {
    if (sent.current === listId) return
    sent.current = listId
    trackViewItemList(listId, listName, items)
    // `items` is a fresh array literal each render; keying the guard on listId
    // is what actually prevents a double fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId])
  return null
}
