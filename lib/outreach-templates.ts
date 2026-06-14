// Cold-outreach templates + a STRICT merge-field renderer. Plain text only.
// Rendering FAILS (returns null) if any {{field}} is left unresolved, so we never
// send "Hi {{first_name}}". Every send appends a CAN-SPAM footer (postal address
// + opt-out) built from BUSINESS_ADDRESS.

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
    subject: 'a gentler kind of baby gift, from Petite Lavande',
    body: `Hi {{first_name}},

I'm reaching out from Petite Lavande — we make organic newborn and postpartum gift boxes, finished by hand and traced to their source. Most baby gifts forget the mother; ours begin with her.

If {{company}} ever sends gifts for new parents — clients, members, or your own team — I'd love to show you what we put together. No rush, and happy to send a sample.

Warmly,
Emily`,
  },
  {
    key: 'corporate-intro',
    track: 'C',
    subject: 'corporate new-parent gifting, done properly',
    body: `Hi {{first_name}},

I'm Emily, founder of Petite Lavande — organic newborn + postpartum gift boxes, assembled and finished by hand. We work with companies who want their new-parent and client gifting to feel personal rather than transactional.

If {{company}} sends gifts for new parents, baby showers, or VIP clients, I'd love to put a small proposal together — flexible quantities, your card, fully handled.

Could I send you a sample box?

Warmly,
Emily`,
  },
]

export function templateForTrack(track: string | null | undefined): OutreachTemplate {
  return TEMPLATES.find(t => t.track === (track === 'C' ? 'C' : 'A')) ?? TEMPLATES[0]
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
  const sub = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = values[k]
    if (!v) { missing.add(k); return `{{${k}}}` }
    return v
  })
  const subject = sub(tpl.subject)
  const body = sub(tpl.body)
  if (missing.size) return { ok: false, missing: [...missing] }
  return { ok: true, result: { subject, body } }
}

// CAN-SPAM footer: physical address + a clear opt-out. Appended to every send.
export function withFooter(body: string): string {
  const address = (process.env.BUSINESS_ADDRESS || 'Petite Lavande LLC').replace(/[\r\n]+/g, ', ')
  return `${body}\n\n—\n${address}\nReply STOP to opt out and we won't email you again.`
}
