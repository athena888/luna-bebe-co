import { NextRequest, NextResponse } from 'next/server'
import {
  findContactByEmail, upsertContact, addTouch, createFlag, quarantineInbound, looksCorporate,
  logOutboundEmail, logInboundTouch, closeOpenOutbound, addSuppression,
} from '@/lib/outreach'
import { classifyEmail } from '@/lib/cockpit-ai'
import { supabaseAdmin } from '@/lib/supabase'

// Inbound + outbound email webhook. Public endpoint (NOT under /api/portal) —
// secured with a shared secret. Point your email provider's inbound/parse
// webhook here, AND BCC your cold-outreach sends to OUTREACH_BCC_ADDRESS so they
// route here too:
//   https://petitelavande.com/api/inbound-email?secret=$INBOUND_EMAIL_SECRET
//
// HUMAN TASK (Emily):
//   • set INBOUND_EMAIL_SECRET, OWNER_EMAILS (comma-separated), OUTREACH_BCC_ADDRESS
//   • configure inbound email in the provider (Resend Inbound / SES → HTTPS)
//   • add OUTREACH_BCC_ADDRESS as a BCC on Apollo / outbound sends
//
// Two flows:
//   1. From matches OWNER_EMAILS  → an email YOU sent  → log as outbound + set follow-up
//   2. Otherwise                  → inbound → classify (Claude), match a contact,
//      close any open outbound thread, or quarantine an unknown sender.

function extractEmail(s: unknown): string {
  if (!s) return ''
  const str = typeof s === 'string' ? s : JSON.stringify(s)
  const m = str.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  return (m?.[0] ?? '').toLowerCase()
}
// All email addresses found in a value (for picking the real recipient out of To).
function extractAllEmails(s: unknown): string[] {
  if (!s) return []
  const str = typeof s === 'string' ? s : JSON.stringify(s)
  return (str.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? []).map(e => e.toLowerCase())
}
function pick(body: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (body[k] != null) return body[k]
  return undefined
}
function ownerEmails(): Set<string> {
  return new Set((process.env.OWNER_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean))
}

export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET
  const provided = req.nextUrl.searchParams.get('secret') || req.headers.get('x-webhook-secret')
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = (await req.json()) as Record<string, unknown> } catch { /* tolerate empty */ }
  const inner = (body.data ?? body.email ?? body) as Record<string, unknown>

  const fromEmail = extractEmail(pick(inner, ['from', 'sender', 'From', 'envelope_from', 'fromEmail']))
  const subject = String(pick(inner, ['subject', 'Subject']) ?? '') || null
  const snippet = String(pick(inner, ['text', 'body', 'snippet', 'stripped-text', 'TextBody', 'plain']) ?? '').slice(0, 4000) || null
  const messageId = extractEmail(pick(inner, ['message_id', 'messageId', 'Message-ID', 'Message-Id'])) || String(pick(inner, ['message_id', 'messageId', 'Message-ID', 'Message-Id']) ?? '') || null
  const inReplyTo = String(pick(inner, ['in_reply_to', 'inReplyTo', 'In-Reply-To', 'references']) ?? '') || null

  if (!fromEmail) return NextResponse.json({ ok: true, skipped: 'no sender' })

  const owners = ownerEmails()
  const bcc = (process.env.OUTREACH_BCC_ADDRESS ?? '').trim().toLowerCase()

  try {
    // ── Flow 1: an email YOU sent (captured via BCC) ─────────────────────────
    if (owners.has(fromEmail)) {
      // The real recipient = first To address that isn't you or the BCC log box.
      const toCandidates = extractAllEmails(pick(inner, ['to', 'To', 'recipient', 'envelope_to', 'toEmail', 'recipients']))
      const recipient = toCandidates.find(e => !owners.has(e) && e !== bcc)
      if (!recipient) return NextResponse.json({ ok: true, skipped: 'no recipient' })

      const contactId = await upsertContact({
        email: recipient,
        status: 'contacted',
        source: 'outreach',
        is_corporate: looksCorporate(recipient) || undefined,
      })
      if (contactId) {
        await logOutboundEmail(contactId, { subject: subject ?? undefined, snippet: snippet ?? undefined, messageId: messageId ?? undefined })
      }
      return NextResponse.json({ ok: true, outbound: true, recipient })
    }

    // ── Opt-out: "STOP" / "unsubscribe" → suppress immediately, never email again.
    const optOut = /\b(stop|unsubscribe|opt[\s-]?out|remove me)\b/i.test(`${subject ?? ''} ${snippet ?? ''}`)
    if (optOut) {
      await addSuppression(fromEmail, 'stop')
      const c = await findContactByEmail(fromEmail)
      if (c) {
        await closeOpenOutbound(c.id)
        await supabaseAdmin.from('contacts').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', c.id)
      }
      return NextResponse.json({ ok: true, suppressed: true })
    }

    // ── Flow 2: inbound — classify, then match or quarantine ─────────────────
    const classification = await classifyEmail({ from: fromEmail, subject: subject ?? '', body: snippet ?? '' }).catch(() => null)
    const contact = await findContactByEmail(fromEmail)

    if (contact) {
      const corporate = looksCorporate(fromEmail)
      // A reply arrived → close any open outbound thread + log the classified touch.
      await closeOpenOutbound(contact.id)
      await logInboundTouch(contact.id, {
        subject: subject ?? undefined, snippet: snippet ?? subject ?? undefined,
        messageId: messageId ?? undefined, inReplyTo: inReplyTo ?? undefined,
        category: classification?.category, intent: classification?.intent,
        sentiment: classification?.sentiment, requiresFollowup: classification?.requires_followup,
        suggestedFollowup: classification?.suggested_followup,
      })
      await supabaseAdmin.from('contacts')
        .update({ status: 'replied', updated_at: new Date().toISOString(), ...(corporate && !contact.is_corporate ? { is_corporate: true } : {}) })
        .eq('id', contact.id)
      // Flag priority is informed by the classifier when present.
      const hot = corporate || classification?.category === 'b2b_reply' || classification?.category === 'partnership_invite'
      await createFlag(contact.id, hot
        ? { priority: 'hot', reason: classification?.summary || 'Reply — respond today' }
        : { priority: 'warm', reason: classification?.summary || 'Reply — respond' })
      return NextResponse.json({ ok: true, matched: true, corporate, category: classification?.category ?? null })
    }

    // Unknown sender → quarantine (likely_corporate if non-freemail).
    await quarantineInbound({ from_email: fromEmail, subject: subject ?? undefined, snippet: snippet ?? undefined })
    return NextResponse.json({ ok: true, matched: false, quarantined: true, category: classification?.category ?? null })
  } catch (e) {
    console.error('inbound-email error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
