import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTiers, getCorporateFields } from '@/lib/lookbook/copy'
import { getConfig, setConfig } from '@/lib/pipeline/config'

export const dynamic = 'force-dynamic'

// Catalog tiers + corporate fields for the builder (portal-authed).
// GET → { tiers, corporate }
// PATCH { id, ...fields } → update one tier inline
// PUT { logo_ribbon?, lead_time?, contact_line?, include_in_first_touch? } →
//   merge into outreach_config.lookbook

export async function GET() {
  try {
    const [tiers, corporate, cfg] = await Promise.all([
      getTiers(), getCorporateFields(), getConfig<{ include_in_first_touch?: boolean }>('lookbook'),
    ])
    return NextResponse.json({ tiers, corporate: { ...corporate, include_in_first_touch: Boolean(cfg?.include_in_first_touch) } })
  } catch (e) {
    console.error('tiers GET error:', e)
    return NextResponse.json({ error: 'Failed to load tiers' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = (await req.json()) as Record<string, unknown>
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const row: Record<string, unknown> = {}
    if (typeof b.name === 'string' && b.name.trim()) row.name = b.name.trim()
    for (const k of ['price', 'corporate_price_10', 'corporate_price_25', 'corporate_price_50', 'sort'] as const) {
      if (b[k] !== undefined) row[k] = b[k] === null || b[k] === '' ? null : Math.max(0, Math.round(Number(b[k])))
    }
    if (b.description !== undefined) row.description = String(b.description ?? '').trim() || null
    if (row.price === null) delete row.price   // price is not nullable
    if (Object.keys(row).length) {
      const { error } = await supabaseAdmin.from('catalog_tiers').update(row).eq('id', b.id)
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('tiers PATCH error:', e)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = (await req.json()) as Record<string, unknown>
    const cur = (await getConfig<Record<string, unknown>>('lookbook')) ?? {}
    const next = { ...cur }
    for (const k of ['logo_ribbon', 'lead_time', 'contact_line'] as const) {
      if (b[k] !== undefined) next[k] = String(b[k] ?? '').trim()
    }
    if (b.include_in_first_touch !== undefined) next.include_in_first_touch = Boolean(b.include_in_first_touch)
    await setConfig('lookbook', next)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('lookbook config PUT error:', e)
    return NextResponse.json({ error: 'Save failed' }, { status: 500 })
  }
}
