import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
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

export async function POST(req: NextRequest) {
  try {
    const user = await userFromAuthHeader(req)
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: aff } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .ilike('email', user.email)
      .maybeSingle()

    if (!aff) return NextResponse.json({ error: 'No affiliate account' }, { status: 404 })
    if (aff.status !== 'approved') return NextResponse.json({ error: 'Account not approved yet' }, { status: 403 })

    let accountId = aff.stripe_account_id
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: aff.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { affiliate_id: aff.id },
      })
      accountId = account.id
      await supabaseAdmin.from('affiliates').update({ stripe_account_id: accountId }).eq('id', aff.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/affiliate/onboard/refresh`,
      return_url: `${baseUrl}/api/affiliate/onboard/complete`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error('Affiliate onboard error:', err)
    return NextResponse.json({ error: 'Failed to start onboarding' }, { status: 500 })
  }
}
