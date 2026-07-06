import { NextRequest, NextResponse } from 'next/server'
import { runDrafter } from '@/lib/pipeline/drafter'
import { runPressDrafter } from '@/lib/pipeline/press-drafter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Manual drafter trigger for testing (portal-authed via middleware).
// POST { dry?: boolean }

export async function POST(req: NextRequest) {
  let dry = false
  try { dry = Boolean(((await req.json()) as { dry?: boolean }).dry) } catch { /* no body */ }
  try {
    const started = Date.now()
    const stats = await runDrafter({ dry, timeBudgetMs: 200_000 })
    const press = await runPressDrafter({ dry, deadline: started + 270_000 })
      .catch(e => { console.error('press drafter failed:', e); return null })
    return NextResponse.json({ ok: true, ...stats, press })
  } catch (e) {
    console.error('manual draft error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Drafter failed' }, { status: 500 })
  }
}
