import type { Product } from '@/types'
import { trackCartGrowth } from './analytics-events'

// The "cart" is the box selection stored in sessionStorage as pl_box_selection
// (an array). The build bag and checkout both read it, so adding from anywhere
// (Shop by Occasion modals, etc.) shows up in the cart and at checkout.
export type CartItem = Product & {
  qty: number
  selectedColor?: string
  selectedSize?: string
  selectedStyle?: string
  lineKey?: string
}

const KEY = 'pl_box_selection'
const BOX_REF_KEY = 'pl_box_ref'

/** Set when the cart is an UNMODIFIED prebuilt box: the whole cart sells at
 *  the box's own price, never the sum of item retail. `price`/`name`/`size`/
 *  `image` are for display only — checkout re-derives the authoritative price
 *  server-side from slug+variantKey. Any cart mutation clears the ref (a
 *  customized box goes back to per-item pricing).
 *  While the ref is set the bag shows ONE line — the box itself, with its
 *  chosen size — instead of the pieces inside it. */
export interface BoxRef {
  slug: string
  variantKey: string
  name: string
  price: number
  /** The one size chosen for the whole box (e.g. '0-3'); absent when the box has no sized pieces. */
  size?: string
  /** Box cover photo, for the single bag line. */
  image?: string | null
}

export function readBoxRef(): BoxRef | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(BOX_REF_KEY)
    const ref = raw ? JSON.parse(raw) : null
    return ref && typeof ref.slug === 'string' && typeof ref.variantKey === 'string' ? ref : null
  } catch { return null }
}

export function clearBoxRef() {
  try {
    sessionStorage.removeItem(BOX_REF_KEY)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pl:cart'))
  } catch { /* ignore */ }
}

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.map((i: CartItem) => ({ ...i, qty: i.qty ?? 1 })) : []
  } catch { return [] }
}

export function writeCart(items: CartItem[], boxRef?: BoxRef) {
  try {
    // GA4 add_to_cart fires here — the single choke point every add path
    // (product add, quick-add box, build page) already flows through.
    const prev = readCart()
    sessionStorage.setItem(KEY, JSON.stringify(items))
    // Every write either carries a box ref (adding an untouched prebuilt box)
    // or clears it (any other add/edit means the cart is custom again).
    if (boxRef) sessionStorage.setItem(BOX_REF_KEY, JSON.stringify(boxRef))
    else sessionStorage.removeItem(BOX_REF_KEY)
    trackCartGrowth(prev, items)
    // Let the header cart badge (and anything else) update immediately.
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('pl:cart'))
  } catch { /* ignore */ }
}

// Add a plain (non-variant) product to the cart; bumps qty if already present.
// Returns the new total quantity.
export function addToCart(product: Product, qty = 1): number {
  const cart = readCart()
  const existing = cart.find(i => i.id === product.id && !i.selectedColor)
  if (existing) existing.qty = (existing.qty ?? 1) + qty
  else cart.push({ ...product, qty, lineKey: product.id })
  writeCart(cart)
  return cart.reduce((s, i) => s + (i.qty ?? 1), 0)
}

export function cartCount(): number {
  // An untouched prebuilt box is ONE thing in the bag, not its piece count —
  // the header badge has to agree with the single line the bag shows.
  if (readBoxRef()) return 1
  return readCart().reduce((s, i) => s + (i.qty ?? 1), 0)
}
