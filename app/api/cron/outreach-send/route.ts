import { NextRequest, NextResponse } from 'next/server'
import { logOutboundEmail } from '@/lib/outreach'
import { planOutreach, injectCode } from '@/lib/outreach-send'
import { sendEmail, gmailSender } from '@/lib/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Cold-outreach sender. Guarded by CRON_SECRET. Runs weekday mornings.
//
// Guardrails (planning is shared with the portal preview via planOutreach):
//  • Only `outreach_enrolled` contacts are ever eligible.
//  • Suppression list + MX-record bounce guard skip bad/unsubscribed recipients.
//  • Strict template render — REFUSES to send if any merge field is unresolved.
//  • Hard daily cap (OUTREACH_DAILY_CAP, default 25) + jittered gap between sends.
//  • CAN-SPAM footer (postal address + STOP opt-out) on every email.
//  • DRY_RUN=1 (env or ?dry=1) lists who it WOULD email, with rendered bodies, no send.
//
// Serverless note: a true 30-90s human gap would blow the function timeout at the
// daily cap, so the gap is configurable (OUTREACH_GAP_MIN_MS/MAX_MS, default 4-12s)
// and the run also stops at a soft time budget, resuming on the next trigger.

const TIME_BUDGET_MS = 280_000

function jitterMs(): number {
  const min = Number(process.env.OUTREACH_GAP_MIN_MS) || 4000
  const max = Number(process.env.OUTREACH_GAP_MAX_MS) || 12000
  return min + Math.floor(Math.random() * Math.max(0, max - min))
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = process.env.DRY_RUN === '1' || req.nextUrl.searchParams.get('dry') === '1'
  const cap = Math.max(0, Number(process.env.OUTREACH_DAILY_CAP) || 25)
  if (cap === 0) return NextResponse.json({ ok: true, dryRun, sent: 0, note: 'cap is 0' })

  if (!dryRun && !process.env.GOOGLE_SA_KEY) {
    return NextResponse.json({ error: 'GOOGLE_SA_KEY not set' }, { status: 500 })
  }

  const { planned, skipped, eligible } = await planOutreach(cap, { sampleCode: dryRun })

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, cap, eligible, sent: 0,
      preview: planned, skipped })
  }

  const started = Date.now()
  const sent: { to: string; messageId: string }[] = []
  const failed: { to: string; why: string }[] = [...skipped]

  for (let i = 0; i < planned.length; i++) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    const p = planned[i]
    const body = await injectCode(p.body)
    if (!body) { failed.push({ to: p.to, why: 'discount code error' }); continue }
    try {
      const res = await sendEmail({ to: p.to, subject: p.subject, text: body, replyTo: gmailSender() })
      await logOutboundEmail(p.contactId, { subject: p.subject, snippet: body.slice(0, 280), messageId: res.messageId, track: p.track })
      sent.push({ to: p.to, messageId: res.messageId })
    } catch (e) {
      console.error('outreach send failed for', p.to, e)
      failed.push({ to: p.to, why: 'send error' })
    }
    if (i < planned.length - 1) await sleep(jitterMs())
  }

  return NextResponse.json({ ok: true, dryRun: false, cap, eligible, sent: sent.length, sentDetail: sent, skipped: failed })
}
