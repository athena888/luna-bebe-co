import { NextRequest, NextResponse } from 'next/server'
import { getNeedsAttention, getContacts, resolveFlag } from '@/lib/outreach'

// Admin-guarded by middleware (/api/portal/*). Powers the Outreach screen.
export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get('tab') ?? 'needs'
  try {
    if (tab === 'corporate') return NextResponse.json({ contacts: await getContacts('corporate') })
    if (tab === 'all')       return NextResponse.json({ contacts: await getContacts('all') })
    return NextResponse.json({ needs: await getNeedsAttention() })
  } catch (e) {
    console.error('outreach GET error:', e)
    return NextResponse.json({ needs: [], contacts: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, flagId } = await req.json()
    if (action === 'resolve' && flagId) {
      await resolveFlag(flagId)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
