import { NextRequest, NextResponse } from 'next/server'
import { reconcilePayments, formatGapAlert, type PaymentGap } from '@/lib/payment-reconcile'
import { resend } from '@/lib/resend'
import { CONTACT_EMAIL, adminRecipients } from '@/lib/site-config'

// On-demand version of the daily reconciliation (same check the daily-flows
// cron runs). Portal-protected. `?days=N` widens the window — default 7,
// capped at 90 so a stray query can't page through all of Stripe.
//
// `?test=1` sends a clearly-labelled SAMPLE alert through the real alert path
// (same formatter, same recipients, same mailer) so delivery can be proven
// without waiting for a real payment to go missing. An alert nobody receives
// is not an alert, and that can only be established by actually sending one.
export const dynamic = 'force-dynamic'

const SAMPLE_GAP: PaymentGap = {
  sessionId: 'cs_live_SAMPLE_not_a_real_payment',
  paidAt: new Date().toISOString(),
  amountCents: 16500,
  email: 'sample.customer@example.com',
  orderId: null,
  problem: 'order_missing',
}

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('days'))
  const days = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 90) : 7

  if (req.nextUrl.searchParams.get('test') === '1') {
    const to = adminRecipients()
    try {
      const sent = await resend.emails.send({
        from: `Petite Lavande <${CONTACT_EMAIL}>`,
        to,
        subject: '[TEST] Payment alert delivery check — no action needed',
        text: [
          'This is a TEST of the payment-gap alert. Nothing is wrong.',
          'No customer was charged; the payment below is fabricated for this test.',
          '',
          'If you received this at every address you expect, the alert path works.',
          '',
          '--- sample of a real alert ---',
          '',
          formatGapAlert([SAMPLE_GAP]),
        ].join('\n'),
      })
      return NextResponse.json({ ok: true, test: true, sentTo: to, id: sent.data?.id ?? null, error: sent.error ?? null })
    } catch (e) {
      return NextResponse.json({ ok: false, test: true, sentTo: to, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  try {
    const { checked, giftCards, gaps } = await reconcilePayments(days)
    return NextResponse.json({
      ok: gaps.length === 0,
      windowDays: days,
      paidSessionsChecked: checked,
      giftCardSessionsSkipped: giftCards,
      alertsGoTo: adminRecipients(),
      gaps,
      verdict: gaps.length === 0
        ? `No gaps — every paid order in the last ${days} days is recorded in the shop.`
        : `${gaps.length} paid payment(s) missing from the shop — these customers were charged.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
