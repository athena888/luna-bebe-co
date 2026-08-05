'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { writeCart, type CartItem } from '@/lib/cart'
import { BLANKET_COLORS } from '@/lib/box-colors'
import type { Product } from '@/types'
import type { SizeOption } from '@/lib/catalog-db'

// Client island for /boxes/[slug] — everything above it renders on the server.
// Garment items get size chips checked against live per-size stock:
//  - in stock       → selectable
//  - out of stock   → stays visible but blocked; tapping opens a notify-me
//                     email field (product waitlist → restock email)
//  - preorder items → every size selectable, tagged "pre-order"
// Add to Cart stays disabled until every sized item has a valid pick.

export interface BuyContent { item: Product; qty: number; colorChoice: boolean }

export function BoxBuyPanel({ contents, price, boxName, needsColor, sizesByItem = {} }: {
  contents: BuyContent[]
  price: number
  boxName: string
  needsColor: boolean
  sizesByItem?: Record<string, SizeOption[]>
}) {
  const router = useRouter()
  const [color, setColor] = useState<string>(BLANKET_COLORS[0])
  const [sizes, setSizes] = useState<Record<string, string>>({})
  const [notifyFor, setNotifyFor] = useState<string | null>(null) // item id with notify field open
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyState, setNotifyState] = useState<'idle' | 'saving' | 'done'>('idle')

  const sizedItems = contents.filter(c => (sizesByItem[c.item.id]?.length ?? 0) > 0)
  const missingSizes = sizedItems.filter(c => !sizes[c.item.id])

  function pickSize(item: Product, opt: SizeOption) {
    const preorder = !!(item as Product & { preorder?: boolean }).preorder
    if (!opt.inStock && !preorder) {
      setNotifyFor(item.id); setNotifyState('idle')
      return
    }
    setNotifyFor(null)
    setSizes(s => ({ ...s, [item.id]: opt.size }))
  }

  async function notify(itemId: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail.trim())) return
    setNotifyState('saving')
    try {
      await fetch('/api/waitlist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: notifyEmail.trim(), productId: itemId }),
      })
      setNotifyState('done')
    } catch { setNotifyState('idle') }
  }

  function buy() {
    const items: CartItem[] = contents.map(c => {
      const size = sizes[c.item.id]
      const opt = size ? sizesByItem[c.item.id]?.find(o => o.size === size) : undefined
      return {
        ...c.item,
        qty: c.qty,
        lineKey: c.item.id,
        ...(c.colorChoice ? { selectedColor: color } : opt?.color ? { selectedColor: opt.color } : {}),
        ...(size ? { selectedSize: size } : {}),
      } as CartItem
    })
    writeCart(items)
    router.push('/letter')
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

      {sizedItems.map(c => {
        const opts = sizesByItem[c.item.id]!
        const preorder = !!(c.item as Product & { preorder?: boolean }).preorder
        return (
          <div key={c.item.id} className="mb-5">
            <p className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-2">{c.item.name} — size</p>
            <div className="flex flex-wrap gap-2">
              {opts.map(o => {
                const selectable = o.inStock || preorder
                const selected = sizes[c.item.id] === o.size
                return (
                  <button
                    key={o.size}
                    type="button"
                    onClick={() => pickSize(c.item, o)}
                    className={`font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2 border transition-colors ${
                      selected ? 'border-espresso bg-espresso text-cream-50'
                        : selectable ? 'border-cream-300 text-bark-500 hover:border-espresso-light'
                          : 'border-cream-200 text-bark-300 line-through decoration-bark-300'
                    }`}
                  >
                    {o.size}{o.size !== 'one-size' ? ' m' : ''}{!o.inStock && preorder ? ' · pre-order' : ''}
                  </button>
                )
              })}
            </div>
            {notifyFor === c.item.id && (
              <div className="mt-2.5 border border-cream-300 bg-cream-100 p-3">
                {notifyState === 'done' ? (
                  <p className="font-sans text-xs text-sage-700">You&apos;re on the list — we&apos;ll email you the moment it&apos;s back.</p>
                ) : (
                  <>
                    <p className="font-sans text-xs text-bark-500 mb-2">That size is away for now. Leave your email and we&apos;ll tell you the moment it returns:</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="flex-1 min-w-0 px-3 py-2 border border-cream-300 bg-white font-sans text-xs text-bark-600 focus:outline-none focus:border-espresso-light"
                      />
                      <button
                        type="button"
                        onClick={() => notify(c.item.id)}
                        disabled={notifyState === 'saving'}
                        className="shrink-0 bg-[#7A8E7C] hover:bg-[#6d8070] text-white font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 transition-colors disabled:opacity-50"
                      >
                        Notify me
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      <button
        onClick={buy}
        disabled={missingSizes.length > 0}
        className="w-full sm:w-auto bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.25em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add to Cart — ${(price / 100).toFixed(0)}
      </button>
      {missingSizes.length > 0 && (
        <p className="font-sans text-xs text-bark-400 mt-2">
          Choose a size for {missingSizes.map(c => c.item.name).join(' and ')} first.
        </p>
      )}
      <p className="font-sans text-xs text-bark-400 mt-3">
        {boxName} ships hand-packed within 3 days.
      </p>
    </div>
  )
}
