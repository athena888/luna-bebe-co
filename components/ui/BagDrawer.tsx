'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { X, Minus, Plus } from 'lucide-react'
import { readCart, writeCart, readBoxRef, type CartItem, type BoxRef } from '@/lib/cart'
import { BOX_BASE_PRICE, FREE_SHIPPING_THRESHOLD } from '@/lib/products'
import { useIsEs } from '@/lib/use-is-es'
import { DeliveryEstimate } from '@/components/ui/DeliveryEstimate'
import { CartFeeNote } from '@/components/ui/CartFeeNote'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function formatPrice(cents: number) { return `$${(cents / 100).toFixed(2)}` }

// Global slide-out bag — mirrors the Build page drawer but reads the shared
// cart directly, so the cart icon opens it on ANY page without navigating.
// The Build page keeps its own richer drawer; this one stays unmounted there
// (both listen for the same pl:open-bag event).
export function BagDrawer() {
  const pathname = usePathname()
  const router = useRouter()
  const isEs = useIsEs()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<CartItem[]>([])
  // Set while the bag is an unmodified prebuilt box — the bag then sells at
  // the box price. Any qty/remove edit clears it (via writeCart) and every
  // line reverts to its own price.
  const [boxRef, setBoxRef] = useState<BoxRef | null>(null)

  useEffect(() => {
    const openBag = () => { setItems(readCart()); setBoxRef(readBoxRef()); setOpen(true) }
    const sync = () => { setItems(readCart()); setBoxRef(readBoxRef()) }
    window.addEventListener('pl:open-bag', openBag)
    window.addEventListener('pl:cart', sync)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pl:open-bag', openBag)
      window.removeEventListener('pl:cart', sync)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  if (pathname?.startsWith('/build')) return null

  const hasItems = items.length > 0
  const subtotal = boxRef ? boxRef.price : items.reduce((s, i) => s + i.price * (i.qty ?? 1), 0)

  function update(next: CartItem[]) {
    setItems(next)
    writeCart(next)
  }
  function changeQty(lineKey: string | undefined, delta: number) {
    update(items.map(i => (i.lineKey ?? i.id) === lineKey ? { ...i, qty: Math.max(1, (i.qty ?? 1) + delta) } : i))
  }
  function removeItem(lineKey: string | undefined) {
    update(items.filter(i => (i.lineKey ?? i.id) !== lineKey))
  }

  const threshold = FREE_SHIPPING_THRESHOLD
  const towardFree = subtotal + BOX_BASE_PRICE
  const pct = Math.min(towardFree / threshold, 1)
  const earned = towardFree >= threshold

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[52] bg-bark-800/30 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 bottom-0 z-[53] w-[92vw] sm:w-[460px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        <div className="flex items-center justify-between px-6 h-[68px] border-b border-cream-300 shrink-0">
          <h2 className="font-serif text-xl text-bark-600">{isEs ? 'Tu bolsa' : 'Your Bag'}</h2>
          <button onClick={() => setOpen(false)} className="text-bark-400 hover:text-bark-600 transition-colors" aria-label={isEs ? 'Cerrar bolsa' : 'Close bag'}>
            <X size={18} />
          </button>
        </div>

        {/* Free shipping progress */}
        {hasItems && (
          <div className="shrink-0 px-6 pt-4 pb-3 border-b border-cream-100">
            <p className="font-sans text-[11px] text-center text-bark-500 mb-3">
              {earned
                ? (isEs ? '¡Felicidades — tu envío es gratis!' : 'Congratulations — you earned free shipping!')
                : isEs
                  ? <>Te faltan <span className="text-bark-600 font-medium">{formatPrice(threshold - towardFree)}</span> para envío gratis</>
                  : <><span className="text-bark-600 font-medium">{formatPrice(threshold - towardFree)}</span> away from free shipping</>
              }
            </p>
            <div className="relative h-1.5 rounded-full bg-cream-200 border border-cream-300 mx-1">
              <div className="absolute left-0 top-0 h-full rounded-full bg-gold-400 transition-all duration-500" style={{ width: `${pct * 100}%` }} />
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-7 h-7 rounded-full pl-round-full border flex items-center justify-center text-sm transition-colors duration-300 ${earned ? 'bg-gold-400 border-gold-400' : 'bg-white border-cream-300'}`}>
                📦
              </div>
            </div>
            <div className="flex justify-end mt-2 pr-1">
              <span className="font-sans text-[11px] tracking-[0.1em] text-bark-400">{`$${Math.round(threshold / 100)}`}</span>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!hasItems ? (
            <p className="font-sans text-xs text-bark-400/60 tracking-wide text-center pt-10">{isEs ? 'Tu bolsa está vacía — agrega una canastilla o arma la tuya para empezar.' : 'Your bag is empty — add a box or build your own to get started.'}</p>
          ) : boxRef ? (
            /* An untouched prebuilt box is ONE line: the box, its size and its
               price — not the pieces inside it. Removing it empties the bag,
               which also clears the box ref (see lib/cart.ts). */
            <div className="flex gap-4 items-start py-1">
              <div className="w-24 h-28 bg-cream-100 relative shrink-0 overflow-hidden">
                {boxRef.image
                  ? <Image src={boxRef.image} alt={boxRef.name} fill className="object-cover" sizes="96px" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 mb-0.5">Petite Lavande</p>
                <p className="font-sans text-sm text-bark-700 leading-snug mb-1.5">{boxRef.name}</p>
                {boxRef.size && (
                  <p className="font-sans text-[11px] text-bark-400 mb-1">{isEs ? 'Talla' : 'Size'} {boxRef.size} m</p>
                )}
                <p className="font-sans text-[11px] text-bark-400/80 mb-1">
                  {items.reduce((s, i) => s + (i.qty ?? 1), 0)} {isEs ? 'piezas incluidas' : 'pieces included'}
                </p>
                <p className="font-sans text-sm text-bark-500 mb-3">{formatPrice(boxRef.price)}</p>
                <button
                  onClick={() => update([])}
                  className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 hover:text-bark-700 transition-colors"
                >
                  {isEs ? 'Quitar' : 'Remove'}
                </button>
              </div>
            </div>
          ) : (
            items.map(product => {
              const src = product.image ?? (SUPABASE_URL
                ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${product.id}.jpg`
                : null)
              const variantLabel = [product.selectedColor, product.selectedSize, product.selectedStyle].filter(Boolean).join(' · ')
              const key = product.lineKey ?? product.id
              return (
                <div key={key} className="flex gap-4 items-start py-1">
                  <div className="w-24 h-28 bg-cream-100 relative shrink-0 overflow-hidden">
                    {src
                      ? <Image src={src} alt={product.name} fill className="object-cover" sizes="96px" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">{product.imageEmoji}</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 mb-0.5">Petite Lavande</p>
                    <p className="font-sans text-sm text-bark-700 leading-snug mb-1.5">{product.name}</p>
                    {variantLabel && (
                      <p className="font-sans text-[11px] text-bark-400 capitalize mb-1">{variantLabel}</p>
                    )}
                    <p className="font-sans text-sm text-bark-500 mb-3">{boxRef ? (isEs ? 'Incluido' : 'Included') : <>{formatPrice(product.price * (product.qty ?? 1))}{(product.qty ?? 1) > 1 && <span className="text-bark-400/70 text-xs"> ({formatPrice(product.price)} ea)</span>}</>}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-cream-300">
                        <button onClick={() => changeQty(key, -1)} disabled={(product.qty ?? 1) <= 1}
                          className="w-7 h-7 flex items-center justify-center text-bark-500 hover:bg-cream-100 disabled:opacity-30 transition-colors" aria-label="Decrease quantity">
                          <Minus size={13} />
                        </button>
                        <span className="w-7 text-center font-sans text-sm text-bark-600">{product.qty ?? 1}</span>
                        <button onClick={() => changeQty(key, 1)}
                          className="w-7 h-7 flex items-center justify-center text-bark-500 hover:bg-cream-100 transition-colors" aria-label="Increase quantity">
                          <Plus size={13} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(key)}
                        className="font-sans text-[11px] tracking-[0.11em] uppercase text-bark-400 hover:text-bark-700 transition-colors"
                      >
                        {isEs ? 'Quitar' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>


        {/* Footer */}
        <div className="shrink-0 border-t border-cream-300 px-6 py-5">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-sans text-[11px] tracking-[0.14em] uppercase text-bark-400">Subtotal</span>
            <span className="font-sans text-base font-medium text-bark-600">{formatPrice(subtotal)}</span>
          </div>
          <CartFeeNote className="mb-2" />
          {hasItems && <DeliveryEstimate variant="compact" className="mb-4" />}
          <button
            onClick={() => { setOpen(false); router.push(isEs ? '/es/checkout' : '/checkout') }}
            disabled={!hasItems}
            className="w-full bg-[#7A8E7C] text-white font-sans text-[11px] tracking-[0.16em] uppercase py-4 hover:bg-[#6d8070] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isEs ? 'Pagar' : 'Check Out'}
          </button>
        </div>
      </div>
    </>
  )
}
