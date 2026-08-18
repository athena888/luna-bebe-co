import { supabaseAdmin } from './supabase.ts'
import { anthropic } from './anthropic.ts'
import { isSuppressed } from './outreach.ts'
import { draftEmail } from './gmail.ts'

// Manual press & gift-guide outreach (separate from the automated B2B
// pipeline). Personalized pitches are generated ONE Anthropic call per contact
// and written to Gmail DRAFTS — nothing in this module can send an email.
// Hard cap: 10 new pitches drafted per rolling 7 days.

export const WEEKLY_CAP = 10

export interface PressContact {
  id: string
  outlet: string
  contact_name: string | null
  email: string | null
  role: string | null
  outlet_tier: string
  recent_article_title: string | null
  recent_article_url: string | null
  why_relevant_note: string | null
  language: 'en' | 'es'
  status: string
  sample_sent: boolean
  drafted_at: string | null
  sent_at: string | null
  bumped_at: string | null
  replied_at: string | null
  declined_at: string | null
  published_at: string | null
  published_url: string | null
  gmail_draft_id: string | null
  draft_subject_a: string | null
  draft_subject_b: string | null
  draft_body: string | null
  notes: string | null
  created_at: string
  suppressed?: boolean
}

const DAY = 24 * 60 * 60 * 1000

/** Rows + computed pipeline state. Applies the lazy status automation:
 *  bumped + 10 days without reply → declined (stamped, noted). */
export async function listPressContacts(): Promise<{
  contacts: PressContact[]
  weeklyDrafted: number
  cap: number
  reminders: Array<{ id: string; label: string }>
}> {
  // Lazy auto-decline — no cron (Hobby cron budget stays untouched).
  await supabaseAdmin
    .from('press_contacts')
    .update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      notes: 'auto: no reply 10 days after bump',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'bumped')
    .lt('bumped_at', new Date(Date.now() - 10 * DAY).toISOString())

  const { data } = await supabaseAdmin
    .from('press_contacts')
    .select('*')
    .order('outlet_tier')
    .order('outlet')
  const contacts = ((data ?? []) as PressContact[])

  // Suppression badges (read-only reuse of the shared list).
  for (const c of contacts) {
    c.suppressed = c.email ? await isSuppressed(c.email) : false
  }

  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString()
  const weeklyDrafted = contacts.filter(c => c.drafted_at && c.drafted_at >= weekAgo).length

  // Follow-up reminders: sent 6+ days ago, not yet bumped. Surfaced in the
  // portal only — never an automatic email.
  const sixDaysAgo = new Date(Date.now() - 6 * DAY).toISOString()
  const reminders = contacts
    .filter(c => c.status === 'sent' && c.sent_at && c.sent_at <= sixDaysAgo)
    .map(c => ({ id: c.id, label: `Bump ${c.contact_name || 'contact'} at ${c.outlet} (sent ${Math.floor((Date.now() - new Date(c.sent_at!).getTime()) / DAY)} days ago)` }))

  return { contacts, weeklyDrafted, cap: WEEKLY_CAP, reminders }
}

const PITCH_SYSTEM = `You write PRESS PITCHES for Petite Lavande, a French-countryside-inspired newborn & postpartum gift box brand. You write to a specific journalist about their specific work — never a mail-merge blast.

BRAND FACTS (the only claims you may make):
- French-countryside-inspired newborn & postpartum gift boxes
- Organic cotton garments; hand-knit blankets
- Own-designed crochet dolls — designed in-house, not sourced stock
- Every box includes gifts for the mother, not just the baby
- Hand-packed in woven seagrass baskets
- Price range $65–165
- Site: https://petitelavande.com

HARD RULES:
- OPEN with a specific, natural reference to the journalist's recent article (title/context provided below). Never invent facts about them or their work beyond what is provided.
- ~140 words for the email body. Warm, specific, zero hype words ("revolutionary", "game-changing"), no urgency.
- The offer: a sample box for consideration, hi-res images, and the lookbook (https://petitelavande.com/corporate/lookbook.pdf) — "no obligation either way."
- Mention the press kit only if natural: https://petitelavande.com/press
- Sign off exactly:
  Emily Liu, Founder — petitelavande.com
- If LANGUAGE is "es": write natural, warm US-Spanish (not a literal translation). No gendered greetings; "baby shower" stays in English; "canastilla" for gift box.
- Never use "GOTS certified" about the brand or boxes. Cotton claims only as "organic cotton".

Respond with ONLY JSON:
{"subject_a": "...", "subject_b": "...", "body": "..."}
Two genuinely different subject lines (one article-angle, one brand-angle), each ≤ 55 characters, no emoji.`

export interface GenerateResult { id: string; outlet: string; ok: boolean; why?: string }

/** Generate personalized pitch drafts into Gmail Drafts for the given contact
 *  ids. Skips (with reasons) anything not ready; enforces the weekly cap. */
export async function generatePitchDrafts(ids: string[]): Promise<GenerateResult[]> {
  const results: GenerateResult[] = []
  const { data } = await supabaseAdmin.from('press_contacts').select('*').in('id', ids)
  const rows = ((data ?? []) as PressContact[])

  const weekAgo = new Date(Date.now() - 7 * DAY).toISOString()
  const { count } = await supabaseAdmin
    .from('press_contacts')
    .select('id', { count: 'exact', head: true })
    .gte('drafted_at', weekAgo)
  let usedThisWeek = count ?? 0

  for (const c of rows) {
    const fail = (why: string) => { results.push({ id: c.id, outlet: c.outlet, ok: false, why }) }
    if (c.status !== 'new') { fail(`status is ${c.status}, not new`); continue }
    if (!c.email?.trim()) { fail('no email on file'); continue }
    if (!c.contact_name?.trim()) { fail('no contact name'); continue }
    if (!c.recent_article_title?.trim() || !c.recent_article_url?.trim()) { fail('recent article title + url required'); continue }
    if (!c.why_relevant_note?.trim()) { fail('why-relevant note required'); continue }
    if (await isSuppressed(c.email)) { fail('email is on the suppression list'); continue }
    if (usedThisWeek >= WEEKLY_CAP) { fail(`weekly cap reached (${WEEKLY_CAP}/week)`); continue }

    try {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: PITCH_SYSTEM,
        messages: [{
          role: 'user',
          content: `JOURNALIST: ${c.contact_name} — ${c.role || 'editor'} at ${c.outlet} (${c.outlet_tier})
LANGUAGE: ${c.language}
THEIR RECENT ARTICLE: "${c.recent_article_title}" — ${c.recent_article_url}
WHY THEY'RE RELEVANT (from Emily): ${c.why_relevant_note}

Write the pitch.`,
        }],
      })
      const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
      const m = text.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('model returned no JSON')
      const parsed = JSON.parse(m[0]) as { subject_a?: string; subject_b?: string; body?: string }
      if (!parsed.subject_a || !parsed.body) throw new Error('missing subject/body in model output')

      // Gmail DRAFT with subject A; both variants stored on the row so Emily
      // can swap the subject in Gmail before sending if she prefers B.
      const draft = await draftEmail({ to: c.email, subject: parsed.subject_a, text: parsed.body })

      await supabaseAdmin.from('press_contacts').update({
        status: 'drafted',
        drafted_at: new Date().toISOString(),
        gmail_draft_id: draft.draftId,
        draft_subject_a: parsed.subject_a,
        draft_subject_b: parsed.subject_b ?? null,
        draft_body: parsed.body,
        updated_at: new Date().toISOString(),
      }).eq('id', c.id)
      usedThisWeek++
      results.push({ id: c.id, outlet: c.outlet, ok: true })
    } catch (e) {
      fail(e instanceof Error ? e.message : 'generation failed')
    }
  }
  return results
}

/** Status transitions with their date stamps. One bump max is enforced by the
 *  UI offering "Mark bumped" only from sent; the check here backs it up. */
export async function updatePressContact(id: string, patch: Partial<PressContact>): Promise<void> {
  const allowedFields = [
    'outlet', 'contact_name', 'email', 'role', 'outlet_tier',
    'recent_article_title', 'recent_article_url', 'why_relevant_note',
    'language', 'sample_sent', 'notes', 'published_url',
  ] as const
  const row: Record<string, unknown> = {}
  for (const k of allowedFields) if (patch[k] !== undefined) row[k] = patch[k]

  if (patch.status) {
    const stamp: Record<string, string> = {
      sent: 'sent_at', bumped: 'bumped_at', replied: 'replied_at',
      declined: 'declined_at', published: 'published_at',
    }
    if (patch.status === 'bumped') {
      const { data } = await supabaseAdmin.from('press_contacts').select('bumped_at').eq('id', id).maybeSingle()
      if (data?.bumped_at) throw new Error('Already bumped once — one bump max per contact')
    }
    row.status = patch.status
    const col = stamp[patch.status]
    if (col) row[col] = new Date().toISOString()
  }
  if (!Object.keys(row).length) return
  row.updated_at = new Date().toISOString()
  const { error } = await supabaseAdmin.from('press_contacts').update(row).eq('id', id)
  if (error) throw error
}

export async function addPressContact(input: { outlet: string; outlet_tier: string; language?: 'en' | 'es' }): Promise<void> {
  const { error } = await supabaseAdmin.from('press_contacts').insert({
    outlet: input.outlet.trim(),
    outlet_tier: input.outlet_tier,
    language: input.language ?? 'en',
  })
  if (error) throw error
}
