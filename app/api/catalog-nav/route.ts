import { NextRequest, NextResponse } from 'next/server'
import { getBoxProducts } from '@/lib/catalog-db'

export const dynamic = 'force-dynamic'

// Nav feed for the Gift Boxes dropdown — active AND visible only, so the
// seasonal hide toggle drops Noël from the nav without a deploy.
export async function GET(req: NextRequest) {
  let products = await getBoxProducts()
  if (req.nextUrl.searchParams.get('bestsellers') === '1') {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase')
      const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', 'home.bestseller_boxes').maybeSingle()
      const list: string[] = Array.isArray(data?.value) ? data.value : []
      if (list.length) products = products.filter(p => list.includes(p.slug))
    } catch { /* fall back to all live boxes */ }
  }
  return NextResponse.json({
    products: products.map(p => ({
      slug: p.slug,
      name: p.name,
      image: p.variants[0]?.images[0] ?? null,
      low: Math.min(...p.variants.map(v => v.price)),
      high: Math.max(...p.variants.map(v => v.price)),
    })),
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } })
}
