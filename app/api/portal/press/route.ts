import { NextRequest, NextResponse } from 'next/server'
import { listPressContacts, updatePressContact, addPressContact } from '@/lib/press-pitch'

export const dynamic = 'force-dynamic'

// Manual press outreach (portal-authed via middleware).
// GET → contacts + weekly cap state + follow-up reminders
// POST { outlet, outlet_tier, language? } → add a contact row
// PATCH { id, ...fields } → edit fields / advance status (dates auto-stamped)

export async function GET() {
  try {
    return NextResponse.json(await listPressContacts())
  } catch (e) {
    console.error('press GET error:', e)
    return NextResponse.json({ error: 'Failed to load press contacts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.outlet?.trim() || !b.outlet_tier) return NextResponse.json({ error: 'outlet + outlet_tier required' }, { status: 400 })
    await addPressContact(b)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('press POST error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Add failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await updatePressContact(b.id, b)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('press PATCH error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Update failed' }, { status: 500 })
  }
}
