'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { readCart, writeCart, type CartItem } from '@/lib/cart'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'

// Box sizes for garments — same options as the boxes page SizePicker.
const BOX_SIZES = ['0–3 mo', '3–6 mo'] as const
const isGarment = (i: BoxItem) => /garment|swaddle|romper|kimono|clothes|onesie|bodysuit|sleep/i.test(`${i.category ?? ''} ${i.name ?? ''}`)

// Quick-add pill for box cover photos (Best Sellers, The Collection): drops the
// whole box into the bag without leaving the page — bumps qty if it's already
// there. When the box contains garments, tapping + first shows the two size
// pills so the size is a choice, not a silent default. The header badge updates
// via the pl:cart event writeCart fires.
export function QuickAddBox({ box, className = '' }: { box: ResolvedBox; className?: string }) {
  const [added, setAdded] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const hasGarment = box.items.some(it => it && isGarment(it))

  function add(size: string) {
    const cart = readCart()
    for (const it of box.items) {
      if (!it) continue
      const lineKey = it.id
      const existing = cart.find(c => (c.lineKey ?? c.id) === lineKey)
      if (existing) existing.qty = (existing.qty ?? 1) + 1
      else cart.push({ ...it, qty: 1, lineKey, selectedSize: isGarment(it) ? size : (it as CartItem).selectedSize })
    }
    writeCart(cart)
    setChoosing(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  function onMainClick(e: React.MouseEvent) {
    // The photos these sit on are links — don't navigate.
    e.preventDefault()
    e.stopPropagation()
    if (added) return
    if (hasGarment) setChoosing(v => !v)
    else add(BOX_SIZES[0])
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {choosing && !added && (
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose garment size">
          {BOX_SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); add(s) }}
              className="bg-white/95 text-espresso font-sans text-[11px] whitespace-nowrap px-3 py-2 shadow-sm hover:bg-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onMainClick}
        aria-label={`Add ${box.name} to bag`}
        title="Add to bag"
        className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 border border-white text-white bg-transparent hover:bg-white/20 transition-colors drop-shadow-md"
      >
        {added ? <Check size={16} strokeWidth={1.5} /> : <Plus size={16} strokeWidth={1.5} />}
      </button>
    </div>
  )
}
