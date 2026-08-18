import { NextRequest, NextResponse } from 'next/server'
import { runDrafter } from '@/lib/pipeline/drafter'
import { runPressDrafter } from '@/lib/pipeline/press-drafter'
import { runDrafterV2 } from '@/lib/outreach/drafter-v2'
import { runReplyTriage } from '@/lib/outreach/reply-triage'
import { maybeSendWeeklySummary } from '@/lib/outreach/metrics'
import { getConfig } from '@/lib/pipeline/config'
import { runGmailSync } from '@/lib/outreach/gmail-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Stage 2 cron (nightly, ~04:00 PT): drafts one email per discovered A/B
// prospect and 6-day follow-ups, all into the morning review queue as
// 'pending_review'. This route can never send an email — sending happens only
// in the queue drainer, only for approved drafts.
// targeting_v2.enabled (outreach_config) switches to FROZEN templates with
// variable-fill-only personalization (zero model calls in drafting); it also
// runs the optional batched reply triage (default off) and the Friday weekly
// summary. Default off = legacy drafter with the AI opening sentence.

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1' || process.env.DRY_RUN === '1'
  try {
    const started = Date.now()
    // Reply/bounce sync runs FIRST, before any follow-up is drafted. Drafting a
    // chase for someone who already replied is the fastest way to earn a spam
    // complaint, so measurement must lead. Folded into this existing cron
    // rather than adding an entry (Vercel Hobby caps cron frequency).
    // No-ops safely when gmail.readonly has not been granted.
    const sync = await runGmailSync({ dry })
      .catch(e => { console.error('gmail sync failed:', e); return null })
    const v2 = (await getConfig<{ enabled?: boolean }>('targeting_v2'))?.enabled === true
    const stats = v2
      ? await runDrafterV2({ dry, timeBudgetMs: 200_000 })
      : await runDrafter({ dry, timeBudgetMs: 200_000 })
    const triage = v2
      ? await runReplyTriage({ dry }).catch(e => { console.error('reply triage failed:', e); return null })
      : null
    const weekly = v2
      ? await maybeSendWeeklySummary({ dry }).catch(e => { console.error('weekly summary failed:', e); return null })
      : null
    const press = await runPressDrafter({ dry, deadline: started + 270_000 })
      .catch(e => { console.error('press drafter failed:', e); return null })
    return NextResponse.json({ ok: true, mode: v2 ? 'v2' : 'v1', ...stats, sync, triage, weekly, press })
  } catch (e) {
    console.error('outreach-draft cron error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Drafter failed' }, { status: 500 })
  }
}
