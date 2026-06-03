import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// List pending inventory changes for a product (most recent first).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('inventory_changes')
    .select('*')
    .eq('product_id', id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ changes: [] }) // table may not exist yet — fail soft
  return NextResponse.json({ changes: data ?? [] })
}

// Approve (keep) or revert (undo the added quantity) a change.
// body: { action: 'approve' | 'revert', changeId?: string, all?: boolean }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action, changeId, all } = await req.json()

  if (!['approve', 'revert'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Which pending changes are we acting on?
  let query = supabaseAdmin.from('inventory_changes').select('*').eq('product_id', id).eq('status', 'pending')
  if (!all && changeId) query = query.eq('id', changeId)
  const { data: changes, error } = await query
  if (error) return NextResponse.json({ error: 'Could not load changes' }, { status: 500 })

  for (const c of changes ?? []) {
    if (action === 'revert') {
      // Subtract the delta we previously added; never go below zero
      const { data: v } = await supabaseAdmin
        .from('product_variants')
        .select('quantity')
        .eq('product_id', id).eq('color', c.color).eq('size', c.size)
        .maybeSingle()
      const cur = v?.quantity ?? 0
      await supabaseAdmin
        .from('product_variants')
        .update({ quantity: Math.max(0, cur - (c.delta ?? 0)) })
        .eq('product_id', id).eq('color', c.color).eq('size', c.size)
    }
    await supabaseAdmin
      .from('inventory_changes')
      .update({ status: action === 'approve' ? 'approved' : 'reverted' })
      .eq('id', c.id)
  }

  // If no pending changes remain, clear the product's review flag
  const { count } = await supabaseAdmin
    .from('inventory_changes')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', id).eq('status', 'pending')
  if ((count ?? 0) === 0) {
    await supabaseAdmin.from('products').update({ needs_review: false }).eq('id', id)
  }

  return NextResponse.json({ ok: true, processed: changes?.length ?? 0 })
}
