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
    <div className="shrink-0 border-t border-cream-200 px-4 sm:px-6 pt-5 pb-4">
      <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-4">Complete the gift</p>
      <div className="flex gap-4 overflow-x-auto snap-x pb-1">
        {visible.map(p => (
          <div key={p.id} className="w-36 sm:w-40 shrink-0 snap-start">
            <button
              onClick={() => add(p)}
              className="group relative block w-full aspect-[3/4] bg-cream-100 overflow-hidden"
              aria-label={`Add ${p.name}`}
            >
              {p.image
                ? <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized sizes="160px" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">{p.imageEmoji}</div>
              }
              <span className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 border border-cream-300 flex items-center justify-center text-bark-600 group-hover:bg-bark-600 group-hover:text-cream-50 group-hover:border-bark-600 transition-colors">
                <Plus size={15} />
              </span>
            </button>
            <p className="font-sans text-xs text-bark-700 leading-snug mt-2 line-clamp-2">{p.name}</p>
            <p className="font-sans text-[11px] text-bark-400 mt-0.5">{`$${(p.price / 100).toFixed(2)}`}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
