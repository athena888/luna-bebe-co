'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { addToCart } from '@/lib/cart'
import { track } from '@/lib/analytics-events'
import type { Product } from '@/types'

type AddonProduct = Product & { is_addon?: boolean; addon_rank?: number; has_variants?: boolean }

// "Complete the gift" — one-click add-ons at the bottom of the bag drawer.
// Only shows products flagged is_addon in the portal, hides anything already
// in the bag, and skips variant products (they need a color/size choice).
// `onAdd` overrides the default shared-cart add for drawers that keep their
// own selection state (the build page).
export function AddonRow({ inCartIds, onAdd }: { inCartIds: string[]; onAdd?: (p: Product) => void }) {
  const [addons, setAddons] = useState<AddonProduct[]>([])

  useEffect(() => {
    fetch('/api/products/all')
      .then(r => r.json())
      .then(d => setAddons(((d.products ?? []) as AddonProduct[]).filter(p => p.is_addon && !p.has_variants)))
      .catch(() => { /* add-ons are optional — never break the drawer */ })
  }, [])

  const visible = addons
    .filter(p => !inCartIds.includes(p.id))
    .sort((a, b) => (a.addon_rank ?? 0) - (b.addon_rank ?? 0))
    .slice(0, 4)

  if (visible.length === 0) return null

  function add(p: AddonProduct) {
    if (onAdd) onAdd(p)
    else addToCart(p, 1)
    track('add_addon', {
      currency: 'USD',
      value: p.price / 100,
      items: [{ item_id: p.id, item_name: p.name, price: p.price / 100, quantity: 1, item_category: p.category }],
    })
  }

  return (
    <div className="shrink-0 border-t border-cream-200 px-6 pt-4 pb-3">
      <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">Complete the gift</p>
      <div className="space-y-2">
        {visible.map(p => (
          <div key={p.id} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cream-100 relative shrink-0 overflow-hidden">
              {p.image
                ? <Image src={p.image} alt={p.name} fill className="object-cover" unoptimized sizes="40px" />
                : <div className="w-full h-full flex items-center justify-center text-lg">{p.imageEmoji}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-xs text-bark-600 leading-snug truncate">{p.name}</p>
              <p className="font-sans text-[11px] text-bark-400">{`$${(p.price / 100).toFixed(2)}`}</p>
            </div>
            <button
              onClick={() => add(p)}
              className="shrink-0 w-7 h-7 border border-cream-300 flex items-center justify-center text-bark-500 hover:border-bark-400 hover:text-bark-700 transition-colors"
              aria-label={`Add ${p.name}`}
            >
              <Plus size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
