const KEY = 'pl_wishlist'

export function getWishlist(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function toggleWishlist(productId: string): boolean {
  const list = getWishlist()
  const idx = list.indexOf(productId)
  if (idx === -1) {
    list.push(productId)
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } else {
    list.splice(idx, 1)
    localStorage.setItem(KEY, JSON.stringify(list))
    return false
  }
}

export function isWishlisted(productId: string): boolean {
  return getWishlist().includes(productId)
}
