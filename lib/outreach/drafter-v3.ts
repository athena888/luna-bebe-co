// Drafting stage, quality-first.
//
// Replaces the v1 drafter's two defining behaviours:
//   * FIFO selection            -> ranked by tier, score, recurring potential
//   * "any A/B-grade prospect"  -> only prospects passing every hard gate
//
// Every draft still lands as 'pending_review'. Nothing here can send, and no
// path exists from this module to sendEmail(). Follow-ups are drafted only for
// prospects the reply/bounce sync has confirmed are still silent.
//
// ZERO model calls: templates are frozen and the researched opening sentence is
// composed deterministically from stored evidence (see ./opening.ts).

import { supabaseAdmin } from '../supabase.ts'
import { followupsSafe } from './followup-gate.ts'
import { getConfig, pipelineEnabled } from '../pipeline/config.ts'
import { SEGMENTS, type Segment } from './icp.ts'
import {
  rankForSend, applySegmentQuota, checkHardGates,
  type SelectableProspect, type Tier,
} from './scoring.ts'
import { templateFor, renderTemplateV3, findBannedContent, type SequenceStep } from './templates-v3.ts'
import { buildOpening, openingSource } from './opening.ts'
import { followupDecision } from './reply-rules.ts'
import type { ScoringSignal } from './scoring.ts'

export interface DrafterV3Stats {
  selected: number
  drafted: number
  followupsDrafted: number
  skipped: Array<{ company: string; why: string }>
  byTier: Record<string, number>
  bySegment: Record<string, number>
  dry: boolean
  paused?: boolean
  disabled?: boolean
}

interface QualifiedRow {
  id: string
  company: string
  person_name: string | null
  email: string | null
  email_grade: string | null
  title: string | null
  segment: Segment | null
  qualification_tier: Tier | null
  qualification_score: number | null
  recurring_potential: 'HIGH' | 'MEDIUM' | 'LOW' | null
  contact_fit_score: number | null
  intent_score: number | null
  data_quality_score: number | null
  qualified_at: string | null
  status: string
  sequence_step: number | null
  email_is_generic: boolean | null
  contact_confidence: string | null
}

/** A/B subject variants alternate evenly within a segment so the comparison
 *  is never confounded by segment mix. */
function variantForSlot(slot: number): 'A' | 'B' {
  return slot % 2 === 0 ? 'A' : 'B'
}


// Emily's own template (2026-08-20): when outreach_config.custom_template is
// enabled, EVERY cold draft uses the body/subject stored in pipeline_templates
// key CUSTOM — bypassing the per-segment frozen templates AND the
// evidence-opening gate (her copy carries no opening slot). The template lives
// in the DB so she can edit copy without a deploy. The banned-content check
// still applies; nothing sends without her approval either way.
async function loadCustomTemplate(): Promise<{ subject: string; body: string } | null> {
  const flag = await getConfig<{ enabled?: boolean }>('custom_template')
  if (flag?.enabled !== true) return null
  const { data } = await supabaseAdmin.from('pipeline_templates')
    .select('subject, body').eq('key', 'CUSTOM').maybeSingle()
  return (data as { subject: string; body: string } | null) ?? null
}

export async function runDrafterV3(opts: { dry?: boolean; limit?: number } = {}): Promise<DrafterV3Stats> {
  const dry = Boolean(opts.dry)
  const stats: DrafterV3Stats = {
    selected: 0, drafted: 0, followupsDrafted: 0, skipped: [],
    byTier: {}, bySegment: {}, dry,
  }

  // A paused pipeline blocks all WRITES. A dry run writes nothing and is
  // manually supervised, so it stays previewable while paused — that is the
  // only way to inspect what the queue would produce before un-pausing.
  const paused = !(await pipelineEnabled())
  if (paused) {
    stats.paused = true
    if (!dry) return stats
  }
  const flags = await getConfig<{ drafting_enabled?: boolean; followup_1_enabled?: boolean; followup_2_enabled?: boolean }>('quality_v3')
  if (flags?.drafting_enabled === false) { stats.disabled = true; return stats }

  // ── Cold drafts ────────────────────────────────────────────────────────────
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, person_name, email, email_grade, title, segment, qualification_tier, qualification_score, recurring_potential, contact_fit_score, intent_score, data_quality_score, qualified_at, status, sequence_step, email_is_generic, contact_confidence')
    .eq('qualification_status', 'QUALIFIED')
    .eq('status', 'discovered')
    .limit(500)

  const rows = (data ?? []) as unknown as QualifiedRow[]

  const ranked = rankForSend(rows.map(r => ({
    id: r.id,
    qualification_tier: r.qualification_tier,
    qualification_score: r.qualification_score,
    recurring_potential: r.recurring_potential,
    contact_fit_score: r.contact_fit_score,
    intent_score: r.intent_score,
    data_quality_score: r.data_quality_score,
    qualified_at: r.qualified_at,
    segment: r.segment,
  } satisfies SelectableProspect)))

  const quota = (await getConfig<Record<string, number>>('segment_quota')) ?? {}
  const limit = opts.limit ?? 60
  const picked = applySegmentQuota(ranked, quota as Partial<Record<Segment, number>>, limit)
  stats.selected = picked.length

  const byId = new Map(rows.map(r => [r.id, r]))
  const slotBySegment = new Map<string, number>()

  for (const sel of picked) {
    const p = byId.get(sel.id)
    if (!p) continue
    const segment = p.segment as Segment | null
    if (!segment || !SEGMENTS[segment]?.autoSendable) {
      stats.skipped.push({ company: p.company, why: 'segment not auto-sendable' })
      continue
    }

    // Re-check the gates at draft time. Discovery-time state is never trusted:
    // a prospect may have replied, bounced or been suppressed since scoring.
    if (p.email_is_generic) { stats.skipped.push({ company: p.company, why: 'generic inbox' }); continue }
    if (p.contact_confidence !== 'HIGH') { stats.skipped.push({ company: p.company, why: 'contact confidence below HIGH' }); continue }
    if (!(p.email_grade === 'A' || p.email_grade === 'B')) { stats.skipped.push({ company: p.company, why: 'grade not A/B' }); continue }

    // Custom-template mode: Emily's copy, no evidence requirement.
    const custom = await loadCustomTemplate()
    if (custom) {
      const first = p.person_name?.split(/\s+/)[0] || 'there'
      const body = custom.body.replace(/\{\{\s*first_name\s*\}\}/g, first).replace(/\{\{\s*company\s*\}\}/g, p.company)
      const subject = custom.subject.replace(/\{\{\s*first_name\s*\}\}/g, first).replace(/\{\{\s*company\s*\}\}/g, p.company)
      const bannedC = findBannedContent(body)
      if (bannedC) { stats.skipped.push({ company: p.company, why: `banned content: ${bannedC.why}` }); continue }
      if (!dry) {
        await supabaseAdmin.from('email_drafts').insert({
          prospect_id: p.id, template_key: 'CUSTOM', subject, body,
          is_followup: false, draft_kind: 'cold', status: 'pending_review',
          combo_key: segment, track_used: segment, subject_variant: 'A',
        })
        await supabaseAdmin.from('prospects').update({
          status: 'drafted', account_stage: 'DRAFTED', updated_at: new Date().toISOString(),
        }).eq('id', p.id)
      }
      stats.drafted++
      stats.byTier[p.qualification_tier ?? '?'] = (stats.byTier[p.qualification_tier ?? '?'] ?? 0) + 1
      stats.bySegment[segment] = (stats.bySegment[segment] ?? 0) + 1
      continue
    }

    const signals = await loadSignals(p.id)
    const opening = buildOpening({ company: p.company, segment, signals })
    if (!opening) {
      // No substantive evidence -> no first touch. Silence beats a hollow email.
      stats.skipped.push({ company: p.company, why: 'no substantive signal for a researched opening' })
      continue
    }

    const tpl = templateFor(segment, 0)
    if (!tpl) { stats.skipped.push({ company: p.company, why: 'no template for segment' }); continue }

    const slot = slotBySegment.get(segment) ?? 0
    slotBySegment.set(segment, slot + 1)
    const rendered = renderTemplateV3(tpl, variantForSlot(slot), {
      first_name: p.person_name?.split(/\s+/)[0] ?? null,
      company: p.company,
      opening,
    })
    if (!rendered.ok) { stats.skipped.push({ company: p.company, why: rendered.error }); continue }

    const banned = findBannedContent(rendered.body)
    if (banned) { stats.skipped.push({ company: p.company, why: `banned content: ${banned.why}` }); continue }

    if (!dry) {
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id,
        template_key: `v3:${segment}:0`,
        subject: rendered.subject,
        body: rendered.body,
        is_followup: false,
        draft_kind: 'cold',
        status: 'pending_review',
        combo_key: segment,
        track_used: segment,
        subject_variant: rendered.variant,
      })
      await supabaseAdmin.from('prospects').update({
        status: 'drafted', account_stage: 'DRAFTED', updated_at: new Date().toISOString(),
      }).eq('id', p.id)
    }

    stats.drafted++
    stats.byTier[p.qualification_tier ?? '?'] = (stats.byTier[p.qualification_tier ?? '?'] ?? 0) + 1
    stats.bySegment[segment] = (stats.bySegment[segment] ?? 0) + 1
  }

  // ── Follow-ups ─────────────────────────────────────────────────────────────
  // The flags say what we want; the gate says whether reply detection is
  // actually working. A follow-up sent while replies are invisible chases
  // people who already answered, so both must agree. Once gmail.readonly is
  // granted and the nightly sync logs a clean run, this opens on its own.
  const followupGate = await followupsSafe()
  if (!followupGate.safe) console.warn('follow-ups held:', followupGate.reason)
  stats.followupsDrafted = await draftFollowups({
    dry,
    step1: followupGate.safe && flags?.followup_1_enabled === true,
    step2: followupGate.safe && flags?.followup_2_enabled === true,
  })

  return stats
}

async function loadSignals(prospectId: string): Promise<ScoringSignal[]> {
  try {
    const { data: p } = await supabaseAdmin.from('prospects').select('domain').eq('id', prospectId).maybeSingle()
    const domain = (p as { domain?: string } | null)?.domain
    if (!domain) return []
    const { data } = await supabaseAdmin.from('prospect_signals')
      .select('signal_type, signal_value, confidence, source_url, source_title')
      .eq('domain', domain.toLowerCase())
    return (data ?? []) as ScoringSignal[]
  } catch {
    return []   // signals table missing (migration not applied) — no opening, no draft
  }
}

/**
 * Follow-ups for prospects that have gone quiet.
 *
 * Both steps are flag-gated and OFF by default. They must stay off until the
 * Gmail sync is verified: without reply detection we cannot know who already
 * answered, and chasing someone who replied is the fastest way to earn a spam
 * complaint.
 */
async function draftFollowups(opts: { dry: boolean; step1: boolean; step2: boolean }): Promise<number> {
  if (!opts.step1 && !opts.step2) return 0

  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, person_name, segment, status, sequence_step, followup_paused_reason, replied_at')
    .eq('status', 'sent')
    .is('replied_at', null)
    .is('followup_paused_reason', null)
    .limit(200)

  const rows = (data ?? []) as unknown as Array<{
    id: string; company: string; person_name: string | null; segment: Segment | null
    status: string; sequence_step: number | null; followup_paused_reason: string | null
  }>
  const now = new Date()
  let drafted = 0

  for (const p of rows) {
    if (!p.segment || !SEGMENTS[p.segment]?.autoSendable) continue

    // Last actual send for this prospect — timing runs from the ORIGINAL send,
    // so historical prospects resume mid-sequence instead of restarting.
    const { data: sends } = await supabaseAdmin.from('sends')
      .select('sent_at, draft:email_drafts!inner(prospect_id)')
      .eq('email_drafts.prospect_id', p.id).eq('status', 'sent')
      .order('sent_at', { ascending: false }).limit(1)
    const lastSentAt = ((sends ?? [])[0] as { sent_at?: string } | undefined)?.sent_at ?? null

    const decision = followupDecision({
      prospectStatus: p.status,
      sequenceStep: p.sequence_step ?? 0,
      lastSentAt,
      followupPausedReason: p.followup_paused_reason,
      suppressed: false,
      isCustomer: false,
    }, now)
    if (!decision.send || decision.step == null) continue
    if (decision.step === 1 && !opts.step1) continue
    if (decision.step === 2 && !opts.step2) continue

    const tpl = templateFor(p.segment, decision.step as SequenceStep)
    if (!tpl) continue
    const rendered = renderTemplateV3(tpl, 'A', {
      first_name: p.person_name?.split(/\s+/)[0] ?? null,
      company: p.company,
    })
    if (!rendered.ok) continue
    if (findBannedContent(rendered.body)) continue

    if (!opts.dry) {
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id,
        template_key: `v3:${p.segment}:${decision.step}`,
        subject: rendered.subject,
        body: rendered.body,
        is_followup: true,
        draft_kind: 'followup',
        status: 'pending_review',
        combo_key: p.segment,
        track_used: p.segment,
        subject_variant: rendered.variant,
      })
    }
    drafted++
  }
  return drafted
}

export { buildOpening, openingSource }
