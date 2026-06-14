import { NextRequest, NextResponse } from 'next/server'
import { resolveMx } from 'node:dns/promises'
import { getContactsDueForOutreach, getSuppressedSet, logOutboundEmail, emailDomain } from '@/lib/outreach'
import { templateForTrack, renderTemplate, withFooter } from '@/lib/outreach-templates'
import { sendEmail, gmailSender } from '@/lib/gmail'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Cold-outreach sender. Guarded by CRON_SECRET. Runs weekday mornings.
//
// Guardrails (all enforced here):
//  • Only `outreach_enrolled` contacts are ever eligible (see getContactsDueForOutreach).
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

function firstName(c: { first_name: string | null; name: string | null }): string {
  return (c.first_name?.trim() || (c.name?.trim().split(/\s+/)[0] ?? '')).trim()
}
async function hasMx(domain: string): Promise<boolean> {
  try { return (await resolveMx(domain)).length > 0 } catch { return false }
}
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

  const started = Date.now()
  const [candidates, suppressed] = await Promise.all([
    getContactsDueForOutreach(cap * 3),
    getSuppressedSet(),
  ])

  const sent: { to: string; subject: string; messageId?: string; reason: string }[] = []
  const preview: { to: string; subject: string; body: string; reason: string }[] = []
  const skipped: { to: string; why: string }[] = []

  for (const c of candidates) {
    if (sent.length >= cap || preview.length >= cap) break
    if (Date.now() - started > TIME_BUDGET_MS) break

    const email = c.email.trim().toLowerCase()
    if (suppressed.has(email)) { skipped.push({ to: email, why: 'suppressed' }); continue }

    const domain = emailDomain(email)
    if (!domain || !(await hasMx(domain))) { skipped.push({ to: email, why: 'no MX record' }); continue }

    const tpl = templateForTrack(c.track)
    const rendered = renderTemplate(tpl, { first_name: firstName(c), company: c.company })
    if (!rendered.ok) { skipped.push({ to: email, why: `unresolved merge field: ${rendered.missing.join(', ')}` }); continue }

    const body = withFooter(rendered.result.body)
    const subject = rendered.result.subject

    if (dryRun) {
      preview.push({ to: email, subject, body, reason: c.reason })
      continue
    }

    try {
      const res = await sendEmail({ to: email, subject, text: body, replyTo: gmailSender() })
      await logOutboundEmail(c.id, { subject, snippet: rendered.result.body.slice(0, 280), messageId: res.messageId, track: c.track })
      sent.push({ to: email, subject, messageId: res.messageId, reason: c.reason })
    } catch (e) {
      console.error('outreach send failed for', email, e)
      skipped.push({ to: email, why: 'send error' })
    }
    if (sent.length < cap) await sleep(jitterMs())
  }

  return NextResponse.json({
    ok: true, dryRun, cap,
    eligible: candidates.length,
    sent: dryRun ? preview.length : sent.length,
    skipped: skipped.length,
    ...(dryRun ? { preview } : { sentDetail: sent }),
    skippedDetail: skipped,
  })
}
