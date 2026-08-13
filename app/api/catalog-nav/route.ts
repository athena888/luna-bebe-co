import { NextRequest, NextResponse } from 'next/server'
import { getBoxProducts } from '@/lib/catalog-db'

export const dynamic = 'force-dynamic'

// Nav feed for the Gift Boxes dropdown — active AND visible only, so the
// seasonal hide toggle drops Noël from the nav without a deploy.
export async function GET(req: NextRequest) {
  let products = await getBoxProducts()
  let picks: Array<{ slug: string; name: string; image: string | null; low: number; high: number; href: string }> | null = null
  if (req.nextUrl.searchParams.get('bestsellers') === '1') {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase')
      const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', 'home.bestseller_boxes').maybeSingle()
      const list: string[] = Array.isArray(data?.value) ? data.value : []
      if (list.length) {
        picks = []
        for (const entry of list) {
          const [slug, key] = entry.split(':')
          const p = products.find(x => x.slug === slug)
          if (!p) continue
          const v = (key ? p.variants.find(x => x.key === key) : null) ?? p.variants[0]
          picks.push({
            slug: entry,
            name: p.variants.length > 1 && key ? `${p.name} — ${v.label}` : p.name,
            image: v.images[0] ?? null,
            low: v.price, high: v.price,
            href: key && p.variants.length > 1 ? `/boxes/${p.slug}?${p.variantParam}=${encodeURIComponent(key)}` : `/boxes/${p.slug}`,
          })
        }
      }
    } catch { /* fall back to all live boxes */ }
  }
  if (picks) {
    return NextResponse.json({ products: picks }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } })
  }
  return NextResponse.json({
    products: products.map(p => ({
      slug: p.slug,
      name: p.name,
      image: ((p.story as { hub_image?: string })?.hub_image) || p.variants[0]?.images[0] || null,
      low: Math.min(...p.variants.map(v => v.price)),
      high: Math.max(...p.variants.map(v => v.price)),
      href: `/boxes/${p.slug}`,
    })),
  }, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' } })
}
