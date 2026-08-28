'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useIsEs } from '@/lib/use-is-es'
import { writeCart, type CartItem } from '@/lib/cart'
import { BLANKET_COLORS } from '@/lib/box-colors'
import { formatDollars, freeShippingApplies } from '@/lib/products'
import { DeliveryEstimate } from '@/components/ui/DeliveryEstimate'
import type { Product } from '@/types'
import type { SizeOption } from '@/lib/catalog-db'

// Client island for /boxes/[slug]. ONE size selector for the whole box
// (Emily: the buyer sizes the box, not each garment): the offered sizes are
// those every sized item carries; a size is enabled only when every sized
// item has it in stock (preorder items count as available). The chosen size
// is written onto every sized cart line so checkout decrements correctly.
//
// The phone sticky bar lives here too, and deliberately so: it is the SAME
// component instance, so it reads the same `size`/`color` state and calls the
// same buy() — one add-to-cart path, one GA4 event, no way for the two buttons
// to disagree about what is being added.

export interface BuyContent { item: Product; qty: number; colorChoice: boolean }

const STICKY_BODY_FLAG = 'plStickyBuy'   // body[data-pl-sticky-buy] — see app/globals.css

export function BoxBuyPanel({ contents, price, boxName, boxSlug, variantKey, variantLabel, needsColor, sizesByItem = {}, boxImage = null, pieces }: {
  contents: BuyContent[]
  price: number
  boxName?: string
  boxSlug?: string
  variantKey?: string
  variantLabel?: string
  needsColor: boolean
  sizesByItem?: Record<string, SizeOption[]>
  /** Cover photo for the single bag line. */
  boxImage?: string | null
  /** Piece count for this variant (lib/catalog-db pieceCount) — rides along on
   *  the box ref so the bag and checkout print the page's number. */
  pieces?: number
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

  const buy = useCallback(() => {
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
    // The display name carries the FULL box identity incl. variant
    // ("Mama et Bébé — Strawberry"), matching the Stripe line item.
    const fullName = `${boxName ?? 'Gift Box'}${variantLabel ? ` — ${variantLabel}` : ''}`
    // size/image/pieces ride along so the bag can show the BOX as one line
    // (with the size the buyer picked and the page's piece count) instead of
    // listing the pieces inside it.
    writeCart(items, boxSlug && variantKey
      ? { slug: boxSlug, variantKey, name: fullName, price, ...(needsSize && size ? { size } : {}), image: boxImage, ...(pieces ? { pieces } : {}) }
      : undefined)
    router.push(isEs ? '/es/checkout' : '/checkout')
  }, [contents, sizesByItem, size, color, boxName, variantLabel, boxSlug, variantKey, price, needsSize, boxImage, pieces, router, isEs])

  return (
    <div className="mt-6">
      {needsColor && (
        <div className="mb-5">
          <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">{isEs ? 'Color de la manta' : 'Blanket color'}</p>
          <div className="flex flex-wrap gap-2">
            {BLANKET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`font-sans text-[11px] tracking-[0.11em] uppercase px-4 py-2 border transition-colors ${
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
        <div id="box-size" className="mb-5 scroll-mt-28">
          <p className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400 mb-2">{isEs ? 'Talla' : 'Size'}</p>
          <div className="flex flex-wrap gap-2">
            {boxSizes.map(s => {
              const ok = sizeAvailable(s)
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!ok}
                  onClick={() => ok && setSize(s)}
                  className={`font-sans text-[11px] tracking-[0.11em] uppercase px-4 py-2 border transition-colors ${
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

      {/* Delivery expectation sits ABOVE the CTA: on a phone it is the last
          question before the tap, not a footnote under it. */}
      <DeliveryEstimate className="mb-4" />

      <StickyAddToCart
        onBuy={buy}
        canBuy={canBuy}
        needsSize={needsSize && !size}
        price={price}
        name={boxName ?? (isEs ? 'Canastilla' : 'Gift Box')}
        shipsFree={freeShippingApplies(price, 'standard')}
        isEs={isEs}
      />
    </div>
  )
}

// The main Add to Cart button plus its phone-only sticky twin. The twin is
// rendered only while the real button is off screen (IntersectionObserver), so
// the two are never both offering the same tap.
function StickyAddToCart({ onBuy, canBuy, needsSize, price, name, shipsFree, isEs }: {
  onBuy: () => void
  canBuy: boolean
  /** A size is required and none is chosen yet — the bar says so. */
  needsSize: boolean
  price: number
  name: string
  /** This box already clears the free-standard-shipping bar (lib/products). */
  shipsFree: boolean
  isEs: boolean
}) {
  const mainRef = useRef<HTMLButtonElement | null>(null)
  const [pastMain, setPastMain] = useState(false)
  // First-visit cookie banner also owns the bottom of the screen; the bar
  // waits rather than sitting behind it.
  const [consented, setConsented] = useState(true)

  useEffect(() => {
    const read = () => {
      try { setConsented(!!localStorage.getItem('cookie_consent')) } catch { setConsented(true) }
    }
    read()
    window.addEventListener('pl:cookie-consent', read)
    return () => window.removeEventListener('pl:cookie-consent', read)
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      // Only once the button has scrolled PAST — off the top of the viewport.
      // Not merely "off screen": the real button starts below the fold, and a
      // bar that greets a visitor before they have scrolled at all is an
      // interruption, not a shortcut. Everything below the button (the
      // contents list, the story, the reviews) is past it, so the bar covers
      // the whole page a shopper actually reads.
      ([entry]) => setPastMain(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0),
      { rootMargin: '0px 0px -72px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const showSticky = pastMain && consented

  // Keep the last screenful reachable and lift the chat launcher clear of the
  // bar (app/globals.css reads this flag; phones only).
  useEffect(() => {
    if (!showSticky) return
    document.body.dataset[STICKY_BODY_FLAG] = '1'
    return () => { delete document.body.dataset[STICKY_BODY_FLAG] }
  }, [showSticky])

  const cta = isEs ? 'Agregar al carrito' : 'Add to Cart'

  return (
    <>
      <button
        ref={mainRef}
        onClick={onBuy}
        disabled={!canBuy}
        className="w-full sm:w-auto bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.16em] uppercase px-10 py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {cta} — {formatDollars(price)}
      </button>

      {/* Phone sticky purchase bar. Below the chat launcher's z-50 so the chat
          panel always wins; the launcher itself is lifted by the body flag. */}
      <div
        aria-hidden={!showSticky}
        className={`md:hidden fixed inset-x-0 bottom-0 z-[49] border-t border-cream-300 bg-cream-50/95 backdrop-blur-sm transition-transform duration-200 ${
          showSticky ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 px-4 pt-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[15px] leading-tight text-espresso truncate">
              {name} <span className="text-bark-400">·</span> {formatDollars(price)}
            </p>
            <p className="font-sans text-[11px] leading-tight text-bark-400 truncate">
              {needsSize
                ? (isEs ? 'Elige una talla arriba' : 'Choose a size above')
                : shipsFree
                  ? (isEs ? 'Envío estándar gratis' : 'Free standard shipping')
                  : (isEs ? 'Listo para regalar' : 'Gift-ready, hand-packed')}
            </p>
          </div>
          <button
            type="button"
            onClick={onBuy}
            disabled={!canBuy}
            tabIndex={showSticky ? 0 : -1}
            className="shrink-0 whitespace-nowrap bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.14em] uppercase px-5 py-3.5 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cta}
          </button>
        </div>
      </div>
    </>
  )
}
