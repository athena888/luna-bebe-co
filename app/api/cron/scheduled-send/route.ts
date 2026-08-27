import { NextRequest, NextResponse } from 'next/server'
import { logOutboundEmail, getDueCampaigns, updateCampaignProgress, type Campaign } from '@/lib/outreach'
import { planOutreach, injectCode } from '@/lib/outreach-send'
import { sendEmail, gmailSender } from '@/lib/gmail'
import { drainPipelineQueue } from '@/lib/pipeline/sender'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Fires scheduled outreach campaigns when their time arrives. Guarded by
// CRON_SECRET. Runs every 30 min — a campaign sends when the next tick after its
// scheduled_at runs. Resumable: a campaign stays 'sending' until its due audience
// is drained (fewer than a full cap remain), then flips to 'sent'. All the usual
// guards (suppression, MX, strict merge, footer, STOP) come from planOutreach.
//
// ALSO drains the daily-pipeline queue (morning-review approved drafts) first —
// this tick fires 17:00 UTC (9/10am PT), right after Emily's review. The drainer
// only ever selects sends joined to drafts with status 'approved_by_user' and
// enforces the daily cap from today's outbound touches count.

const TIME_BUDGET_MS = 280_000

function jitterMs(): number {
  const min = Number(process.env.OUTREACH_GAP_MIN_MS) || 4000
  const max = Number(process.env.OUTREACH_GAP_MAX_MS) || 12000
  return min + Math.floor(Math.random() * Math.max(0, max - min))
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.GOOGLE_SA_KEY) {
    return NextResponse.json({ error: 'GOOGLE_SA_KEY not set' }, { status: 500 })
  }

  const started = Date.now()
  const nowIso = new Date().toISOString()
  const cap = Math.max(1, Number(process.env.OUTREACH_DAILY_CAP) || 25)

  // 1) Daily-pipeline queue (approved-only, cap-aware, jittered).
  const pipeline = await drainPipelineQueue({ startedAt: started, timeBudgetMs: TIME_BUDGET_MS })
    .catch(e => { console.error('pipeline drain failed:', e); return null })

  // 2) Scheduled campaigns.
  const due: Campaign[] = await getDueCampaigns(nowIso)
  const summary: { id: string; name: string | null; sent: number; skipped: number; status: string }[] = []

  for (const c of due) {
    if (Date.now() - started > TIME_BUDGET_MS) break
    if (c.status === 'scheduled') await updateCampaignProgress(c.id, { status: 'sending' })

    const runCap = Math.max(1, c.per_run_cap ?? cap)
    const { planned, skipped } = await planOutreach(runCap, { trackFilter: c.track_filter, templateKey: c.template_key })

    let sent = 0
    for (let i = 0; i < planned.length; i++) {
      if (Date.now() - started > TIME_BUDGET_MS) break
      const p = planned[i]
      const body = await injectCode(p.body)
      if (!body) { console.error('campaign code mint failed', c.id, p.to); continue }
      try {
        const res = await sendEmail({ to: p.to, subject: p.subject, text: body, replyTo: gmailSender() })
        await logOutboundEmail(p.contactId, { subject: p.subject, snippet: body.slice(0, 280), messageId: res.messageId, track: p.track })
        sent++
      } catch (e) { console.error('campaign send failed', c.id, p.to, e) }
      if (i < planned.length - 1) await sleep(jitterMs())
    }

    // Drained when fewer than a full cap were sendable this run (the rest are
    // skips that never enter `planned`, or there's simply no one left).
    const drained = planned.length < runCap
    await updateCampaignProgress(c.id, {
      addSent: sent, addSkipped: skipped.length,
      ...(drained ? { status: 'sent', sent_at: new Date().toISOString() } : {}),
    })
    summary.push({ id: c.id, name: c.name, sent, skipped: skipped.length, status: drained ? 'sent' : 'sending' })
  }

  return NextResponse.json({
    ok: true,
    // `dry` is the difference between "64 emails went out" and "nothing
    // happened" — it was omitted, and a dry tick read as a real burst.
    pipeline: pipeline ? { dry: pipeline.dry, paused: pipeline.paused ?? false, sent: pipeline.sent, failed: pipeline.failed, skipped: pipeline.skipped.length, capRemaining: pipeline.capRemaining } : null,
    processed: summary.length,
    campaigns: summary,
  })
}
