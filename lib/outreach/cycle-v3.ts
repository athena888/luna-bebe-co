// The nightly v3 cycle — the stage that was missing.
//
// Everything in lib/outreach/* was previously driven by hand from scripts/,
// which meant the "new pipeline" did not actually run on a schedule: the crons
// still called the v1 prospector and v1 drafter. This module is what the cron
// invokes, so enrichment → qualification → contact discovery happen nightly
// without anyone typing a command.
//
// Ordering is deliberate:
//   1. ENRICH the companies we know nothing about. Scoring without evidence
//      produces zero qualified leads (proven on the legacy 353), so research
//      must come first.
//   2. QUALIFY + PERSIST every prospect against the deterministic scorer.
//   3. DISCOVER CONTACTS for companies that qualify on the company side but
//      have no reachable named buyer — the largest and most valuable bucket.
//
// Work is bounded per run so a growing pool never turns into an unbounded
// nightly bill. Discovery capacity and SEND volume stay decoupled (§45/§51):
// nothing here can send, and this runs at full speed while outbound is dark.

import { supabaseAdmin } from '../supabase.ts'
import { getConfig } from '../pipeline/config.ts'
import { runEnrichment, FIRMOGRAPHIC_FRESH_DAYS, type EnrichTarget } from './enrich.ts'
import { qualifyRecord } from './qualify-v3.ts'
import {
  loadDiscoveryTargets, discoverContacts, resolveEmail, saveContact,
  MAX_DISCOVERY_BATCH,
} from './contact-discovery.ts'
import type { ScoringSignal } from './scoring.ts'

export interface CycleStats {
  enabled: boolean
  enriched: number
  enrichBatches: number
  qualified: number
  byStatus: Record<string, number>
  contactsAttempted: number
  contactsFound: number
  contactsSendable: number
  errors: string[]
  dry: boolean
  skippedReason?: string
}

/** Bounds per nightly run. Deliberately small: research is the expensive part,
 *  and a steady trickle beats a monthly bill spike. Overridable from config. */
interface CycleBudget {
  enrichBatches: number     // × 6 companies
  discoveryBatches: number  // × 5 companies
}
const DEFAULT_BUDGET: CycleBudget = { enrichBatches: 3, discoveryBatches: 1 }

export async function runCycleV3(opts: { dry?: boolean } = {}): Promise<CycleStats> {
  const dry = Boolean(opts.dry)
  const stats: CycleStats = {
    enabled: false, enriched: 0, enrichBatches: 0, qualified: 0, byStatus: {},
    contactsAttempted: 0, contactsFound: 0, contactsSendable: 0, errors: [], dry,
  }

  const flags = await getConfig<{ qualification_enabled?: boolean; discovery_enabled?: boolean }>('quality_v3')
  if (flags?.qualification_enabled !== true) {
    stats.skippedReason = 'quality_v3.qualification_enabled is not true'
    return stats
  }
  stats.enabled = true

  const budget = { ...DEFAULT_BUDGET, ...((await getConfig<Partial<CycleBudget>>('quality_v3_budget')) ?? {}) }

  // ── 1. Enrich domains we have no fresh research for ────────────────────────
  if (flags.discovery_enabled !== false) {
    try {
      const targets = await loadEnrichTargets(budget.enrichBatches * 6)
      if (targets.length) {
        const r = await runEnrichment(targets, { dry, maxBatches: budget.enrichBatches, ignoreBudget: true })
        stats.enriched = r.researched
        stats.enrichBatches = r.apiCalls
        stats.errors.push(...r.errors.slice(0, 5))
      }
    } catch (e) {
      stats.errors.push(`enrichment: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 2. Qualify + persist ───────────────────────────────────────────────────
  try {
    const r = await qualifyAndPersist({ dry })
    stats.qualified = r.updated
    stats.byStatus = r.byStatus
  } catch (e) {
    stats.errors.push(`qualification: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ── 3. Find named buyers for companies blocked only on contact ─────────────
  if (flags.discovery_enabled !== false) {
    try {
      const targets = await loadDiscoveryTargets(budget.discoveryBatches * MAX_DISCOVERY_BATCH)
      stats.contactsAttempted = targets.length
      for (let i = 0; i < targets.length; i += MAX_DISCOVERY_BATCH) {
        const batch = targets.slice(i, i + MAX_DISCOVERY_BATCH)
        const { contacts } = await discoverContacts(batch, { dry })
        const byDomain = new Map(batch.map(t => [t.domain, t]))
        for (const c of contacts) {
          const t = byDomain.get(c.domain)
          if (!t) continue
          if (c.person_name) stats.contactsFound++
          const resolved = await resolveEmail(c)
          if (resolved.email_grade === 'A' || resolved.email_grade === 'B') {
            stats.contactsSendable++
            if (!dry) await saveContact(t.prospectId, resolved)
          }
        }
      }
    } catch (e) {
      stats.errors.push(`contact discovery: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return stats
}

/** Domains with no firmographics, or research older than the freshness window. */
async function loadEnrichTargets(limit: number): Promise<EnrichTarget[]> {
  const { data: prospects } = await supabaseAdmin.from('prospects')
    .select('company, domain, fit_reason, channel')
    .not('domain', 'is', null)
    .neq('channel', 'press')
    .limit(2000)

  const rows = (prospects ?? []) as Array<{ company: string; domain: string; fit_reason: string | null }>
  if (!rows.length) return []

  const cutoff = new Date(Date.now() - FIRMOGRAPHIC_FRESH_DAYS * 86_400_000).toISOString()
  const { data: fresh } = await supabaseAdmin.from('prospect_firmographics')
    .select('domain').gte('researched_at', cutoff)
  const done = new Set(((fresh ?? []) as Array<{ domain: string }>).map(f => f.domain.toLowerCase()))

  const seen = new Set<string>()
  const out: EnrichTarget[] = []
  for (const r of rows) {
    const d = r.domain.toLowerCase()
    if (done.has(d) || seen.has(d)) continue
    seen.add(d)
    out.push({ domain: d, company: r.company, hint: (r.fit_reason ?? '').slice(0, 200) || null })
    if (out.length >= limit) break
  }
  return out
}

/**
 * Score every corporate prospect and write the v3 columns.
 *
 * Only qualification fields are written. `status`, `email`, `person_name`,
 * `company` and `fit_reason` are never touched here — a prospect that has been
 * emailed keeps its record of who it was emailed as.
 */
export async function qualifyAndPersist(
  opts: { dry?: boolean; limit?: number } = {},
): Promise<{ updated: number; byStatus: Record<string, number> }> {
  const dry = Boolean(opts.dry)

  const { data: prospects } = await supabaseAdmin.from('prospects')
    .select('id, company, domain, category, title, person_name, email, email_grade, fit_reason, source_url, channel, created_at')
    .neq('channel', 'press')
    .limit(opts.limit ?? 2000)

  const rows = (prospects ?? []) as Array<Record<string, unknown>>
  if (!rows.length) return { updated: 0, byStatus: {} }

  const domains = [...new Set(rows.map(r => String(r.domain ?? '').toLowerCase()).filter(Boolean))]

  const firmo = new Map<string, { size_band: string | null; size_confidence: string; research_summary: string | null; source_urls: string[] }>()
  const signals = new Map<string, ScoringSignal[]>()
  // Chunked so a large pool cannot blow the URL length limit.
  for (let i = 0; i < domains.length; i += 200) {
    const slice = domains.slice(i, i + 200)
    const [{ data: f }, { data: s }] = await Promise.all([
      supabaseAdmin.from('prospect_firmographics')
        .select('domain, size_band, size_confidence, research_summary, source_urls').in('domain', slice),
      supabaseAdmin.from('prospect_signals')
        .select('domain, signal_type, signal_value, confidence, source_url, source_title').in('domain', slice),
    ])
    for (const r of (f ?? []) as Array<Record<string, unknown>>) {
      firmo.set(String(r.domain), {
        size_band: (r.size_band as string) ?? null,
        size_confidence: (r.size_confidence as string) ?? 'LOW',
        research_summary: (r.research_summary as string) ?? null,
        source_urls: (r.source_urls as string[]) ?? [],
      })
    }
    for (const r of (s ?? []) as Array<Record<string, unknown>>) {
      const d = String(r.domain)
      if (!signals.has(d)) signals.set(d, [])
      signals.get(d)!.push(r as unknown as ScoringSignal)
    }
  }

  const byStatus: Record<string, number> = {}
  let updated = 0

  for (const p of rows) {
    const domain = String(p.domain ?? '').toLowerCase()
    const f = firmo.get(domain)
    const out = qualifyRecord({
      company: String(p.company ?? ''),
      domain,
      category: p.category as string | null,
      title: p.title as string | null,
      personName: p.person_name as string | null,
      email: p.email as string | null,
      emailGrade: p.email_grade as 'A' | 'B' | 'C' | 'D' | null,
      fitReason: [f?.research_summary, p.fit_reason as string | null].filter(Boolean).join(' '),
      sourceUrl: f?.source_urls?.[0] ?? (p.source_url as string | null),
      researchAgeDays: f ? 0 : null,
      known: f ? { sizeBand: f.size_band as never, sizeConfidence: f.size_confidence as never } : null,
      extraSignals: signals.get(domain) ?? [],
    })
    byStatus[out.result.status] = (byStatus[out.result.status] ?? 0) + 1

    if (!dry) {
      const { error } = await supabaseAdmin.from('prospects').update({
        segment: out.segment,
        qualification_score: out.result.score,
        qualification_tier: out.result.tier,
        qualification_status: out.result.status,
        company_fit_score: out.result.companyFit,
        contact_fit_score: out.result.contactFit,
        intent_score: out.result.intent,
        data_quality_score: out.result.dataQuality,
        recurring_potential: out.result.recurring,
        contact_confidence: out.result.contactConfidence,
        company_size_band: out.sizeBand,
        company_size_confidence: out.sizeConfidence,
        email_is_generic: out.result.emailIsGeneric,
        title_interpretation: out.result.titleInterpretation,
        role_family: out.result.roleFamily,
        qualification_summary: out.explanation.slice(0, 4000),
        qualification_reasons: out.result.reasons,
        disqualification_reasons: out.result.disqualifiers,
        qualified_at: new Date().toISOString(),
        research_version: 3,
      }).eq('id', String(p.id))
      if (!error) updated++
    } else {
      updated++
    }
  }
  return { updated, byStatus }
}
