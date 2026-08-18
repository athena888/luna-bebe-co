import { getCatalog } from '@/lib/products-db'
import type { Product } from '@/types'
import BuildClient from './BuildClient'

// Server wrapper for the configurator (2026-08-18): /build used to ship an
// empty shell and fetch its catalog in the browser, so crawlers saw no
// products and phones flashed a spinner. The catalog is now read here — same
// query the /api/products/all route runs — and handed to the (unchanged)
// client component as its initial state. Every interaction, the cart and the
// ES description swap still work exactly as before.
export const revalidate = 120

export default async function BuildPage() {
  let byCategory: Record<string, Product[]> = {}
  try {
    const products = await getCatalog({ activeOnly: true })
    for (const p of products) (byCategory[p.category] ??= []).push(p)
  } catch {
    byCategory = {}   // fail soft: the client fetch still populates it
  }
  return <BuildClient initialCatalog={byCategory} />
}
