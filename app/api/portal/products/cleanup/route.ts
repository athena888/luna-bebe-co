import { NextResponse } from 'next/server'
import { productsWithoutImages, deleteProduct } from '@/lib/products-db'

// List products with no image (and not protected by a prebuilt box).
export async function GET() {
  try {
    const candidates = await productsWithoutImages()
    return NextResponse.json({
      candidates: candidates.map(p => ({ id: p.id, name: p.name, category: p.category })),
    })
  } catch (error) {
    console.error('Cleanup list error:', error)
    return NextResponse.json({ error: 'Failed to list products' }, { status: 500 })
  }
}

// Permanently delete all products with no image (excluding protected ones).
export async function POST() {
  try {
    const candidates = await productsWithoutImages()
    const deleted: string[] = []
    const skipped: Array<{ id: string; reason: string }> = []

    for (const p of candidates) {
      const result = await deleteProduct(p.id)
      if (result.ok) deleted.push(p.id)
      else skipped.push({ id: p.id, reason: result.reason ?? 'skipped' })
    }

    return NextResponse.json({ deleted, skipped })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
