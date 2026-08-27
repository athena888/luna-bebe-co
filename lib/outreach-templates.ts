// Cold-outreach templates + a STRICT merge-field renderer. Plain text only.
// Rendering FAILS (returns null) if any {{field}} is left unresolved, so we never
// send "Hi {{first_name}}". Every send appends a CAN-SPAM footer (postal address
// + opt-out) built from BUSINESS_ADDRESS.
import { unsubscribeUrl } from './unsubscribe.ts'

export type OutreachTrack = 'A' | 'C'

export interface OutreachTemplate {
  key: string
  track: OutreachTrack
  subject: string
  body: string   // may contain {{first_name}} and {{company}}
}

// Track A = general/independent; Track C = corporate gifting. Edit copy here.
export const TEMPLATES: OutreachTemplate[] = [
  {
    key: 'general-intro',
    track: 'A',
    subject: "a thoughtful gift for your clients' biggest moments",
    body: `Hi {{first_name}},

I'm Emily, founder of Petite Lavande — we make organic newborn & postpartum gift boxes, finished by hand here in Seattle. Many attorneys and advisors send something when a client welcomes a new baby, and ours tend to be the kind people keep (and remember who it came from).

If {{company}} ever marks those moments for clients, here's a code that's yours alone — {{code}} — for 30% off your first box, so you can see the quality for yourself.

Open to it? I'm glad to send a few photos and details.

Warmly,
Petite Lavande`,
  },
  {
    key: 'corporate-intro',
    track: 'C',
    subject: 'corporate new-parent gifting, done beautifully',
    body: `Hi {{first_name}},

I'm Emily, founder of Petite Lavande — organic newborn & postpartum gift boxes, assembled and finished by hand. We help companies make their new-parent and client gifting feel personal instead of generic.

If {{company}} sends gifts for new parents, baby showers, or VIP clients, here's a code that's yours alone — {{code}} — for 30% off your first order. Flexible quantities, your card, fully handled.

Could I send a quick overview?

Warmly,
Petite Lavande`,
  },
]

export function templateForTrack(track: string | null | undefined, list: OutreachTemplate[] = TEMPLATES): OutreachTemplate {
  return list.find(t => t.track === (track === 'C' ? 'C' : 'A')) ?? list[0]
}

export function templateByKey(key: string | null | undefined, list: OutreachTemplate[] = TEMPLATES): OutreachTemplate | null {
  return list.find(t => t.key === key) ?? null
}

export interface MergeFields { first_name?: string | null; company?: string | null }

export interface RenderResult { subject: string; body: string }

// Returns null + the missing field names if any merge field is unresolved.
export function renderTemplate(tpl: OutreachTemplate, fields: MergeFields): { ok: true; result: RenderResult } | { ok: false; missing: string[] } {
  const values: Record<string, string> = {
    first_name: (fields.first_name ?? '').trim(),
    company: (fields.company ?? '').trim(),
  }
  const missing = new Set<string>()
  const sub = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => {
    // {{code}} is a unique discount code minted later (per recipient, at send
    // time). Leave it untouched here — it must NOT count as a missing field.
    if (k === 'code') return m
    const v = values[k]
    if (!v) { missing.add(k); return `{{${k}}}` }
    return v
  })
  const subject = sub(tpl.subject)
  const body = sub(tpl.body)
  if (missing.size) return { ok: false, missing: [...missing] }
  return { ok: true, result: { subject, body } }
}

// CAN-SPAM footer: a contact email, a physical postal address (legally required
// for commercial email — use a PO Box in BUSINESS_ADDRESS to keep a home address
// private), and a clear opt-out. Appended to every send. When the recipient is
// known, a signed one-click unsubscribe link is included (k=o routes it to the
// outreach suppression list, not just the customer-flow opt-outs).
export function withFooter(body: string, recipientEmail?: string): string {
  const address = (process.env.BUSINESS_ADDRESS || 'Petite Lavande LLC').replace(/[\r\n]+/g, ', ')
  const unsub = recipientEmail
    ? `Unsubscribe: ${unsubscribeUrl(recipientEmail)}&k=o\nOr reply STOP and we won't email you again.`
    : `Reply STOP to opt out and we won't email you again.`
  return `${body}\n\n—\nhello@petitelavande.com\n${address}\n${unsub}`
}
