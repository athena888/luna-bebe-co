import type { Product } from '@/types'

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

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.map((i: CartItem) => ({ ...i, qty: i.qty ?? 1 })) : []
  } catch { return [] }
}

export function writeCart(items: CartItem[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items))
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
  return readCart().reduce((s, i) => s + (i.qty ?? 1), 0)
}
