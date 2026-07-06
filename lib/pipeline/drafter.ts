import { anthropic } from '../anthropic'
import { supabaseAdmin } from '../supabase'
import { getLookbookToggle, bumpDailyStats } from './config'
import { getCurrentLookbook } from '../lookbook/current'

// Stage 2 — drafter. For each discovered A/B prospect, assemble the email from
// its category template. The ONLY AI-written text is the {{opening}} sentence
// (personalized from fit_reason, degrading to the template's generic opening
// when data is thin) — the template body is fixed, so <120 words / one link /
// no invented claims are structural, then re-checked in code anyway.
// Follow-ups: any pipeline send 6+ days old with no reply gets a follow-up
// draft (universal template) into the same review queue. Everything lands as
// 'pending_review' — nothing sends without Emily's click.

const MODEL = 'claude-sonnet-4-6'
const FOLLOWUP_AFTER_DAYS = 6
const CORPORATE_LINK = 'petitelavande.com/corporate'

export interface PipelineTemplate {
  key: string
  category: string
  subject: string
  body: string
  generic_opening: string | null
}

export async function getPipelineTemplates(): Promise<PipelineTemplate[]> {
  const { data } = await supabaseAdmin.from('pipeline_templates').select('*')
  return (data ?? []) as PipelineTemplate[]
}

export function templateForCategory(category: string | null, list: PipelineTemplate[]): PipelineTemplate | null {
  return list.find(t => t.category === category) ?? list.find(t => t.key === 'A') ?? null
}

// Strict local render: every {{field}} must resolve (mirrors lib/outreach-templates).
export function renderPipelineTemplate(
  tpl: { subject: string; body: string },
  fields: Record<string, string>,
): { ok: true; subject: string; body: string } | { ok: false; missing: string[] } {
  const missing = new Set<string>()
  const sub = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => {
    const v = (fields[k] ?? '').trim()
    if (!v) { missing.add(k); return `{{${k}}}` }
    return v
  })
  const subject = sub(tpl.subject)
  const body = sub(tpl.body)
  if (missing.size) return { ok: false, missing: [...missing] }
  return { ok: true, subject, body }
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length
const linkCount = (s: string) => (s.match(/(?:https?:\/\/|www\.|petitelavande\.com)/gi) ?? []).length

/** AI writes ONE opening sentence from the fit reason — or 'GENERIC' when thin. */
async function draftOpening(p: { company: string; fit_reason: string | null; category: string | null }): Promise<string | null> {
  const fit = (p.fit_reason ?? '').trim()
  if (fit.length < 15) return null
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: `You write the single opening sentence of a warm, quiet cold email from Emily, founder of Petite Lavande (organic newborn & postpartum gift boxes). You are given one verified fact ("fit reason") about the recipient's company.

Rules:
- ONE sentence, under 25 words, plain text, no greeting, no exclamation marks, no flattery words like "impressive"/"amazing".
- Reference ONLY the given fact. Do not add, embellish, or infer anything beyond it. No claims about Petite Lavande.
- If the fact is too generic to reference naturally, reply with exactly: GENERIC`,
      messages: [{ role: 'user', content: `Company: ${p.company}\nFact: ${fit}` }],
    })
    const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join(' ').trim()
    if (!text || /^GENERIC$/i.test(text) || wordCount(text) > 28 || linkCount(text) > 0) return null
    return text.replace(/[\r\n]+/g, ' ')
  } catch (e) {
    console.error('drafter opening failed:', e)
    return null   // degrade to the template's generic opening
  }
}

export interface DrafterStats { drafted: number; followups: number; skipped: { id: string; why: string }[]; dry: boolean }

export async function runDrafter(opts: { dry?: boolean; timeBudgetMs?: number } = {}): Promise<DrafterStats> {
  const deadline = Date.now() + (opts.timeBudgetMs ?? 270_000)
  const dry = Boolean(opts.dry)
  const stats: DrafterStats = { drafted: 0, followups: 0, skipped: [], dry }

  const templates = await getPipelineTemplates()
  if (!templates.length) throw new Error('pipeline_templates is empty — run supabase/migrations/outreach_pipeline.sql')

  // First-touch lookbook link (config toggle, default OFF; needs a published version).
  const includeLookbook = await getLookbookToggle()
  const lookbook = includeLookbook ? await getCurrentLookbook() : null

  // ── Cold drafts for discovered A/B prospects ───────────────────────────────
  const { data: prospects } = await supabaseAdmin.from('prospects')
    .select('id, company, person_name, category, fit_reason, email, email_grade')
    .eq('status', 'discovered').in('email_grade', ['A', 'B'])
    .order('created_at', { ascending: true }).limit(60)

  for (const p of (prospects ?? []) as { id: string; company: string; person_name: string | null; category: string | null; fit_reason: string | null; email: string | null; email_grade: string }[]) {
    if (Date.now() > deadline - 15_000) break
    if (!p.email) { stats.skipped.push({ id: p.id, why: 'no email' }); continue }

    const tpl = templateForCategory(p.category, templates)
    if (!tpl) { stats.skipped.push({ id: p.id, why: 'no template' }); continue }

    const firstName = (p.person_name ?? '').trim().split(/\s+/)[0] ?? ''
    const opening = (await draftOpening(p)) ?? (tpl.generic_opening ?? '').trim()
    const rendered = renderPipelineTemplate(tpl, { first_name: firstName, company: p.company, opening })
    if (!rendered.ok) { stats.skipped.push({ id: p.id, why: `unresolved: ${rendered.missing.join(',')}` }); continue }

    let body = rendered.body
    // Optional first-touch lookbook link — replaces (never adds to) the one link.
    if (lookbook) body = body.replace(new RegExp(CORPORATE_LINK.replace('.', '\\.'), 'g'), lookbook.url.replace(/^https?:\/\//, ''))

    // Hard rules re-checked in code: <120 words, plain text, exactly one link.
    if (wordCount(body) >= 120 || linkCount(body) !== 1) {
      stats.skipped.push({ id: p.id, why: 'failed word/link check' }); continue
    }

    if (!dry) {
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id, template_key: tpl.key, subject: rendered.subject, body,
        is_followup: false, draft_kind: 'cold', status: 'pending_review',
      })
      await supabaseAdmin.from('prospects')
        .update({ status: 'drafted', updated_at: new Date().toISOString() }).eq('id', p.id)
    }
    stats.drafted++
  }

  // ── Follow-up drafts: sent 6+ days ago, prospect never replied/bounced ─────
  stats.followups = await draftFollowups(templates, dry, deadline)

  if (!dry) await bumpDailyStats({ drafted: stats.drafted, followups_drafted: stats.followups })
  return stats
}

const PRESS_FOLLOWUP_AFTER_DAYS = 7   // press waits a little longer (7–10 day window)

async function draftFollowups(templates: PipelineTemplate[], dry: boolean, deadline: number): Promise<number> {
  const tpl = templates.find(t => t.key === 'followup')
  const pressTpl = templates.find(t => t.key === 'press-followup')
  if (!tpl && !pressTpl) return 0
  const cutoff = new Date(Date.now() - FOLLOWUP_AFTER_DAYS * 86_400_000).toISOString()
  const pressCutoff = new Date(Date.now() - PRESS_FOLLOWUP_AFTER_DAYS * 86_400_000).toISOString()
  // Press follow-ups need the press-kit link; loaded lazily to avoid the cost
  // when there are no press sends yet.
  const { getCurrentPressKit } = await import('../press-kit')
  const kit = await getCurrentPressKit().catch(() => null)

  // Sends old enough, whose prospect is still in 'sent' (a reply flips it to
  // 'replied', a bounce to 'bounced' — both drop out here automatically).
  const { data } = await supabaseAdmin.from('sends')
    .select('id, sent_at, draft:email_drafts!inner(id, prospect_id, is_followup, prospect:prospects!inner(id, company, person_name, status, channel, outlet))')
    .eq('status', 'sent').lte('sent_at', cutoff)
  let made = 0
  const seen = new Set<string>()

  for (const row of (data ?? []) as unknown as { sent_at: string | null; draft: { is_followup: boolean; prospect: { id: string; company: string; person_name: string | null; status: string; channel: string | null; outlet: string | null } } }[]) {
    if (Date.now() > deadline - 10_000) break
    const pr = row.draft?.prospect
    if (!pr || pr.status !== 'sent' || row.draft.is_followup) continue   // one follow-up max, only un-replied
    if (seen.has(pr.id)) continue
    seen.add(pr.id)

    const isPress = pr.channel === 'press'
    if (isPress && (!pressTpl || !kit)) continue                                   // no kit → no press follow-up
    if (isPress && (row.sent_at ?? '') > pressCutoff) continue                     // press waits the full 7 days
    if (!isPress && !tpl) continue

    // Skip if a follow-up draft already exists for this prospect.
    const { count } = await supabaseAdmin.from('email_drafts')
      .select('id', { count: 'exact', head: true }).eq('prospect_id', pr.id).eq('is_followup', true)
    if ((count ?? 0) > 0) continue

    const firstName = (pr.person_name ?? '').trim().split(/\s+/)[0] ?? ''
    const rendered = isPress
      ? renderPipelineTemplate(pressTpl!, { first_name: firstName, outlet: pr.outlet ?? pr.company, press_kit_url: kit!.url })
      : renderPipelineTemplate(tpl!, { first_name: firstName, company: pr.company, opening: '-' })
    if (!rendered.ok) continue

    if (!dry) {
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: pr.id, template_key: isPress ? 'press-followup' : 'followup', subject: rendered.subject, body: rendered.body,
        is_followup: true, draft_kind: 'followup', status: 'pending_review',
      })
    }
    made++
  }
  return made
}
