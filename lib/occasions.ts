import { supabaseAdmin } from './supabase'

// Build 3 — occasion dates. A customer (or gift-giver) tells us a due date or
// a baby's birthday; the daily cron schedules one perfectly-timed email per
// occasion: 30 days before a due date, 21 days before each birthday.
//
// Consent model: saving an occasion through the capture form IS the ask —
// the form says we'll send one reminder — so the capture route records
// marketing opt-in. The scheduler still re-checks marketing_contacts.opt_in
// AND email_optouts at send time (via processDueEmails).
//
// Everything is gated behind OCCASIONS_ACTIVE so nothing sends until the
// copy + capture UI are approved.

export const OCCASIONS_ACTIVE = process.env.OCCASIONS_ACTIVE === 'true'

export type OccasionKind = 'due_date' | 'baby_birthday'

const DAY = 24 * 60 * 60 * 1000
const DUE_LEAD_DAYS = 30
const BIRTHDAY_LEAD_DAYS = 21

export async function upsertOccasion(input: {
  email: string
  kind: OccasionKind
  date: string // YYYY-MM-DD
  label?: string | null
  source?: string
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid email' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: 'Invalid date' }
  const d = new Date(input.date + 'T00:00:00Z')
  if (isNaN(d.getTime())) return { ok: false, error: 'Invalid date' }
  const now = Date.now()
  // Due dates sit in the near future; birthdays in the past (or just ahead —
  // an expecting parent sometimes enters the scheduled arrival as a birthday).
  if (input.kind === 'due_date' && (d.getTime() < now - 7 * DAY || d.getTime() > now + 320 * DAY)) {
    return { ok: false, error: 'That due date looks out of range' }
  }
  if (input.kind === 'baby_birthday' && (d.getTime() > now + 320 * DAY || d.getTime() < now - 18 * 365 * DAY)) {
    return { ok: false, error: 'That birthday looks out of range' }
  }

  const { error } = await supabaseAdmin.from('contact_occasions').upsert(
    { email, kind: input.kind, occasion_date: input.date, label: input.label?.trim() || null, source: input.source ?? 'unknown' },
    { onConflict: 'email,kind,occasion_date' }
  )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** Next anniversary of a (possibly past) date, from today forward. */
function nextAnniversary(dateISO: string): Date {
  const [, m, d] = dateISO.split('-').map(Number)
  const today = new Date()
  const thisYear = new Date(Date.UTC(today.getUTCFullYear(), m - 1, d))
  return thisYear.getTime() >= today.getTime() - DAY ? thisYear : new Date(Date.UTC(today.getUTCFullYear() + 1, m - 1, d))
}

/**
 * Daily sweep (called by the daily-flows cron): queue occasion emails whose
 * send moment has arrived or is inside the horizon. Dedupe via the campaign
 * column. Returns how many were newly queued.
 */
export async function scheduleOccasionSends(): Promise<number> {
  if (!OCCASIONS_ACTIVE) return 0

  const { data: occasions } = await supabaseAdmin.from('contact_occasions').select('*')
  if (!occasions?.length) return 0

  // Only opted-in marketing contacts are ever enrolled.
  const emails = [...new Set(occasions.map(o => o.email as string))]
  const { data: optedIn } = await supabaseAdmin
    .from('marketing_contacts').select('email').eq('marketing_opt_in', true).in('email', emails)
  const allowed = new Set((optedIn ?? []).map(c => c.email as string))

  const now = Date.now()
  let queued = 0
  for (const occ of occasions) {
    if (!allowed.has(occ.email)) continue

    let template: string, campaign: string, sendAt: number, eventDate: Date
    if (occ.kind === 'due_date') {
      eventDate = new Date(occ.occasion_date + 'T00:00:00Z')
      if (eventDate.getTime() < now) continue // baby already here — birthday takes over if they saved one
      template = 'occasion-due'
      campaign = `occ:due:${occ.occasion_date}`
      sendAt = eventDate.getTime() - DUE_LEAD_DAYS * DAY
    } else {
      eventDate = nextAnniversary(occ.occasion_date)
      template = 'occasion-birthday'
      campaign = `occ:bday:${eventDate.getUTCFullYear()}:${occ.occasion_date}`
      sendAt = eventDate.getTime() - BIRTHDAY_LEAD_DAYS * DAY
    }
    if (sendAt < now) sendAt = now              // inside the lead window — send on next drain
    if (sendAt > now + 60 * DAY) continue        // outside horizon; a later sweep will queue it

    const { data: existing } = await supabaseAdmin
      .from('email_events').select('id').eq('recipient', occ.email).eq('campaign', campaign).limit(1)
    if (existing?.length) continue

    const { error } = await supabaseAdmin.from('email_events').insert({
      flow: 'occasion', step: 1, recipient: occ.email, template, campaign,
      scheduled_at: new Date(sendAt).toISOString(),
    })
    if (!error) queued++
  }
  return queued
}
