import { NextResponse } from 'next/server'
import { getTiers, getCorporateFields, draftLookbookCopy } from '@/lib/lookbook/copy'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// AI copy assist (portal-authed). Draft-only — the builder shows every field in
// an editable input, and publish runs the banned-phrase gate server-side.

export async function POST() {
  try {
    const [tiers, corporate] = await Promise.all([getTiers(), getCorporateFields()])
    const copy = await draftLookbookCopy(tiers, corporate)
    return NextResponse.json({ ok: true, copy })
  } catch (e) {
    console.error('copy-assist error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Copy assist failed' }, { status: 500 })
  }
}
