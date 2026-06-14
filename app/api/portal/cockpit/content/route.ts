import { NextRequest, NextResponse } from 'next/server'
import { setContentStatus } from '@/lib/cockpit'

export const dynamic = 'force-dynamic'

// Mark a planned post posted/skipped. Body: { id, status, postUrl? }
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, postUrl } = (await req.json()) as { id?: string; status?: string; postUrl?: string }
    if (!id || !['suggested', 'posted', 'skipped'].includes(String(status))) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }
    await setContentStatus(id, status as 'suggested' | 'posted' | 'skipped', postUrl)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('cockpit content PATCH error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
