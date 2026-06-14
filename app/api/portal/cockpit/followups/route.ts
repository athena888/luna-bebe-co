import { NextRequest, NextResponse } from 'next/server'
import { advanceFollowup } from '@/lib/outreach'

export const dynamic = 'force-dynamic'

// Advance a follow-up. Body: { id, action: 'sent'|'close' }
export async function PATCH(req: NextRequest) {
  try {
    const { id, action } = (await req.json()) as { id?: string; action?: string }
    if (!id || !['sent', 'close'].includes(String(action))) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }
    await advanceFollowup(id, action as 'sent' | 'close')
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('cockpit followups PATCH error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
