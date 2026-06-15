import { resolveMx } from 'node:dns/promises'
import { getContactsDueForOutreach, getSuppressedSet, emailDomain, type OutreachCandidate } from './outreach'
import { templateForTrack, templateByKey, renderTemplate, withFooter, type OutreachTemplate } from './outreach-templates'
import { getOutreachTemplates } from './outreach-templates-db'
import { mintOutreachCode } from './outreach-discount'

// Fresh regex per use — a shared /g regex keeps lastIndex state across .test()
// calls, which silently skips replacement on later emails after any throw.
const hasCodeToken = (s: string) => /\{\{\s*code\s*\}\}/.test(s)
const fillCode = (s: string, code: string) => s.replace(/\{\{\s*code\s*\}\}/g, code)

/**
 * Finalize a planned body for a real send: if it has a {{code}} token, mint a
 * unique single-use discount code and substitute it. Returns null if minting
 * fails (caller should skip — never send a literal {{code}}).
 */
export async function injectCode(body: string): Promise<string | null> {
  if (!hasCodeToken(body)) return body
  try {
    const code = await mintOutreachCode()
    return fillCode(body, code)
  } catch (e) {
    console.error('outreach code mint failed:', e)
    return null
  }
}

// Shared planner used by BOTH the cron sender and the portal dry-run preview, so
// what you preview is exactly what would send. Pure planning — no email is sent
// here. Applies suppression, MX bounce guard, and strict merge-field rendering.

export interface PlannedSend {
  contactId: string
  to: string
  subject: string
  body: string          // fully rendered, with CAN-SPAM footer
  reason: OutreachCandidate['reason']
  track: OutreachCandidate['track']
}
export interface SkippedSend { to: string; why: string }
export interface OutreachPlan { planned: PlannedSend[]; skipped: SkippedSend[]; eligible: number }

async function hasMx(domain: string): Promise<boolean> {
  try { return (await resolveMx(domain)).length > 0 } catch { return false }
}

function firstName(c: OutreachCandidate): string {
  return (c.first_name?.trim() || (c.name?.trim().split(/\s+/)[0] ?? '')).trim()
}

/**
 * Build the list of who would be emailed (up to `cap`), with skip reasons.
 * Optional `trackFilter` narrows to one track; `templateKey` forces one template
 * for the whole list (used by scheduled campaigns). Defaults match the daily cron.
 */
export async function planOutreach(
  cap: number,
  opts: { trackFilter?: string | null; templateKey?: string | null; sampleCode?: boolean } = {},
): Promise<OutreachPlan> {
  const [candidates, suppressed, templates] = await Promise.all([
    getContactsDueForOutreach(cap * 3, opts.trackFilter),
    getSuppressedSet(),
    getOutreachTemplates(),
  ])
  const forced = opts.templateKey ? templateByKey(opts.templateKey, templates) : null

  const planned: PlannedSend[] = []
  const skipped: SkippedSend[] = []

  for (const c of candidates) {
    if (planned.length >= cap) break
    const email = c.email.trim().toLowerCase()

    if (suppressed.has(email)) { skipped.push({ to: email, why: 'suppressed' }); continue }

    const domain = emailDomain(email)
    if (!domain || !(await hasMx(domain))) { skipped.push({ to: email, why: 'no MX record (would bounce)' }); continue }

    // A hand-edited email for this contact wins; otherwise the (forced or
    // track-matched) template. Merge fields + {{code}} still resolve either way.
    const baseTpl = forced ?? templateForTrack(c.track, templates)
    const ov = c.email_override
    const tpl: OutreachTemplate = ov?.body
      ? { key: 'custom', track: c.track, subject: ov.subject?.trim() || baseTpl.subject, body: ov.body }
      : baseTpl
    const rendered = renderTemplate(tpl, { first_name: firstName(c), company: c.company })
    if (!rendered.ok) { skipped.push({ to: email, why: `unresolved merge field: ${rendered.missing.join(', ')}` }); continue }

    // For previews, show a representative code instead of the raw {{code}} token
    // (no real Stripe code is minted until an actual send).
    let body = withFooter(rendered.result.body)
    if (opts.sampleCode) body = fillCode(body, 'PL30-SAMPLE')

    planned.push({
      contactId: c.id,
      to: email,
      subject: rendered.result.subject,
      body,
      reason: c.reason,
      track: c.track,
    })
  }

  return { planned, skipped, eligible: candidates.length }
}
