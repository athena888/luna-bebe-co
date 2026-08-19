import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/pipeline/prospector'
import { runPressProspector } from '@/lib/pipeline/press-prospector'
import { runProspectorV2 } from '@/lib/outreach/prospector-v2'
import { getConfig } from '@/lib/pipeline/config'
import { runCycleV3 } from '@/lib/outreach/cycle-v3'
import { ingestIntakeFiles } from '@/lib/outreach/intake'

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
    // Repo-file intake FIRST: the cloud research routine commits its findings
    // to ops/outreach-intake/ (its sandbox cannot reach this site directly),
    // and last night's deploy bundled them. Runs before discovery/qualification
    // so today's leads flow through the same pass. ?intake_only=1 runs just
    // this step (surgical reruns without re-triggering paid discovery).
    const intake = await ingestIntakeFiles().catch(e => { console.error('intake failed:', e); return null })
    if (req.nextUrl.searchParams.get('intake_only') === '1') {
      return NextResponse.json({ ok: true, intake })
    }
    const v2 = (await getConfig<{ enabled?: boolean }>('targeting_v2'))?.enabled === true
    const stats = v2
      ? await runProspectorV2({ dry, timeBudgetMs: 160_000 })
      : await runProspector({ dry, timeBudgetMs: 160_000 })
    // v3 cycle: enrich → qualify → discover contacts. This is what makes the
    // quality layer actually run on a schedule; without it the v3 modules only
    // ever executed by hand from scripts/. Runs AFTER discovery so tonight's
    // finds are enriched and scored in the same pass. Fail-soft: a research
    // error must never take down discovery.
    const cycle = await runCycleV3({ dry })
      .catch(e => { console.error('v3 cycle failed:', e); return null })
    const press = await runPressProspector({ dry, startedAt: started, timeBudgetMs: 260_000 })
      .catch(e => { console.error('press prospector failed:', e); return null })
    return NextResponse.json({ ok: true, intake, mode: v2 ? 'v2' : 'v1', ...stats, cycle, press })
  } catch (e) {
    console.error('outreach-prospect cron error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Prospector failed' }, { status: 500 })
  }
}
