import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateAffiliateCode, COMMISSION_RATES } from '@/lib/affiliate'

export async function POST(req: NextRequest) {
  try {
    const { name, email, socialHandle, audienceSize, notes } = await req.json()
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('id, status')
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An application with this email already exists.' }, { status: 409 })
    }

    let code = generateAffiliateCode(name)
    // Retry on collision
    for (let i = 0; i < 3; i++) {
      const { data: clash } = await supabaseAdmin.from('affiliates').select('id').eq('code', code).maybeSingle()
      if (!clash) break
      code = generateAffiliateCode(name)
    }

    const { error } = await supabaseAdmin.from('affiliates').insert({
      name,
      email,
      code,
      commission_rate: COMMISSION_RATES.standard,
      social_handle: socialHandle || null,
      audience_size: audienceSize || null,
      notes: notes || null,
      status: 'pending',
    })

    if (error) {
      console.error('Affiliate apply error:', error)
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Affiliate apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
