import { NextRequest, NextResponse } from 'next/server'
import {
  findContactByEmail, addTouch, createFlag, quarantineInbound, looksCorporate,
} from '@/lib/outreach'
import { supabaseAdmin } from '@/lib/supabase'

// Inbound-email webhook. Public endpoint (NOT under /api/portal, so middleware
// doesn't guard it) — secured with a shared secret. Point your email provider's
// inbound/parse webhook here:
//   https://petitelavande.com/api/inbound-email?secret=$INBOUND_EMAIL_SECRET
//
// HUMAN TASK (Emily): set env INBOUND_EMAIL_SECRET, and configure inbound email
// in the provider (Resend Inbound / SES receipt rule → SNS/HTTPS) to POST here.
//
// Accepts a flexible JSON body — extracts the sender address, subject, and text
// from common provider shapes (Resend/SES/SendGrid/generic).

function extractEmail(s: unknown): string {
  if (!s) return ''
  const str = typeof s === 'string' ? s : JSON.stringify(s)
  const m = str.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return (m?.[0] ?? '').toLowerCase()
}

function pick(body: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (body[k] != null) return body[k]
  return undefined
}

export async function POST(req: NextRequest) {
  // Auth: shared secret via query or header. Reject if not configured.
  const secret = process.env.INBOUND_EMAIL_SECRET
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = (await req.json()) as Record<string, unknown> } catch { /* tolerate empty */ }
  // Some providers nest the email under data/email.
  const inner = (body.data ?? body.email ?? body) as Record<string, unknown>

  const fromEmail = extractEmail(pick(inner, ['from', 'sender', 'From', 'envelope_from', 'fromEmail']))
  const subject = String(pick(inner, ['subject', 'Subject']) ?? '') || null
  const snippet = String(pick(inner, ['text', 'body', 'snippet', 'stripped-text', 'TextBody', 'plain']) ?? '').slice(0, 2000) || null

  if (!fromEmail) {
    return NextResponse.json({ ok: true, skipped: 'no sender' })
  }

  try {
    const contact = await findContactByEmail(fromEmail)

    if (contact) {
      await addTouch(contact.id, { direction: 'inbound', channel: 'email', snippet: snippet ?? subject ?? 'Inbound email' })
      const corporate = looksCorporate(fromEmail)
      // Non-freemail sender ⇒ corporate: tag the contact and upgrade the flag.
      if (corporate && !contact.is_corporate) {
        await supabaseAdmin.from('contacts').update({ is_corporate: true, status: 'replied', updated_at: new Date().toISOString() }).eq('id', contact.id)
      } else {
        await supabaseAdmin.from('contacts').update({ status: 'replied', updated_at: new Date().toISOString() }).eq('id', contact.id)
      }
      await createFlag(contact.id, corporate
        ? { priority: 'hot', reason: 'Corporate reply — respond today' }
        : { priority: 'warm', reason: 'Reply — respond' })
      return NextResponse.json({ ok: true, matched: true, corporate })
    }

    // Unknown sender → quarantine for review (likely_corporate if non-freemail).
    await quarantineInbound({ from_email: fromEmail, subject: subject ?? undefined, snippet: snippet ?? undefined })
    return NextResponse.json({ ok: true, matched: false, quarantined: true })
  } catch (e) {
    console.error('inbound-email error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
