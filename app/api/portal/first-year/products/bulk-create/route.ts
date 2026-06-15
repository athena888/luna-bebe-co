import { NextRequest, NextResponse } from 'next/server'
import { createFirstYearProduct, updateFirstYearProduct } from '@/lib/first-year-products'

export const dynamic = 'force-dynamic'

// Create one First Year product per reviewed group. Each is created as a DRAFT
// (published:false) so nothing goes live until you check it. Admin-guarded.
export async function POST(req: NextRequest) {
  try {
    const { groups, shipment_index } = await req.json() as {
      groups?: Array<{ name?: string; description?: string; price_cents?: number | null; images?: string[] }>
      shipment_index?: number | null
    }
    const list = (groups ?? []).filter(g => Array.isArray(g.images) && g.images.length > 0)
    if (!list.length) return NextResponse.json({ error: 'Nothing to create' }, { status: 400 })

    const ship = Number.isInteger(shipment_index) ? shipment_index : null
    let created = 0
    for (const g of list) {
      const row = await createFirstYearProduct()
      await updateFirstYearProduct(row.id, {
        name: (g.name ?? '').slice(0, 80),
        description: (g.description ?? '').slice(0, 600),
        price_cents: g.price_cents == null || !Number.isFinite(Number(g.price_cents)) ? null : Math.round(Number(g.price_cents)),
        images: (g.images ?? []).filter(u => typeof u === 'string'),
        shipment_index: ship,
        published: false,
      })
      created++
    }
    return NextResponse.json({ created })
  } catch (e) {
    console.error('first-year bulk-create error:', e)
    return NextResponse.json({ error: 'Could not create products. Has the migration been run?' }, { status: 500 })
  }
}
