'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { readCart, writeCart, type CartItem } from '@/lib/cart'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'

// Garments default to the first box size; buyers can adjust in the bag or on
// the boxes page (same heuristic as the Buy This Box flow).
const DEFAULT_SIZE = '0–3 mo'
const isGarment = (i: BoxItem) => /garment|swaddle|romper|kimono|clothes|onesie|bodysuit|sleep/i.test(`${i.category ?? ''} ${i.name ?? ''}`)

// Quick-add pill for box cover photos (Best Sellers, The Collection): drops the
// whole box into the bag without leaving the page — bumps qty if it's already
// there. The header badge updates via the pl:cart event writeCart fires.
export function QuickAddBox({ box, className = '' }: { box: ResolvedBox; className?: string }) {
  const [added, setAdded] = useState(false)

  function add(e: React.MouseEvent) {
    // The photos these sit on are links — don't navigate.
    e.preventDefault()
    e.stopPropagation()
    const cart = readCart()
    for (const it of box.items) {
      if (!it) continue
      const lineKey = it.id
      const existing = cart.find(c => (c.lineKey ?? c.id) === lineKey)
      if (existing) existing.qty = (existing.qty ?? 1) + 1
      else cart.push({ ...it, qty: 1, lineKey, selectedSize: isGarment(it) ? DEFAULT_SIZE : (it as CartItem).selectedSize })
    }
    writeCart(cart)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <button
      type="button"
      onClick={add}
      aria-label={`Add ${box.name} to bag`}
      title="Add to bag"
      className={`flex items-center gap-1.5 bg-white/95 text-espresso font-sans text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 shadow-sm hover:bg-white transition-colors ${className}`}
    >
      {added ? <Check size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
      {added ? 'Added' : 'Add'}
    </button>
  )
}
