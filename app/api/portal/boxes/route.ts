import { NextResponse } from 'next/server'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { getCatalog } from '@/lib/products-db'

export const dynamic = 'force-dynamic'

// List all boxes + the product catalog (for the slot dropdowns) for the editor.
export async function GET() {
  try {
    const [boxes, catalog] = await Promise.all([
      getBoxes({ activeOnly: false }),
      getCatalog(),
    ])
    const products = catalog.map(p => ({
      id: p.id, name: p.name, category: p.category, has_variants: p.has_variants,
      price: p.price, image: p.image ?? null,
    }))
    return NextResponse.json({ boxes, products })
  } catch (error) {
    console.error('Portal boxes error:', error)
    return NextResponse.json({ error: 'Failed to load boxes' }, { status: 500 })
  }
}
