import { NextRequest, NextResponse } from 'next/server'
import { runDrafter } from '@/lib/pipeline/drafter'
import { runPressDrafter } from '@/lib/pipeline/press-drafter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Stage 2 cron (nightly, ~04:00 PT): drafts one email per discovered A/B
// prospect (template + AI opening) and 6-day follow-ups, all into the morning
// review queue as 'pending_review'. This route can never send an email —
// sending happens only in the queue drainer, only for approved drafts.

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
    const stats = await runDrafter({ dry, timeBudgetMs: 200_000 })
    const press = await runPressDrafter({ dry, deadline: started + 270_000 })
      .catch(e => { console.error('press drafter failed:', e); return null })
    return NextResponse.json({ ok: true, ...stats, press })
  } catch (e) {
    console.error('outreach-draft cron error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Drafter failed' }, { status: 500 })
  }
}
