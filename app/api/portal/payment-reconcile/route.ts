import { NextRequest, NextResponse } from 'next/server'
import { reconcilePayments } from '@/lib/payment-reconcile'

// On-demand version of the daily reconciliation (same check the daily-flows
// cron runs). Portal-protected. `?days=N` widens the window — default 7,
// capped at 90 so a stray query can't page through all of Stripe.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('days'))
  const days = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 90) : 7

  try {
    const { checked, giftCards, gaps } = await reconcilePayments(days)
    return NextResponse.json({
      ok: gaps.length === 0,
      windowDays: days,
      paidSessionsChecked: checked,
      giftCardSessionsSkipped: giftCards,
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
