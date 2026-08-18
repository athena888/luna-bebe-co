// Firmographic + buying-signal enrichment.
//
// THE GAP THIS FILLS: the v1 prospector stored one marketing sentence per
// company (~182 chars). Only ~5% of those sentences mention headcount and ~5%
// mention People/benefits infrastructure — so the v3 scorer, correctly, cannot
// qualify almost any legacy prospect. It has nothing to qualify ON.
//
// This module researches a company properly: employee-count RANGE, industry,
// HQ, and structured buying signals, each with the source URL it came from.
// Results are cached per DOMAIN so the same company is never researched twice
// inside its freshness window (§23, §50), which is what makes an unbounded and
// continuously growing prospect pool affordable (§45).
//
// Guardrails baked into the prompt and enforced on the way out:
//  * Never invent a company fact. "unknown" is a valid, expected answer.
//  * Employee counts are RANGES, never a fabricated exact number.
//  * Every signal must carry the URL it was observed on, or it is dropped.
//  * Only business- and role-level facts. Nothing about individual people's
//    age, family status, pregnancy, ethnicity or religion is ever requested,
//    stored, or inferred.

import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { apiBudgetRemaining, logApiCall } from './api-ledger.ts'
import { extractJsonObject, textBlocks } from './json-extract.ts'
import { SIGNAL_TYPES, bandForRange, type SizeBand } from './icp.ts'
import type { Confidence } from './scoring.ts'

const MODEL = 'claude-sonnet-4-6'

/** Freshness windows (§23). A domain inside its window is never re-researched. */
export const FIRMOGRAPHIC_FRESH_DAYS = 180
export const SIGNAL_FRESH_DAYS = 90

export const MAX_ENRICH_BATCH = 6   // companies per web-search call

export interface EnrichTarget {
  domain: string
  company: string
  /** Optional hint from prior research; never treated as fact. */
  hint?: string | null
}

export interface EnrichedFirmographics {
  domain: string
  company_name: string | null
  employee_min: number | null
  employee_max: number | null
  size_band: SizeBand | null
  size_confidence: Confidence
  industry: string | null
  subindustry: string | null
  company_type: string | null
  hq_city: string | null
  hq_state: string | null
  country: string | null
  source_urls: string[]
  research_summary: string | null
  confidence: Confidence
}

export interface EnrichedSignal {
  domain: string
  signal_type: string
  signal_value: string | null
  confidence: Confidence
  source_url: string | null
  source_title: string | null
}

export interface EnrichStats {
  requested: number
  fromCache: number
  researched: number
  deferred: number
  signalsFound: number
  apiCalls: number
  inputTokens: number
  outputTokens: number
  errors: string[]
  dry: boolean
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    companies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          company_name: { type: ['string', 'null'] },
          employee_min: { type: ['integer', 'null'], description: 'Lower bound of a RANGE. null if unknown.' },
          employee_max: { type: ['integer', 'null'], description: 'Upper bound of a RANGE. null if unknown.' },
          size_confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          industry: { type: ['string', 'null'] },
          subindustry: { type: ['string', 'null'] },
          company_type: { type: ['string', 'null'] },
          hq_city: { type: ['string', 'null'] },
          hq_state: { type: ['string', 'null'] },
          research_summary: { type: ['string', 'null'], description: 'Two factual sentences, no speculation.' },
          confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          source_urls: { type: 'array', items: { type: 'string' } },
          signals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                signal_type: { type: 'string', enum: [...SIGNAL_TYPES] },
                signal_value: { type: 'string', description: 'Short quote or paraphrase of the evidence.' },
                source_url: { type: 'string' },
                source_title: { type: ['string', 'null'] },
                confidence: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
              },
              required: ['signal_type', 'signal_value', 'source_url', 'confidence'],
              additionalProperties: false,
            },
          },
        },
        required: ['domain', 'employee_min', 'employee_max', 'size_confidence', 'confidence', 'source_urls', 'signals'],
        additionalProperties: false,
      },
    },
  },
  required: ['companies'],
  additionalProperties: false,
} as const

const SYSTEM = `You research companies for Petite Lavande, which sells premium organic new-parent gift boxes to businesses as employee and client gifts.

For each company find only PUBLIC, BUSINESS-LEVEL facts:

1. EMPLOYEE COUNT — as a RANGE (employee_min / employee_max).
   - Prefer the company's own site, careers/about pages, or credible business directories.
   - If sources disagree, widen the range rather than picking one.
   - If you cannot establish a defensible range, set BOTH to null and size_confidence LOW. This is expected and acceptable — DO NOT GUESS.
   - Never state an exact headcount unless a source states it exactly.

2. FIRMOGRAPHICS — industry, subindustry, company_type (private/public/partnership/fund/nonprofit/agency), HQ city and state.

3. BUYING SIGNALS — only where you find real published evidence. Each signal MUST include the source_url where you saw it. Allowed signal types are fixed; use the closest match. Signals to look for:
   - parental_leave_benefit, new_parent_support, employee_benefits_page, employee_recognition, milestone_gifting, people_hr_function, employee_experience_team, workplace_experience, careers_page
   - corporate_gifting_page, client_gifting_program, client_experience_positioning, concierge_service, hnw_family_model, family_office
   - platform_team, portfolio_services, founder_community, talent_network
   - family_law_practice, private_client_practice, estate_planning_practice, fertility_adoption_practice
   - headcount_evidence, office_locations

ABSOLUTE RULES:
- Never invent a fact, a URL, a statistic or a quote. If you did not see it, it does not exist.
- Returning zero signals for a company is a correct answer when you found no evidence.
- Do NOT research or report anything about individual employees' personal characteristics — age, family status, pregnancy, ethnicity, religion, or whether anyone is likely to have children. Company-level and role-level facts only.
- Do not open or scrape linkedin.com pages.`

async function loadCachedDomains(domains: string[]): Promise<Set<string>> {
  const fresh = new Set<string>()
  if (!domains.length) return fresh
  const cutoff = new Date(Date.now() - FIRMOGRAPHIC_FRESH_DAYS * 86_400_000).toISOString()
  try {
    const { data } = await supabaseAdmin.from('prospect_firmographics')
      .select('domain').in('domain', domains).gte('researched_at', cutoff)
    for (const r of (data ?? []) as { domain: string }[]) fresh.add(r.domain.toLowerCase())
  } catch { /* table missing (migration not run) — treated as empty cache */ }
  return fresh
}

interface RawCompany {
  domain: string
  company_name?: string | null
  employee_min?: number | null
  employee_max?: number | null
  size_confidence?: Confidence
  industry?: string | null
  subindustry?: string | null
  company_type?: string | null
  hq_city?: string | null
  hq_state?: string | null
  research_summary?: string | null
  confidence?: Confidence
  source_urls?: string[]
  signals?: Array<{
    signal_type: string; signal_value: string; source_url: string
    source_title?: string | null; confidence: Confidence
  }>
}

/** Research one batch. Pure-ish: returns results, writes nothing when dry. */
export async function enrichBatch(
  targets: EnrichTarget[],
  opts: { dry?: boolean } = {},
): Promise<{ firmographics: EnrichedFirmographics[]; signals: EnrichedSignal[]; usage: { input: number; output: number } }> {
  const list = targets.slice(0, MAX_ENRICH_BATCH)
  const payload = list.map(t => ({ domain: t.domain, company: t.company, hint: t.hint ?? null }))

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `Research these companies. Return one object per company, in the same order.\n\n${JSON.stringify(payload, null, 1)}`,
    }],
  })

  const usage = { input: res.usage.input_tokens, output: res.usage.output_tokens }
  if (!opts.dry) {
    await logApiCall({
      purpose: 'enrichment', model: MODEL, batch_size: list.length,
      input_tokens: usage.input, output_tokens: usage.output, ok: true,
    }).catch(() => {})
  }

  const parsed = (extractJsonObject(textBlocks(res.content), 'companies') ?? {}) as { companies?: RawCompany[] }

  const firmographics: EnrichedFirmographics[] = []
  const signals: EnrichedSignal[] = []
  const wanted = new Map(list.map(t => [t.domain.toLowerCase(), t]))

  for (const c of parsed.companies ?? []) {
    const domain = (c.domain ?? '').toLowerCase().trim()
    if (!wanted.has(domain)) continue   // never accept a domain we did not ask about

    const min = Number.isFinite(c.employee_min as number) ? Number(c.employee_min) : null
    const max = Number.isFinite(c.employee_max as number) ? Number(c.employee_max) : null
    firmographics.push({
      domain,
      company_name: c.company_name ?? wanted.get(domain)!.company,
      employee_min: min, employee_max: max,
      size_band: bandForRange(min, max),
      size_confidence: min == null && max == null ? 'LOW' : (c.size_confidence ?? 'LOW'),
      industry: c.industry ?? null,
      subindustry: c.subindustry ?? null,
      company_type: c.company_type ?? null,
      hq_city: c.hq_city ?? null,
      hq_state: c.hq_state ?? null,
      country: 'US',
      source_urls: (c.source_urls ?? []).filter(u => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 8),
      research_summary: c.research_summary ?? null,
      confidence: c.confidence ?? 'LOW',
    })

    for (const s of c.signals ?? []) {
      // A signal without a verifiable source is not evidence — drop it.
      if (!s.source_url || !/^https?:\/\//.test(s.source_url)) continue
      if (!(SIGNAL_TYPES as readonly string[]).includes(s.signal_type)) continue
      signals.push({
        domain,
        signal_type: s.signal_type,
        signal_value: (s.signal_value ?? '').slice(0, 300) || null,
        confidence: s.confidence ?? 'MEDIUM',
        source_url: s.source_url,
        source_title: s.source_title ?? null,
      })
    }
  }
  return { firmographics, signals, usage }
}

/** Persist enrichment. Upserts, so re-running is safe and idempotent. */
export async function saveEnrichment(
  firmographics: EnrichedFirmographics[],
  signals: EnrichedSignal[],
): Promise<void> {
  if (firmographics.length) {
    const { error } = await supabaseAdmin.from('prospect_firmographics').upsert(
      firmographics.map(f => ({ ...f, researched_at: new Date().toISOString(), research_version: 3 })),
      { onConflict: 'domain' },
    )
    if (error) throw new Error(`firmographics upsert failed: ${error.message}`)
  }
  if (signals.length) {
    const { error } = await supabaseAdmin.from('prospect_signals').upsert(
      signals.map(s => ({ ...s, observed_at: new Date().toISOString() })),
      { onConflict: 'domain,signal_type,source_url' },
    )
    if (error) throw new Error(`signals upsert failed: ${error.message}`)
  }
}

/**
 * Enrich many domains, respecting the cache and the daily API budget.
 * Discovery capacity is intentionally decoupled from send volume (§45/§51):
 * this may run continuously while live sending stays capped or paused.
 */
export async function runEnrichment(
  targets: EnrichTarget[],
  opts: { dry?: boolean; maxBatches?: number; ignoreBudget?: boolean } = {},
): Promise<EnrichStats> {
  const dry = Boolean(opts.dry)
  const stats: EnrichStats = {
    requested: targets.length, fromCache: 0, researched: 0, deferred: 0,
    signalsFound: 0, apiCalls: 0, inputTokens: 0, outputTokens: 0, errors: [], dry,
  }

  const cached = await loadCachedDomains(targets.map(t => t.domain.toLowerCase()))
  const todo = targets.filter(t => !cached.has(t.domain.toLowerCase()))
  stats.fromCache = targets.length - todo.length

  const maxBatches = opts.maxBatches ?? Math.ceil(todo.length / MAX_ENRICH_BATCH)
  for (let i = 0, b = 0; i < todo.length && b < maxBatches; i += MAX_ENRICH_BATCH, b++) {
    if (!opts.ignoreBudget && !dry) {
      const remaining = await apiBudgetRemaining().catch(() => 0)
      if (remaining < 1) { stats.deferred += todo.length - i; break }
    }
    const batch = todo.slice(i, i + MAX_ENRICH_BATCH)
    try {
      const { firmographics, signals, usage } = await enrichBatch(batch, { dry })
      stats.apiCalls++
      stats.inputTokens += usage.input
      stats.outputTokens += usage.output
      stats.researched += firmographics.length
      stats.signalsFound += signals.length
      if (!dry) await saveEnrichment(firmographics, signals)
    } catch (e) {
      stats.errors.push(e instanceof Error ? e.message : String(e))
      stats.deferred += batch.length
    }
  }
  return stats
}
