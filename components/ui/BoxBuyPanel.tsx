'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsEs } from '@/lib/use-is-es'
import { writeCart, type CartItem } from '@/lib/cart'
import { BLANKET_COLORS } from '@/lib/box-colors'
import type { Product } from '@/types'
import type { SizeOption } from '@/lib/catalog-db'

// Client island for /boxes/[slug]. ONE size selector for the whole box
// (Emily: the buyer sizes the box, not each garment): the offered sizes are
// those every sized item carries; a size is enabled only when every sized
// item has it in stock (preorder items count as available). The chosen size
// is written onto every sized cart line so checkout decrements correctly.

export interface BuyContent { item: Product; qty: number; colorChoice: boolean }

export function BoxBuyPanel({ contents, price, boxName, boxSlug, variantKey, needsColor, sizesByItem = {} }: {
  contents: BuyContent[]
  price: number
  boxName?: string
  boxSlug?: string
  variantKey?: string
  needsColor: boolean
  sizesByItem?: Record<string, SizeOption[]>
}) {
  const router = useRouter()
  const isEs = useIsEs()
  const [color, setColor] = useState<string>(BLANKET_COLORS[0])
  const [size, setSize] = useState<string>('')

  const sized = contents.filter(c => (sizesByItem[c.item.id]?.length ?? 0) > 0)
  const isPre = (p: Product) => !!(p as Product & { preorder?: boolean }).preorder

  // Sizes every sized item offers, in a sensible order.
  const ORDER = ['0-3', '3-6', '6-12', '12-18', 'one-size']
  const boxSizes = sized.length === 0 ? [] : sized
    .map(c => new Set(sizesByItem[c.item.id]!.map(o => o.size)))
    .reduce((acc, set) => acc.filter(s => set.has(s)), [...new Set(sized.flatMap(c => sizesByItem[c.item.id]!.map(o => o.size)))])
    .filter(s => s !== 'one-size')
    .sort((a, b) => (ORDER.indexOf(a) + 99) - (ORDER.indexOf(b) + 99) || a.localeCompare(b, undefined, { numeric: true }))

  const sizeAvailable = (s: string) =>
    sized.every(c => {
      const o = sizesByItem[c.item.id]!.find(x => x.size === s)
      return o ? (o.inStock || isPre(c.item)) : false
    })

  const needsSize = boxSizes.length > 0
  const canBuy = !needsSize || !!size

  function buy() {
    const items: CartItem[] = contents.map(c => {
      const opts = sizesByItem[c.item.id]
      const opt = opts?.find(o => o.size === size) ?? opts?.find(o => o.size === 'one-size')
      return {
        ...c.item,
        qty: c.qty,
        lineKey: c.item.id,
        ...(c.colorChoice ? { selectedColor: color } : opt?.color ? { selectedColor: opt.color } : {}),
        ...(opts?.length ? { selectedSize: opt?.size ?? size } : {}),
      } as CartItem
    })
    // An untouched prebuilt box sells at the BOX price, not summed item
    // retail — the ref survives until any cart edit (see lib/cart.ts).
    writeCart(items, boxSlug && variantKey
      ? { slug: boxSlug, variantKey, name: boxName ?? 'Gift Box', price }
      : undefined)
    router.push(isEs ? '/es/checkout' : '/checkout')
  }

  return (
    <div className="mt-6">
      {needsColor && (
        <div className="mb-5">
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">{isEs ? 'Color de la manta' : 'Blanket color'}</p>
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

      {needsSize && (
        <div className="mb-5">
          <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">{isEs ? 'Talla' : 'Size'}</p>
          <div className="flex flex-wrap gap-2">
            {boxSizes.map(s => {
              const ok = sizeAvailable(s)
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!ok}
                  onClick={() => ok && setSize(s)}
                  className={`font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                    size === s ? 'border-espresso bg-espresso text-cream-50'
                      : ok ? 'border-cream-300 text-bark-500 hover:border-espresso-light'
                        : 'border-cream-200 text-bark-300 line-through decoration-bark-300 cursor-not-allowed'
                  }`}
                >
                  {s} m
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        onClick={buy}
        disabled={!canBuy}
        className="w-full sm:w-auto bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isEs ? 'Agregar al carrito' : 'Add to Cart'} — ${(price / 100).toFixed(0)}
      </button>
    </div>
  )
}
