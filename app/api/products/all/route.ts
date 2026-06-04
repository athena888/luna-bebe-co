import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/products-db'

// Storefront catalog — active products only, grouped by category.
export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('all') === 'true'
    const products = await getCatalog({ activeOnly: !includeInactive })

    const byCategory: Record<string, typeof products> = {}
    for (const p of products) {
      ;(byCategory[p.category] ??= []).push(p)
    }

    return NextResponse.json({ products, byCategory }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Catalog fetch error:', error)
    return NextResponse.json({ error: 'Failed to load catalog' }, { status: 500 })
  }
}
