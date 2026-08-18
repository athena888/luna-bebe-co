import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { handleProspectBounce, extractFailedRecipient } from '@/lib/pipeline/inbound'

// Manual bounce intake (Portal → Morning Review). Nothing routes delivery
// failures into the pipeline yet — INBOUND_EMAIL_SECRET is unset and no
// provider forwards mail to /api/inbound-email — so bounced addresses were
// never suppressed and stayed eligible to be emailed again.
//
// This lets Emily paste the bounce messages sitting in her inbox (either bare
// addresses, one per line, or whole pasted NDR text) and runs them through the
// SAME handleProspectBounce() the webhook would: suppression row + prospect
// status 'bounced' + pending drafts superseded. The sender already refuses
// both, so a pasted address can never be emailed again.
export const dynamic = 'force-dynamic'

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const OURS = /@(petitelavande\.com)$/i
const DAEMON = /^(mailer-daemon|postmaster|no-?reply)@/i

/** Addresses from pasted text: bare list OR full NDR bodies. */
function parseAddresses(raw: string): string[] {
  const out = new Set<string>()
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // A line that is exactly one address — the common "pasted a list" case.
    const solo = trimmed.match(/^<?([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})>?$/i)
    if (solo) { out.add(solo[1].toLowerCase()); continue }
    // Otherwise treat it as NDR prose and take the first non-ours address.
    const viaHelper = extractFailedRecipient(trimmed)
    if (viaHelper && !OURS.test(viaHelper) && !DAEMON.test(viaHelper)) { out.add(viaHelper.toLowerCase()); continue }
    for (const m of trimmed.matchAll(EMAIL_RE)) {
      const e = m[0].toLowerCase()
      if (!OURS.test(e) && !DAEMON.test(e)) out.add(e)
    }
  }
  return [...out]
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Paste the bounced addresses or the bounce emails' }, { status: 400 })
    }
    const addresses = parseAddresses(text)
    if (!addresses.length) {
      return NextResponse.json({ error: 'No email addresses found in that text' }, { status: 400 })
    }

    const suppressed: string[] = []
    const matchedProspect: string[] = []
    const failed: { email: string; error: string }[] = []
    for (const email of addresses) {
      try {
        const matched = await handleProspectBounce(email)
        suppressed.push(email)
        if (matched) matchedProspect.push(email)
      } catch (e) {
        failed.push({ email, error: e instanceof Error ? e.message : String(e) })
      }
    }

    // How many queued sends this just took off the table.
    const { count: stillQueued } = await supabaseAdmin
      .from('sends').select('id', { count: 'exact', head: true }).eq('status', 'queued')

    return NextResponse.json({
      ok: failed.length === 0,
      found: addresses.length,
      suppressed: suppressed.length,
      matchedProspect: matchedProspect.length,
      unmatched: suppressed.filter(e => !matchedProspect.includes(e)),
      failed,
      stillQueued: stillQueued ?? null,
      note: 'Suppressed addresses can never be emailed again — the sender checks suppression and prospect status before every send.',
    })
  } catch (err) {
    console.error('Bounce intake error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
