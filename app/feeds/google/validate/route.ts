import { NextResponse } from 'next/server'
import { buildFeed } from '@/lib/google-feed'

// Feed health check — per-product problems, plus what the feed will emit.
// Fail loudly here beats diagnosing disapprovals inside Merchant Center.
export const dynamic = 'force-dynamic'

export async function GET() {
  const { items, issues } = await buildFeed()
  return NextResponse.json({
    emitted: items.length,
    excluded: issues.filter(i => i.problems.some(p => !p.includes('stripped'))).length,
    issues,
    items: items.map(i => ({ id: i.id, availability: i.availability, price: i.price, category: i.categoryId })),
  })
}
