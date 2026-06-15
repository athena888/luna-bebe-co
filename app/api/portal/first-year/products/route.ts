import { NextRequest, NextResponse } from 'next/server'
import {
  listFirstYearProducts, createFirstYearProduct, updateFirstYearProduct, deleteFirstYearProduct,
} from '@/lib/first-year-products'

export const dynamic = 'force-dynamic'

// Admin CRUD for the First Year product catalog. Guarded by /api/portal/* middleware.

export async function GET() {
  return NextResponse.json({ products: await listFirstYearProducts() })
}

// Create a blank draft, return it so the editor can open immediately.
export async function POST() {
  try {
    return NextResponse.json({ product: await createFirstYearProduct() })
  } catch (e) {
    console.error('first-year product create error:', e)
    return NextResponse.json({ error: 'Could not create. Has the migration been run?' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const num = (v: unknown) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)))
    await updateFirstYearProduct(b.id, {
      name: b.name,
      description: b.description,
      price_cents: num(b.price_cents),
      sizes: b.sizes ?? null,
      shipment_index: num(b.shipment_index),
      sort_order: Number.isFinite(Number(b.sort_order)) ? Math.round(Number(b.sort_order)) : 0,
      published: !!b.published,
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('first-year product update error:', e)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await deleteFirstYearProduct(id)
  return NextResponse.json({ ok: true })
}
