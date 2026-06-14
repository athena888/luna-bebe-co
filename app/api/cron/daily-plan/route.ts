import { NextRequest, NextResponse } from 'next/server'
import { buildPlanPayload, writePlan, getPlan, todayPT } from '@/lib/cockpit'
import { generateDailyPlan } from '@/lib/cockpit-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// 06:00 PT (13:00 UTC) — reads yesterday's results + the sales trend, asks the
// §7.3 generator for today's plan, and writes it. Idempotent: re-running the
// same day is a no-op unless ?force=1 (which rewrites, discarding tick progress).
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = todayPT()
  const force = req.nextUrl.searchParams.get('force') === '1'
  if (!force && (await getPlan(date))) {
    return NextResponse.json({ ok: true, skipped: 'plan already exists for today' })
  }

  try {
    const payload = await buildPlanPayload()
    const draft = await generateDailyPlan(payload)
    if (!draft) return NextResponse.json({ error: 'Generator returned no plan' }, { status: 502 })
    await writePlan(date, draft, payload.execution_rate_yesterday)
    return NextResponse.json({ ok: true, date, tasks: draft.tasks.length, content: draft.content_plan.length })
  } catch (e) {
    console.error('daily-plan cron error:', e)
    return NextResponse.json({ error: 'Failed to build plan' }, { status: 500 })
  }
}
