import { NextRequest, NextResponse } from 'next/server'
import { runDrafter } from '@/lib/pipeline/drafter'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Manual drafter trigger for testing (portal-authed via middleware).
// POST { dry?: boolean }

export async function POST(req: NextRequest) {
  let dry = false
  try { dry = Boolean(((await req.json()) as { dry?: boolean }).dry) } catch { /* no body */ }
  try {
    const stats = await runDrafter({ dry, timeBudgetMs: 270_000 })
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    console.error('manual draft error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Drafter failed' }, { status: 500 })
  }
}
