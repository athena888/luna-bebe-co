import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'

// Build 7 — explicit segment capture ("Who are you shopping for?" chips after
// newsletter signup; UI ships once the mock is approved). Segment upgrades
// from 'unknown' only, so a later tap never clobbers a better answer.
const SEGMENTS = new Set(['parent_to_be', 'grandparent', 'friend_coworker'])

export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'segment', 10, 3600)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { email, segment } = await req.json() as { email?: string; segment?: string }
    if (!email || !segment || !SEGMENTS.has(segment)) {
      return NextResponse.json({ error: 'email and a valid segment are required' }, { status: 400 })
    }
    const { upsertContact } = await import('@/lib/contacts')
    await upsertContact({ email, segment: segment as 'parent_to_be' | 'grandparent' | 'friend_coworker', source: 'segment_chips' })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Segment capture error:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
