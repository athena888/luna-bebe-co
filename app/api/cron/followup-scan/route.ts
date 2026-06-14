import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { todayPT } from '@/lib/cockpit'

export const dynamic = 'force-dynamic'

// Flips outbound emails whose follow-up date has arrived from 'sent' →
// 'followup_due' so they surface in the cockpit's "Follow-ups due" section.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = todayPT()
    const { data, error } = await supabaseAdmin.from('touches')
      .update({ status: 'followup_due' })
      .eq('direction', 'outbound').eq('status', 'sent')
      .not('followup_due', 'is', null).lte('followup_due', today)
      .select('id')
    if (error) throw error
    return NextResponse.json({ ok: true, flagged: (data ?? []).length })
  } catch (e) {
    console.error('followup-scan cron error:', e)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
