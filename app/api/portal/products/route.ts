import { NextRequest, NextResponse } from 'next/server'
import { getCatalog, createProduct, type CreateProductInput } from '@/lib/products-db'
import type { ProductCategory } from '@/types'

const VALID_CATEGORIES: ProductCategory[] = ['swaddle', 'garment', 'bath', 'keepsake', 'mom']

// List the full catalog (including inactive) for the portal.
export async function GET() {
  try {
    const products = await getCatalog()
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Portal catalog error:', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }
}

// Create a brand-new product.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, price, category, imageEmoji, tag, ingredients } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Valid category is required' }, { status: 400 })
    }
    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Valid price is required' }, { status: 400 })
    }

    const input: CreateProductInput = {
      name: name.trim(),
      description: description?.trim() || '',
      price: Math.round(price),
      category,
      imageEmoji: imageEmoji?.trim() || undefined,
      tag: tag?.trim() || null,
      ingredients: ingredients?.trim() || null,
    }

    const product = await createProduct(input)
    // Tell search engines the new URL exists — fire-and-forget.
    import('@/lib/indexnow').then(({ submitToIndexNow }) =>
      submitToIndexNow([`/products/${product.id}`, `/es/productos/${product.id}`])).catch(() => {})
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
