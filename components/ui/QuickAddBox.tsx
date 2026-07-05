'use client'

import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { readCart, writeCart, type CartItem } from '@/lib/cart'
import type { ResolvedBox, BoxItem } from '@/lib/prebuilt-boxes-db'

// Box sizes for garments — same options as the boxes page SizePicker.
const BOX_SIZES = ['0–3 mo', '3–6 mo'] as const
const isGarment = (i: BoxItem) => /garment|swaddle|romper|kimono|clothes|onesie|bodysuit|sleep/i.test(`${i.category ?? ''} ${i.name ?? ''}`)

type VariantRow = { color: string | null; size: string; quantity: number }

// Quick-add pill for box cover photos (Best Sellers, The Collection): drops the
// whole box into the bag without leaving the page — bumps qty if it's already
// there. When the box contains garments, tapping + first loads variant stock
// and shows the size pills — out-of-stock sizes stay visible but are flagged
// (struck through, not clickable). The header badge updates via pl:cart.
export function QuickAddBox({ box, className = '' }: { box: ResolvedBox; className?: string }) {
  const [added, setAdded] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [avail, setAvail] = useState<Record<string, boolean> | null>(null)
  const hasGarment = box.items.some(it => it && isGarment(it))

  // A size is offered only if EVERY garment in the box has stock for it
  // (colour-aware; garments without variant rows stay permissive).
  async function loadAvailability() {
    if (avail || loading) return
    setLoading(true)
    try {
      const garments = box.items.filter((it): it is BoxItem => !!it && isGarment(it))
      const ids = Array.from(new Set(garments.map(g => g.id)))
      const results = await Promise.all(ids.map(id =>
        fetch(`/api/products/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
      ))
      const variantsById: Record<string, VariantRow[]> = {}
      ids.forEach((id, i) => { variantsById[id] = Array.isArray(results[i]?.variants) ? results[i].variants : [] })
      const next: Record<string, boolean> = {}
      for (const s of BOX_SIZES) {
        next[s] = garments.every(g => {
          const rows = variantsById[g.id] ?? []
          if (rows.length === 0) return true
          const color = (g as CartItem).selectedColor
          const match = rows.filter(v => v.size === s && (!color || !v.color || v.color.toLowerCase() === color.toLowerCase()))
          return match.reduce((t, v) => t + (v.quantity ?? 0), 0) > 0
        })
      }
      setAvail(next)
    } finally {
      setLoading(false)
    }
  }

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
    if (hasGarment) {
      setChoosing(v => !v)
      void loadAvailability()
    } else {
      add(BOX_SIZES[0])
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {choosing && !added && (
        <div className="flex items-center gap-1.5" role="group" aria-label="Choose garment size">
          {loading || !avail ? (
            <span className="bg-white/95 text-bark-400 font-sans text-[11px] px-3 py-2 shadow-sm">…</span>
          ) : (
            BOX_SIZES.map(s => {
              const ok = avail[s]
              return (
                <button
                  key={s}
                  type="button"
                  title={ok ? undefined : 'Sold out'}
                  aria-disabled={!ok}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); if (ok) add(s) }}
                  className={`font-sans text-[11px] whitespace-nowrap px-3 py-2 shadow-sm transition-colors ${
                    ok ? 'bg-white/95 text-espresso hover:bg-white' : 'bg-white/70 text-bark-300 line-through cursor-not-allowed'
                  }`}
                >
                  {s}
                </button>
              )
            })
          )}
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
