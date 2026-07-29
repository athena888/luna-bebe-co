import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Phase 7 reviewer backend — ES rows side-by-side with their EN source
// snapshots. approved=false → status "auto" (machine, not yet live);
// approved=true → "reviewed" (serving on /es).
export async function GET() {
  const { data } = await supabaseAdmin
    .from('translations').select('entity_type, entity_id, locale, field, value, approved, updated_at')
    .order('updated_at', { ascending: false }).limit(1000)
  const rows = data ?? []
  const en = new Map(rows.filter(r => r.locale === 'en').map(r => [`${r.entity_type}:${r.entity_id}:${r.field}`, r.value]))
  const out = rows.filter(r => r.locale === 'es').map(r => ({
    entity_type: r.entity_type, entity_id: r.entity_id, field: r.field,
    es: r.value, en: en.get(`${r.entity_type}:${r.entity_id}:${r.field}`) ?? null,
    approved: r.approved, updated_at: r.updated_at,
  }))
  return NextResponse.json({ rows: out })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { entity_type, entity_id, field } = body
  if (!entity_type || !entity_id || !field) return NextResponse.json({ error: 'missing key' }, { status: 400 })
  const patch: Record<string, unknown> = { approved: true, updated_at: new Date().toISOString() }
  if (typeof body.value === 'string' && body.value.trim()) patch.value = body.value.trim()
  const { error } = await supabaseAdmin.from('translations').update(patch)
    .eq('entity_type', entity_type).eq('entity_id', entity_id).eq('locale', 'es').eq('field', field)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
