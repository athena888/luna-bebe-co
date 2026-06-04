import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Persist a new display order for a product's gallery (sort_order = position).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { orderedIds } = await req.json() as { orderedIds: string[] }
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 })
  }
  for (let i = 0; i < orderedIds.length; i++) {
    await supabaseAdmin
      .from('product_gallery')
      .update({ sort_order: i })
      .eq('id', orderedIds[i])
      .eq('product_id', id)
  }
  return NextResponse.json({ ok: true })
}
