import { NextRequest, NextResponse } from 'next/server'
import { createProduct } from '@/lib/products-db'
import type { ProductCategory } from '@/types'

const VALID_CATEGORIES: ProductCategory[] = ['swaddle', 'garment', 'bath', 'keepsake', 'mom']

// Creates an UNPUBLISHED draft product from an inventory row, so unmatched
// items can be brought into the catalog without showing to customers. The
// admin edits + publishes it later on the product page.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name: string = (body.name || body.item_id || '').toString().trim()
    if (!name) return NextResponse.json({ error: 'Name or style number required' }, { status: 400 })

    const category: ProductCategory = VALID_CATEGORIES.includes(body.category)
      ? body.category
      : 'garment' // sensible default for supplier clothing sheets

    const product = await createProduct({
      name,
      category,
      price: typeof body.price === 'number' ? body.price : 0,
      description: '',
      active: false,                 // unpublished draft — hidden from customers
      tag: 'Draft',
      imageEmoji: '📦',              // placeholder until a real photo is added
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Create draft error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create draft'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
