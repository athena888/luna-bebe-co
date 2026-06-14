import { NextResponse } from 'next/server'
import { buildPlanPayload, writePlan, todayPT } from '@/lib/cockpit'
import { generateDailyPlan } from '@/lib/cockpit-ai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Manually (re)generate today's plan from the portal — same logic as the cron,
// so Emily can build a plan on demand without waiting for 06:00 PT. Rewrites
// today's tasks/content, so it discards any tick progress for today.
export async function POST() {
  try {
    const date = todayPT()
    const payload = await buildPlanPayload()
    const draft = await generateDailyPlan(payload)
    if (!draft) return NextResponse.json({ error: 'No plan generated' }, { status: 502 })
    await writePlan(date, draft, payload.execution_rate_yesterday)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('cockpit regenerate error:', e)
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
