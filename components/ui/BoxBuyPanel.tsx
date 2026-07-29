'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { writeCart, type CartItem } from '@/lib/cart'
import { BLANKET_COLORS } from '@/lib/box-colors'
import type { Product } from '@/types'

// Client island for /boxes/[slug] — everything above it renders on the server.
// Receives the SELECTED variant's resolved contents and writes them to the
// cart exactly like the legacy box buy path (same CartItem shape → same
// checkout, no payment-logic changes).

export interface BuyContent { item: Product; qty: number; colorChoice: boolean }

export function BoxBuyPanel({ contents, price, boxName, needsColor }: {
  contents: BuyContent[]
  price: number
  boxName: string
  needsColor: boolean
}) {
  const router = useRouter()
  const [color, setColor] = useState<string>(BLANKET_COLORS[0])

  function buy() {
    const items: CartItem[] = contents.map(c => ({
      ...c.item,
      qty: c.qty,
      lineKey: c.item.id,
      ...(c.colorChoice ? { selectedColor: color } : {}),
    } as CartItem))
    writeCart(items)
    router.push('/checkout')
  }

  return (
    <div className="mt-6">
      {needsColor && (
        <div className="mb-5">
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">Blanket color</p>
          <div className="flex flex-wrap gap-2">
            {BLANKET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                  color === c ? 'border-espresso bg-espresso text-cream-50' : 'border-cream-300 text-bark-500 hover:border-espresso-light'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={buy}
        className="w-full sm:w-auto bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors"
      >
        Add to Cart — ${(price / 100).toFixed(0)}
      </button>
      <p className="font-sans text-xs text-bark-400 mt-3">
        {boxName} ships hand-packed within 3 days.
      </p>
    </div>
  )
}
