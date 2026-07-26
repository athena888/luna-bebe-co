import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByIp } from '@/lib/rate-limit'
import { verifyGiftNoteToken } from '@/lib/gift-note'

// Gift recipient opts in from the note page — the only path that ever turns
// a recipient into a marketing contact (source: gift_recipient).
export async function POST(req: NextRequest) {
  try {
    if (!await rateLimitByIp(req, 'gift_optin', 5, 3600)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { token, email } = await req.json() as { token?: string; email?: string }
    if (!token || !verifyGiftNoteToken(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 })
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const { upsertContact } = await import('@/lib/contacts')
    await upsertContact({ email, source: 'gift_recipient', marketingOptIn: true })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('gift optin error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
