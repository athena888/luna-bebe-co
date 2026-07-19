import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Saves the one-sentence weekly note ("Next week I will change ___") shown on
// Portal → Analytics. Metrics columns are filled by the Friday snapshot.
export async function PATCH(req: NextRequest) {
  try {
    const { week_of, note }: { week_of?: string; note?: string } = await req.json()
    if (!week_of || !/^\d{4}-\d{2}-\d{2}$/.test(week_of)) {
      return NextResponse.json({ error: 'week_of (YYYY-MM-DD) required' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('weekly_scorecard')
      .upsert({ week_of, note: (note ?? '').trim() || null }, { onConflict: 'week_of' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
