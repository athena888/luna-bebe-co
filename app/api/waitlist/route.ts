import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { joinWaitlist } from '@/lib/waitlist'

// Build 12 — waitlist capture ("email me when it's back"). Joining is the
// opt-in: the form promises a restock email. UI ships after mock approval.
export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'waitlist', 10, 3600)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { email, productId, segment } = await req.json() as { email?: string; productId?: string; segment?: string }
    if (!email || !productId) return NextResponse.json({ error: 'email and productId required' }, { status: 400 })
    const res = await joinWaitlist({ email, productId, segment })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('waitlist error:', e)
    return NextResponse.json({ error: 'Failed to join' }, { status: 500 })
  }
}
