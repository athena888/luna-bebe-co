import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { code, landing, referrer, ua, ip } = await req.json()
    if (!code || !/^[A-Z0-9-]{3,32}$/.test(code)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const { data: aff } = await supabaseAdmin
      .from('affiliates')
      .select('id, status')
      .eq('code', code)
      .maybeSingle()

    if (!aff || aff.status !== 'approved') {
      return NextResponse.json({ ok: false })
    }

    await supabaseAdmin.from('affiliate_clicks').insert({
      affiliate_id: aff.id,
      ip: ip || null,
      user_agent: ua || null,
      referrer: referrer || null,
      landing_path: landing || null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Affiliate track error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
