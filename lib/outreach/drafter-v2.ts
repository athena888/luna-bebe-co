import { supabaseAdmin } from '../supabase'
import { bumpDailyStats, pipelineEnabled, getDailySendCap } from '../pipeline/config'
import { getPipelineTemplates, draftFollowups } from '../pipeline/drafter'
import { comboForDate, INDUSTRIES, violatesCityBan, type WeekCombo } from './targeting'
import {
  pickTrack, renderFrozenTemplate, subjectVariantForSlot,
  FROZEN_TEMPLATES, type SubjectVariant,
} from './templates'
import type { PitchTrack } from './targeting'

// Targeting-v2 drafter — ZERO model calls. Template selection is a
// deterministic lookup (weekly combo → industry → track → frozen template;
// BOTH industries split 50/50 employee/client, tagged separately), subjects
// alternate A/B evenly, personalization is variable fill only. Drafts land as
// 'pending_review' — the morning review + approved-only sender are untouched.

export interface RenderedDraft {
  subject: string
  body: string
  track: PitchTrack
  variant: SubjectVariant
  comboKey: string
  templateKey: string
}

/** City ban, ignoring city words that appear inside the prospect's own
 *  company/person name (the frozen template text itself never names a city —
 *  only variable fill could introduce one). */
export function cityBanViolation(text: string, company: string, firstName: string): string | null {
  let stripped = text
  for (const v of [company, firstName]) {
    const t = (v ?? '').trim()
    if (t) stripped = stripped.split(t).join(' ')
  }
  return violatesCityBan(stripped)
}

/**
 * Render one slot of the day's batch. The caller picks `track` (via
 * pickTrack — 50/50 split inside a BOTH industry) and `variant` (via
 * subjectVariantForSlot on a PER-TRACK counter, so A/B alternates evenly
 * within each track and the split can't confound the comparison).
 */
export function renderSlot(
  prospect: { company: string; person_name: string | null },
  industryKey: string,
  cityKey: string,
  track: PitchTrack,
  variant: SubjectVariant,
): RenderedDraft | { error: string } {
  if (!INDUSTRIES[industryKey]) return { error: `unknown industry ${industryKey}` }
  const firstName = (prospect.person_name ?? '').trim().split(/\s+/)[0] ?? ''

  const rendered = renderFrozenTemplate(FROZEN_TEMPLATES[track], variant, {
    first_name: firstName, company: prospect.company,
  })
  if ('error' in rendered) return { error: rendered.error }

  const banned = cityBanViolation(`${rendered.subject}\n${rendered.body}`, prospect.company, firstName)
  if (banned) return { error: `city ban: "${banned}"` }

  return {
    subject: rendered.subject,
    body: rendered.body,
    track,
    variant,
    comboKey: `${cityKey}x${industryKey}`,
    templateKey: `v2-${track}-${variant}`,
  }
}

export interface DrafterV2Stats {
  drafted: number
  followups: number
  perTrack: Record<string, number>
  skipped: { id: string; why: string }[]
  dry: boolean
  paused?: boolean
}

export async function runDrafterV2(opts: { dry?: boolean; timeBudgetMs?: number } = {}): Promise<DrafterV2Stats> {
  const deadline = Date.now() + (opts.timeBudgetMs ?? 200_000)
  const dry = Boolean(opts.dry)
  const stats: DrafterV2Stats = { drafted: 0, followups: 0, perTrack: {}, skipped: [], dry }

  if (!(await pipelineEnabled())) { stats.paused = true; return stats }

  const combo: WeekCombo = comboForDate(new Date())
  const cap = await getDailySendCap()

  // This week's qualified, persona-matched A/B prospects, oldest first.
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, person_name, category, email')
    .eq('status', 'discovered').in('email_grade', ['A', 'B'])
    .eq('metro', combo.city).in('category', [...combo.industries])
    .eq('persona_match', true)
    .order('created_at', { ascending: true })
    .limit(Math.ceil(cap * 1.5))

  const industrySlots: Record<string, number> = {}
  const trackSlots: Record<string, number> = {}

  for (const p of (data ?? []) as { id: string; company: string; person_name: string | null; category: string | null; email: string | null }[]) {
    if (Date.now() > deadline - 15_000) break
    if (stats.drafted >= cap) break   // more than a day's cap of pending drafts just clutters review
    if (!p.email) { stats.skipped.push({ id: p.id, why: 'no email' }); continue }
    const industryKey = p.category ?? ''
    const industry = INDUSTRIES[industryKey]
    if (!industry) { stats.skipped.push({ id: p.id, why: `unknown industry ${industryKey}` }); continue }
    const slot = industrySlots[industryKey] ?? 0
    const track = pickTrack(industry.track, slot)
    const variant = subjectVariantForSlot(trackSlots[track] ?? 0)

    const draft = renderSlot(p, industryKey, combo.city, track, variant)
    if ('error' in draft) { stats.skipped.push({ id: p.id, why: draft.error }); continue }

    if (!dry) {
      const { error } = await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id, template_key: draft.templateKey,
        subject: draft.subject, body: draft.body,
        is_followup: false, draft_kind: 'cold', status: 'pending_review',
        combo_key: draft.comboKey, track_used: draft.track, subject_variant: draft.variant,
      })
      if (error) { stats.skipped.push({ id: p.id, why: error.message }); continue }
      await supabaseAdmin.from('prospects')
        .update({ status: 'drafted', updated_at: new Date().toISOString() }).eq('id', p.id)
    }
    industrySlots[industryKey] = slot + 1
    trackSlots[track] = (trackSlots[track] ?? 0) + 1
    stats.drafted++
    stats.perTrack[draft.track] = (stats.perTrack[draft.track] ?? 0) + 1
  }

  // Follow-ups ride the existing v1 machinery (pipeline_templates 'followup',
  // same review queue) — one follow-up max per prospect, only un-replied.
  try {
    const templates = await getPipelineTemplates()
    stats.followups = await draftFollowups(templates, dry, deadline)
  } catch (e) { console.error('v2 followups failed:', e) }

  if (!dry) await bumpDailyStats({ drafted: stats.drafted, followups_drafted: stats.followups })
  return stats
}
