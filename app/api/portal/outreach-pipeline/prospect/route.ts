import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/pipeline/prospector'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Manual prospector trigger for testing (portal-authed via middleware).
// POST { dry?: boolean }

export async function POST(req: NextRequest) {
  let dry = false
  try { dry = Boolean(((await req.json()) as { dry?: boolean }).dry) } catch { /* no body */ }
  try {
    const stats = await runProspector({ dry, timeBudgetMs: 270_000 })
    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    console.error('manual prospect error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Prospector failed' }, { status: 500 })
  }
}
