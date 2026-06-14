import { supabaseAdmin } from './supabase'

// ── Types ────────────────────────────────────────────────────────────────────
export type Track = 'A' | 'C'
export type ContactStatus = 'new' | 'replied' | 'contacted' | 'closed'
export type FlagPriority = 'hot' | 'warm'

export interface Contact {
  id: string
  email: string
  name: string | null
  company: string | null
  track: Track
  status: ContactStatus
  source: string | null
  is_corporate: boolean
  company_size: string | null
  needs: string | null
  gifts_per_year: string | null
  created_at: string
  updated_at: string
}

export interface Flag {
  id: string
  contact_id: string
  priority: FlagPriority
  reason: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
}

// A needs-attention row = an open flag joined to its contact.
export interface NeedsAttentionItem extends Flag {
  contact: Contact
}

// ── Freemail detection ───────────────────────────────────────────────────────
// Non-freemail sender domain ⇒ likely a company ⇒ corporate.
const FREEMAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com',
  'fastmail.com', 'hey.com', 'pm.me',
])

export function emailDomain(email: string): string {
  return (email.split('@')[1] || '').trim().toLowerCase()
}
export function isFreemail(email: string): boolean {
  const d = emailDomain(email)
  return !d || FREEMAIL.has(d)
}
// A non-freemail, resolvable domain ⇒ treat as corporate.
export function looksCorporate(email: string): boolean {
  const d = emailDomain(email)
  return !!d && d.includes('.') && !FREEMAIL.has(d)
}

// ── Contacts ─────────────────────────────────────────────────────────────────
export interface UpsertContactInput {
  email: string
  name?: string | null
  company?: string | null
  track?: Track
  status?: ContactStatus
  source?: string | null
  is_corporate?: boolean
  company_size?: string | null
  needs?: string | null
  gifts_per_year?: string | null
}

// Upsert a contact by email (dedupe). On conflict we update the provided fields
// (only non-undefined ones) and bump updated_at. Returns the contact id.
export async function upsertContact(input: UpsertContactInput): Promise<string | null> {
  const email = input.email.trim().toLowerCase()
  if (!email) return null

  const { data: existing } = await supabaseAdmin
    .from('contacts').select('id').eq('email', email).maybeSingle()

  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const set = (k: string, v: unknown) => { if (v !== undefined && v !== null && v !== '') fields[k] = v }
  set('name', input.name); set('company', input.company); set('track', input.track)
  set('status', input.status); set('source', input.source); set('company_size', input.company_size)
  set('needs', input.needs); set('gifts_per_year', input.gifts_per_year)
  if (input.is_corporate) fields.is_corporate = true   // only ever upgrade to corporate

  if (existing?.id) {
    await supabaseAdmin.from('contacts').update(fields).eq('id', existing.id)
    return existing.id
  }
  const { data, error } = await supabaseAdmin
    .from('contacts').insert({ email, ...fields }).select('id').maybeSingle()
  if (error) { console.error('upsertContact insert error:', error); return null }
  return data?.id ?? null
}

export async function addTouch(contactId: string, t: { direction: 'inbound' | 'outbound'; channel?: string; snippet?: string }) {
  await supabaseAdmin.from('touches').insert({
    contact_id: contactId,
    direction: t.direction,
    channel: t.channel ?? 'email',
    snippet: (t.snippet ?? '').slice(0, 2000) || null,
  })
}

export async function createFlag(contactId: string, f: { priority: FlagPriority; reason: string }) {
  await supabaseAdmin.from('flags').insert({ contact_id: contactId, priority: f.priority, reason: f.reason })
}

export async function resolveFlag(flagId: string) {
  await supabaseAdmin.from('flags')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', flagId)
}

// ── Reads for the admin "Needs Attention" list ───────────────────────────────
// Open flags, joined to their contact, sorted corporate-first → hot-first → newest.
export async function getNeedsAttention(): Promise<NeedsAttentionItem[]> {
  const { data } = await supabaseAdmin
    .from('flags')
    .select('*, contact:contacts(*)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as unknown as NeedsAttentionItem[]
  const rank = (r: NeedsAttentionItem) =>
    (r.contact?.is_corporate ? 0 : 1) * 10 + (r.priority === 'hot' ? 0 : 1)
  return rows.filter(r => r.contact).sort((a, b) => rank(a) - rank(b))
}

export async function findContactByEmail(email: string): Promise<Contact | null> {
  const { data } = await supabaseAdmin.from('contacts').select('*').eq('email', email.trim().toLowerCase()).maybeSingle()
  return (data as Contact) ?? null
}

export async function getContacts(filter: 'all' | 'corporate' = 'all'): Promise<Contact[]> {
  let q = supabaseAdmin.from('contacts').select('*').order('updated_at', { ascending: false }).limit(500)
  if (filter === 'corporate') q = q.or('is_corporate.eq.true,source.eq.corporate_form')
  const { data } = await q
  return (data ?? []) as Contact[]
}

// ── Inbound quarantine (unknown senders) ─────────────────────────────────────
export interface QuarantineRow {
  id: string
  from_email: string
  from_domain: string | null
  subject: string | null
  snippet: string | null
  likely_corporate: boolean
  status: 'pending' | 'reviewed'
  created_at: string
}

// Pending quarantine, likely-corporate sorted to the top.
export async function getQuarantine(): Promise<QuarantineRow[]> {
  const { data } = await supabaseAdmin
    .from('inbound_quarantine').select('*').eq('status', 'pending')
    .order('likely_corporate', { ascending: false }).order('created_at', { ascending: false }).limit(200)
  return (data ?? []) as QuarantineRow[]
}

export async function reviewQuarantine(id: string) {
  await supabaseAdmin.from('inbound_quarantine').update({ status: 'reviewed' }).eq('id', id)
}

export async function quarantineInbound(input: { from_email: string; subject?: string; snippet?: string }) {
  const from = input.from_email.trim().toLowerCase()
  await supabaseAdmin.from('inbound_quarantine').insert({
    from_email: from,
    from_domain: emailDomain(from) || null,
    subject: input.subject ?? null,
    snippet: (input.snippet ?? '').slice(0, 2000) || null,
    likely_corporate: looksCorporate(from),
  })
}

// ── Outreach ledger (Marketing Cockpit) ──────────────────────────────────────
// The `touches` table is the unified ledger: an outbound touch = a cold email
// you sent (with a follow-up due date); an inbound touch = a classified reply.

export interface OutboundTouchInput {
  subject?: string
  snippet?: string
  messageId?: string
  track?: string
  followupDays?: number   // default 4
}

/** Log a cold email you sent (captured via BCC). Sets follow-up = +N days. */
export async function logOutboundEmail(contactId: string, t: OutboundTouchInput): Promise<void> {
  const days = t.followupDays ?? 4
  await supabaseAdmin.from('touches').insert({
    contact_id: contactId,
    direction: 'outbound',
    channel: 'email',
    subject: t.subject ?? null,
    snippet: (t.snippet ?? '').slice(0, 2000) || null,
    message_id: t.messageId ?? null,
    track: t.track ?? null,
    status: 'sent',
    followup_due: addDaysISO(days),
  })
}

export interface ClassifiedInbound {
  category?: string
  intent?: string
  sentiment?: string
  requiresFollowup?: boolean
  suggestedFollowup?: string | null
}

/** Log a classified inbound reply/email as a touch. */
export async function logInboundTouch(contactId: string, t: { subject?: string; snippet?: string; messageId?: string; inReplyTo?: string } & ClassifiedInbound): Promise<void> {
  await supabaseAdmin.from('touches').insert({
    contact_id: contactId,
    direction: 'inbound',
    channel: 'email',
    subject: t.subject ?? null,
    snippet: (t.snippet ?? '').slice(0, 2000) || null,
    message_id: t.messageId ?? null,
    in_reply_to: t.inReplyTo ?? null,
    category: t.category ?? null,
    intent: t.intent ?? null,
    sentiment: t.sentiment ?? null,
    requires_followup: t.requiresFollowup ?? false,
    followup_due: t.suggestedFollowup ?? null,
  })
}

/** Close the loop on any open outbound thread for a contact (a reply arrived). */
export async function closeOpenOutbound(contactId: string): Promise<void> {
  await supabaseAdmin.from('touches')
    .update({ status: 'replied', followup_due: null })
    .eq('contact_id', contactId).eq('direction', 'outbound').in('status', ['sent', 'followup_due'])
}

export interface FollowupDue {
  id: string
  contact_id: string
  subject: string | null
  snippet: string | null
  followup_due: string
  status: string
  contact: Contact | null
}

/** Open outbound emails whose follow-up date has arrived (or passed). */
export async function getFollowupsDue(): Promise<FollowupDue[]> {
  const today = addDaysISO(0)
  const { data } = await supabaseAdmin
    .from('touches')
    .select('id, contact_id, subject, snippet, followup_due, status, contact:contacts(*)')
    .eq('direction', 'outbound').in('status', ['sent', 'followup_due'])
    .not('followup_due', 'is', null).lte('followup_due', today)
    .order('followup_due', { ascending: true })
  return (data ?? []) as unknown as FollowupDue[]
}

/** Mark a follow-up as sent again (push the due date out) or closed. */
export async function advanceFollowup(touchId: string, action: 'sent' | 'close'): Promise<void> {
  await supabaseAdmin.from('touches').update(
    action === 'close'
      ? { status: 'closed', followup_due: null }
      : { status: 'sent', followup_due: addDaysISO(4) }
  ).eq('id', touchId)
}

export interface TriageItem {
  id: string
  contact_id: string
  subject: string | null
  snippet: string | null
  category: string | null
  intent: string | null
  sentiment: string | null
  created_at: string
  contact: Contact | null
}

// Priority order for the inbox: B2B replies + partnership invites first.
const TRIAGE_RANK: Record<string, number> = {
  b2b_reply: 0, partnership_invite: 1, customer_inquiry: 2,
  vendor_supplier: 3, inbound_pitch: 4, other: 5, spam_newsletter: 6,
}

/** Recent classified inbound, most important first. */
export async function getInboxTriage(limit = 25): Promise<TriageItem[]> {
  const { data } = await supabaseAdmin
    .from('touches')
    .select('id, contact_id, subject, snippet, category, intent, sentiment, created_at, contact:contacts(*)')
    .eq('direction', 'inbound').order('created_at', { ascending: false }).limit(limit)
  const rows = (data ?? []) as unknown as TriageItem[]
  return rows.sort((a, b) => (TRIAGE_RANK[a.category ?? 'other'] ?? 5) - (TRIAGE_RANK[b.category ?? 'other'] ?? 5))
}

function addDaysISO(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Cold-outreach sender support ─────────────────────────────────────────────

/** Add an address to the suppression list (STOP / bounce / manual / complaint). */
export async function addSuppression(email: string, reason: string): Promise<void> {
  await supabaseAdmin.from('suppression')
    .upsert({ email: email.trim().toLowerCase(), reason }, { onConflict: 'email' })
}

/** Emails currently suppressed (lowercased set), for fast filtering. */
export async function getSuppressedSet(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from('suppression').select('email')
  return new Set((data ?? []).map(r => String(r.email).toLowerCase()))
}

export async function isSuppressed(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('suppression').select('email').eq('email', email.trim().toLowerCase()).maybeSingle()
  return Boolean(data)
}

// A contact eligible for a cold send right now: either never emailed, or its
// follow-up has come due — and it has NOT replied/closed.
export interface OutreachCandidate {
  id: string
  email: string
  first_name: string | null
  name: string | null
  company: string | null
  track: Track
  reason: 'new' | 'followup'
}

/**
 * Contacts due for an outreach send. SAFETY: only `outreach_enrolled` contacts
 * are ever eligible — customers and inbound leads are never cold-emailed.
 *  • "new"      — enrolled, no outbound touch yet
 *  • "followup" — has an open outbound touch whose followup_due has arrived
 */
export async function getContactsDueForOutreach(limit = 100): Promise<OutreachCandidate[]> {
  const today = addDaysISO(0)
  const { data: enrolled } = await supabaseAdmin
    .from('contacts')
    .select('id, email, first_name, name, company, track, status')
    .eq('outreach_enrolled', true)
    .not('status', 'in', '("closed")')
    .limit(500)
  const contacts = (enrolled ?? []) as (Contact & { first_name: string | null })[]
  if (!contacts.length) return []

  // One query for every outbound touch belonging to these contacts.
  const ids = contacts.map(c => c.id)
  const { data: touchRows } = await supabaseAdmin
    .from('touches')
    .select('contact_id, direction, status, followup_due')
    .in('contact_id', ids).eq('direction', 'outbound')
  const outbound = new Map<string, { status: string | null; followup_due: string | null }[]>()
  for (const t of (touchRows ?? []) as { contact_id: string; status: string | null; followup_due: string | null }[]) {
    const arr = outbound.get(t.contact_id) ?? []
    arr.push({ status: t.status, followup_due: t.followup_due })
    outbound.set(t.contact_id, arr)
  }

  const out: OutreachCandidate[] = []
  for (const c of contacts) {
    const touches = outbound.get(c.id) ?? []
    const base = { id: c.id, email: c.email, first_name: c.first_name, name: c.name, company: c.company, track: c.track }
    if (touches.length === 0) {
      out.push({ ...base, reason: 'new' })
    } else {
      // Any replied/closed thread means we leave them alone.
      const open = touches.filter(t => t.status === 'sent' || t.status === 'followup_due')
      const replied = touches.some(t => t.status === 'replied' || t.status === 'closed')
      const due = open.some(t => t.followup_due != null && t.followup_due <= today)
      if (!replied && due) out.push({ ...base, reason: 'followup' })
    }
    if (out.length >= limit) break
  }
  return out
}
