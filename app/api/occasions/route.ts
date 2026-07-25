import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { upsertOccasion, type OccasionKind } from '@/lib/occasions'

// Build 3 — occasion capture endpoint. The form promises a single well-timed
// reminder, so submitting it doubles as marketing opt-in for that address.
// UI ships separately once the capture-card mock is approved.
export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'occasions', 10, 3600)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const { email, kind, date, label } = await req.json() as {
      email?: string; kind?: OccasionKind; date?: string; label?: string
    }
    if (!email || !kind || !date || !['due_date', 'baby_birthday'].includes(kind)) {
      return NextResponse.json({ error: 'email, kind and date are required' }, { status: 400 })
    }

    const res = await upsertOccasion({ email, kind, date, label, source: 'occasion_form' })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })

    // The form's promise ("we'll remind you") is the opt-in.
    try {
      const { upsertContact } = await import('@/lib/contacts')
      await upsertContact({ email, source: 'occasion_form', marketingOptIn: true })
    } catch (e) {
      console.warn('occasion contact capture skipped:', e)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Occasion capture error:', e)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
