import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

async function userFromAuthHeader(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function GET(req: NextRequest) {
  try {
    const user = await userFromAuthHeader(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let { data: aff } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .ilike('email', user.email)
      .maybeSingle()

    if (!aff) return NextResponse.json({ error: 'No affiliate account found for this email' }, { status: 404 })

    // Link auth user to affiliate row on first dashboard visit
    if (!aff.user_id) {
      const { data: updated } = await supabaseAdmin
        .from('affiliates')
        .update({ user_id: user.id })
        .eq('id', aff.id)
        .select()
        .single()
      if (updated) aff = updated
    }

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [clicksRes, convRes, recentRes] = await Promise.all([
      supabaseAdmin.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('affiliate_id', aff.id).gte('created_at', since),
      supabaseAdmin.from('affiliate_conversions').select('commission_amount, status').eq('affiliate_id', aff.id),
      supabaseAdmin.from('affiliate_conversions').select('id, created_at, order_total, commission_amount, status').eq('affiliate_id', aff.id).order('created_at', { ascending: false }).limit(20),
    ])

    const conversions = convRes.data ?? []
    const earningsPending = conversions.filter(c => c.status === 'pending').reduce((s, c) => s + c.commission_amount, 0)
    const earningsEligible = conversions.filter(c => c.status === 'eligible').reduce((s, c) => s + c.commission_amount, 0)
    const earningsPaid = conversions.filter(c => c.status === 'paid').reduce((s, c) => s + c.commission_amount, 0)

    return NextResponse.json({
      affiliate: {
        id: aff.id,
        name: aff.name,
        code: aff.code,
        status: aff.status,
        tier: aff.tier,
        commission_rate: aff.commission_rate,
        stripe_onboarded: aff.stripe_onboarded,
        stripe_account_id: aff.stripe_account_id,
      },
      clicks30d: clicksRes.count ?? 0,
      conversions: conversions.length,
      earningsPending,
      earningsEligible,
      earningsPaid,
      recent: recentRes.data ?? [],
    })
  } catch (err) {
    console.error('Affiliate stats error:', err)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
