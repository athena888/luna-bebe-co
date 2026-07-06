import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/pipeline/prospector'
import { runPressProspector } from '@/lib/pipeline/press-prospector'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Stage 1 cron (nightly, ~02:00 PT): web-search agent finds prospects for
// tonight's metro×category combo, dedups, discovers + grades emails, writes
// A/B survivors as 'discovered' for the 04:00 drafter. Pure discovery — this
// route can never send an email. `?dry=1` runs everything without DB writes.
// NOTE: if Vercel Hobby ever rejects the cron count, fold the drafter cron into
// this route (runProspector then runDrafter) and drop the second vercel.json entry.

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }
  const dry = req.nextUrl.searchParams.get('dry') === '1' || process.env.DRY_RUN === '1'
  try {
    // Corporate first (larger volume), then the press byline slice with the
    // remaining time. Press returns null until its config row is migrated.
    const started = Date.now()
    const stats = await runProspector({ dry, timeBudgetMs: 160_000 })
    const press = await runPressProspector({ dry, startedAt: started, timeBudgetMs: 260_000 })
      .catch(e => { console.error('press prospector failed:', e); return null })
    return NextResponse.json({ ok: true, ...stats, press })
  } catch (e) {
    console.error('outreach-prospect cron error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Prospector failed' }, { status: 500 })
  }
}
