import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { MIN_PAYOUT_CENTS } from '@/lib/affiliate'

function authorized(req: NextRequest) {
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Step 1: promote pending → eligible after refund window
    await supabaseAdmin.rpc('mark_eligible_conversions')

    // Step 2: group eligible conversions by affiliate and pay out
    const { data: eligible } = await supabaseAdmin
      .from('affiliate_conversions')
      .select('id, affiliate_id, commission_amount')
      .eq('status', 'eligible')

    if (!eligible?.length) return NextResponse.json({ processed: 0 })

    const byAffiliate = new Map<string, { ids: string[]; total: number }>()
    for (const c of eligible) {
      const entry = byAffiliate.get(c.affiliate_id) ?? { ids: [], total: 0 }
      entry.ids.push(c.id)
      entry.total += c.commission_amount
      byAffiliate.set(c.affiliate_id, entry)
    }

    const periodEnd = new Date()
    const periodStart = new Date(periodEnd)
    periodStart.setMonth(periodStart.getMonth() - 1)

    let paid = 0
    let skipped = 0

    for (const [affiliateId, { ids, total }] of byAffiliate) {
      if (total < MIN_PAYOUT_CENTS) { skipped++; continue }

      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('stripe_account_id, stripe_onboarded')
        .eq('id', affiliateId)
        .single()

      if (!aff?.stripe_account_id || !aff.stripe_onboarded) { skipped++; continue }

      const { data: payoutRow } = await supabaseAdmin
        .from('affiliate_payouts')
        .insert({
          affiliate_id: affiliateId,
          amount: total,
          conversion_count: ids.length,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          status: 'pending',
        })
        .select()
        .single()

      if (!payoutRow) { skipped++; continue }

      try {
        const transfer = await stripe.transfers.create({
          amount: total,
          currency: 'usd',
          destination: aff.stripe_account_id,
          metadata: { payout_id: payoutRow.id, affiliate_id: affiliateId },
        })

        await supabaseAdmin
          .from('affiliate_payouts')
          .update({ status: 'paid', stripe_transfer_id: transfer.id, paid_at: new Date().toISOString() })
          .eq('id', payoutRow.id)

        await supabaseAdmin
          .from('affiliate_conversions')
          .update({ status: 'paid', paid_at: new Date().toISOString(), payout_id: payoutRow.id, stripe_transfer_id: transfer.id })
          .in('id', ids)

        paid++
      } catch (transferError) {
        const msg = transferError instanceof Error ? transferError.message : String(transferError)
        console.error('Transfer failed for affiliate', affiliateId, msg)
        await supabaseAdmin
          .from('affiliate_payouts')
          .update({ status: 'failed', failure_reason: msg })
          .eq('id', payoutRow.id)
      }
    }

    return NextResponse.json({ processed: byAffiliate.size, paid, skipped })
  } catch (err) {
    console.error('Affiliate payout cron error:', err)
    return NextResponse.json({ error: 'Payout run failed' }, { status: 500 })
  }
}
