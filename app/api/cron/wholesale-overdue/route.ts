import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function authorized(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data } = await supabaseAdmin.rpc('mark_overdue_invoices')
    return NextResponse.json({ marked: data ?? 0 })
  } catch (err) {
    console.error('Wholesale overdue cron error:', err)
    return NextResponse.json({ error: 'Run failed' }, { status: 500 })
  }
}
