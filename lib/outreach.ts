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

export async function getContacts(filter: 'all' | 'corporate' = 'all'): Promise<Contact[]> {
  let q = supabaseAdmin.from('contacts').select('*').order('updated_at', { ascending: false }).limit(500)
  if (filter === 'corporate') q = q.or('is_corporate.eq.true,source.eq.corporate_form')
  const { data } = await q
  return (data ?? []) as Contact[]
}

// ── Inbound quarantine (unknown senders) ─────────────────────────────────────
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
