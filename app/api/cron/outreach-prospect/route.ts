import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/pipeline/prospector'
import { runPressProspector } from '@/lib/pipeline/press-prospector'
import { runProspectorV2 } from '@/lib/outreach/prospector-v2'
import { getConfig } from '@/lib/pipeline/config'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Stage 1 cron (nightly, ~02:00 PT): web-search agent finds prospects for
// the current combo, dedups, discovers + grades emails, writes A/B survivors
// as 'discovered' for the 04:00 drafter. Pure discovery — this route can never
// send an email. `?dry=1` runs everything without DB writes.
// targeting_v2.enabled (outreach_config) switches to the weekly city×industry
// rotation with batched Haiku qualification; default off = legacy nightly combo.
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
    const started = Date.now()
    const v2 = (await getConfig<{ enabled?: boolean }>('targeting_v2'))?.enabled === true
    const stats = v2
      ? await runProspectorV2({ dry, timeBudgetMs: 160_000 })
      : await runProspector({ dry, timeBudgetMs: 160_000 })
    const press = await runPressProspector({ dry, startedAt: started, timeBudgetMs: 260_000 })
      .catch(e => { console.error('press prospector failed:', e); return null })
    return NextResponse.json({ ok: true, mode: v2 ? 'v2' : 'v1', ...stats, press })
  } catch (e) {
    console.error('outreach-prospect cron error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Prospector failed' }, { status: 500 })
  }
}
