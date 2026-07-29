import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Phase 4 — resumable builder. Cart-recovery emails link /build?resume=<orderId>;
// this returns the pending order's selected items so the builder can restore
// the half-built box. Pending only: paid/refunded orders never resume, so a
// stale link after purchase just opens an empty builder. Order ids are UUIDs
// (unguessable); only item selections are exposed — never customer fields.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('order')
  if (!id) return NextResponse.json({ items: [] })
  const { data } = await supabaseAdmin
    .from('orders').select('selected_items, status').eq('id', id).maybeSingle()
  if (!data || data.status !== 'pending') return NextResponse.json({ items: [] })
  return NextResponse.json({ items: data.selected_items ?? [] })
}
