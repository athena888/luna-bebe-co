import { NextRequest, NextResponse } from 'next/server'
import { getBoxes, createBox } from '@/lib/prebuilt-boxes-db'
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

// Create an empty draft box (hidden until shown from the grid).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    const price = Number(body.customPrice)
    const slug = await createBox({
      name,
      audience: body.audience,
      style: body.style,
      variant: body.variant,
      customPrice: Number.isFinite(price) && price > 0 ? Math.round(price) : null,
    })
    return NextResponse.json({ success: true, slug })
  } catch (error) {
    console.error('Portal box create error:', error)
    return NextResponse.json({ error: 'Failed to create box' }, { status: 500 })
  }
}
