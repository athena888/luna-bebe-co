import { NextRequest, NextResponse } from 'next/server'
import { processResearchedContact, type LeadIn } from '@/lib/outreach/intake'

// Researched-contact intake over HTTP (Portal-protected) — the direct-POST
// delivery path for the daily cloud research routine. Works only when the
// cloud sandbox's egress policy allows this host; the repo-file path
// (ops/outreach-intake + lib/outreach/intake.ts) is the always-available
// fallback and shares this exact processing core. Unlike repo files, a direct
// POST MAY carry an email (nothing public involved) — it is still verified
// server-side before being stored.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { contacts?: LeadIn[] }
    const contacts = (body.contacts ?? []).slice(0, 60)
    if (!contacts.length) return NextResponse.json({ error: 'contacts[] required' }, { status: 400 })

    const budget = { verifies: 20 }
    const results = []
    for (const c of contacts) results.push(await processResearchedContact(c, budget))

    return NextResponse.json({
      ok: true,
      received: contacts.length,
      qualified: results.filter(r => r.status === 'QUALIFIED').length,
      drafterVisible: results.filter(r => r.drafterVisible).length,
      rejected: results.filter(r => r.status === 'rejected').length,
      parked: results.filter(r => r.status === 'parked').length,
      verifiesLeft: budget.verifies,
      results,
    })
  } catch (e) {
    console.error('contact intake error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Intake failed' }, { status: 500 })
  }
}
