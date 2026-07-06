import { NextRequest, NextResponse } from 'next/server'
import { runProspector } from '@/lib/pipeline/prospector'
import { runPressProspector } from '@/lib/pipeline/press-prospector'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Manual prospector trigger for testing (portal-authed via middleware).
// POST { dry?: boolean, channel?: 'corporate' | 'press' | 'both' }

type Channel = 'corporate' | 'press' | 'both'

export async function POST(req: NextRequest) {
  let dry = false
  let channel: Channel = 'both'
  try {
    const b = (await req.json()) as { dry?: boolean; channel?: Channel }
    dry = Boolean(b.dry)
    if (b.channel) channel = b.channel
  } catch { /* no body */ }
  try {
    const started = Date.now()
    const stats = channel !== 'press' ? await runProspector({ dry, timeBudgetMs: channel === 'both' ? 160_000 : 270_000 }) : null
    const press = channel !== 'corporate'
      ? await runPressProspector({ dry, startedAt: started, timeBudgetMs: 260_000 }).catch(e => { console.error('press prospector failed:', e); return null })
      : null
    return NextResponse.json({ ok: true, ...(stats ?? {}), press })
  } catch (e) {
    console.error('manual prospect error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Prospector failed' }, { status: 500 })
  }
}
