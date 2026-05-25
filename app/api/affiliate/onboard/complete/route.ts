import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    // Re-check all unfinished affiliates' Stripe status — small batch
    const { data: pendings } = await supabaseAdmin
      .from('affiliates')
      .select('id, stripe_account_id')
      .eq('stripe_onboarded', false)
      .not('stripe_account_id', 'is', null)
      .limit(50)

    for (const aff of pendings ?? []) {
      if (!aff.stripe_account_id) continue
      try {
        const account = await stripe.accounts.retrieve(aff.stripe_account_id)
        if (account.payouts_enabled && account.charges_enabled !== false) {
          await supabaseAdmin
            .from('affiliates')
            .update({ stripe_onboarded: true })
            .eq('id', aff.id)
        }
      } catch (e) {
        console.error('Onboard status check failed:', e)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/affiliate/dashboard`)
  } catch (err) {
    console.error('Onboard complete error:', err)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/affiliate/dashboard`)
  }
}
