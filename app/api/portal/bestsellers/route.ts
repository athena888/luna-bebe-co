import { NextRequest, NextResponse } from 'next/server'
import { getBestsellerProducts } from '@/lib/bestsellers'
import { getCatalog, updateProduct } from '@/lib/products-db'

// Admin: the actual displayed bestsellers + whether the list is curated, plus
// the rest of the catalog (for the "add" picker).
export async function GET() {
  const [{ products, curated }, catalog] = await Promise.all([
    getBestsellerProducts(24),
    getCatalog({ activeOnly: true }),
  ])
  const shownIds = new Set(products.map(p => p.id))
  const addable = catalog
    .filter(p => !shownIds.has(p.id))
    .map(p => ({ id: p.id, name: p.name, category: p.category }))
  const items = products.map(p => ({
    id: p.id, name: p.name, category: p.category, image: p.image ?? null, featured: !!p.featured,
  }))
  return NextResponse.json({ items, curated, addable })
}

// Add/remove a product from the curated bestsellers (sets the featured flag).
export async function POST(req: NextRequest) {
  try {
    const { id, featured } = await req.json()
    if (!id || typeof featured !== 'boolean') {
      return NextResponse.json({ error: 'id and featured required' }, { status: 400 })
    }
    await updateProduct(id, { featured })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('bestsellers POST error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
