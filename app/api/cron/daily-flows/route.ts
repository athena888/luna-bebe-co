import { NextRequest, NextResponse } from 'next/server'
import { processDueEmails, scheduleWinBacks } from '@/lib/email-flows'
import { snapshotCurrentWeek } from '@/lib/scorecard'
import { resend } from '@/lib/resend'
import { CONTACT_EMAIL } from '@/lib/site-config'

// Vercel Cron — daily 15:00 UTC (vercel.json). One route on purpose: Hobby
// crons must stay ≤ once/day, so this drains the email-flow queue, enrolls
// win-backs, and on Fridays snapshots the scorecard + emails the digest.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result: Record<string, unknown> = {}

  try {
    result.winbacksEnrolled = await scheduleWinBacks()
  } catch (e) {
    console.error('Win-back enrollment failed (email_events table ready?):', e)
    result.winbacksEnrolled = 'error'
  }

  // Occasion sends (Build 3) — no-op until OCCASIONS_ACTIVE=true. Runs before
  // the drain so a just-due occasion email goes out the same day.
  try {
    const { scheduleOccasionSends } = await import('@/lib/occasions')
    result.occasionsQueued = await scheduleOccasionSends()
  } catch (e) {
    console.error('Occasion scheduling failed (run §39?):', e)
    result.occasionsQueued = 'error'
  }

  try {
    result.flows = await processDueEmails()
  } catch (e) {
    console.error('Flow queue processing failed:', e)
    result.flows = 'error'
  }

  // Friday: snapshot the week + email the digest.
  if (new Date().getUTCDay() === 5) {
    try {
      const week = await snapshotCurrentWeek()
      const fmt = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      const pct = (n: number | null) => n == null ? '—' : `${(n * 100).toFixed(1)}%`
      const lines = [
        `Week of ${week.weekOf}`,
        '',
        `Revenue:        ${fmt(week.revenue)}`,
        `Orders:         ${week.orders}`,
        `AOV:            ${week.orders ? fmt(week.aov) : '—'}`,
        `Sessions:       ${week.sessions ?? '— (GA not configured)'}`,
        `CVR:            ${pct(week.cvr)}`,
        `Email revenue:  ${fmt(week.emailRevenue)}`,
        `Repeat rate:    ${pct(week.repeatRate)}`,
        `Weeks on hand:  ${week.weeksOnHand != null ? week.weeksOnHand.toFixed(1) : '—'}`,
        '',
        'Write the one sentence in Portal → Analytics: "Next week I will change ___".',
      ].join('\n')
      await resend.emails.send({
        from: `Petite Lavande <${CONTACT_EMAIL}>`,
        to: process.env.ADMIN_EMAIL || CONTACT_EMAIL,
        subject: `Weekly scorecard — ${fmt(week.revenue)}, ${week.orders} orders`,
        text: lines,
      })
      result.scorecard = week.weekOf
    } catch (e) {
      console.error('Friday scorecard snapshot/digest failed:', e)
      result.scorecard = 'error'
    }
  }

  return NextResponse.json({ ok: true, ...result })
}
