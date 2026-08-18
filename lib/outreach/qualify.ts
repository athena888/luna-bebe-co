import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { INDUSTRIES, QUALIFY_CACHE_DAYS } from './targeting.ts'
import { apiBudgetRemaining, logApiCall } from './api-ledger.ts'

// PROSPECT QUALIFICATION — the one model-judged step in the pipeline.
// ONE call per scraped batch (≤50 prospects, never per prospect), model
// claude-haiku-4-5-20251001, strict JSON via structured outputs. Results are
// cached by company domain for 180 days (qualification_cache, §51) and a
// domain is never re-classified inside that window. When the scrape source
// already pins the industry (single-industry directory search), the call is
// skipped entirely and the prospect is tagged from source, with a
// deterministic title→persona keyword check standing in for persona_match.

const MODEL = 'claude-haiku-4-5-20251001'
export const MAX_QUALIFY_BATCH = 50

export interface QualifyInput {
  id: string
  name: string
  title: string
  company: string
  domain: string
  company_description?: string | null   // truncated to 300 chars before the call
  source_url?: string | null
}

export interface QualifyResult {
  id: string
  domain: string
  qualified: boolean
  industry_key: string   // a key from INDUSTRIES, or 'none'
  persona_match: boolean
  reason: string
  via: 'cache' | 'source' | 'api'
}

export interface QualifyStats {
  total: number
  cacheHits: number
  sourceTagged: number
  apiClassified: number
  deferred: number        // left unclassified (budget spent / API error) — retried next run
  apiCalls: number
  inputTokens: number
  outputTokens: number
}

// Deterministic persona check for source-tagged prospects (no model call).
const PERSONA_KEYWORDS: Record<string, string[]> = {
  tech_50_500: ['people', 'hr', 'human resources', 'talent', 'culture', 'workplace', 'employee experience', 'office manager'],
  law_firms: ['office manager', 'hr', 'human resources', 'administrator', 'operations', 'coo'],
  accounting_consulting: ['office manager', 'hr', 'human resources', 'operations', 'administrator'],
  wealth_mgmt: ['advisor', 'practice manager', 'wealth', 'financial', 'principal', 'partner', 'client'],
  biotech_pharma: ['people', 'hr', 'human resources', 'talent', 'culture'],
  agencies: ['operations', 'ops', 'studio manager', 'office manager', 'managing director'],
  luxury_realestate: ['broker', 'team lead', 'realtor', 'agent', 'founder', 'principal'],
  corp_gifting_agencies: ['sourcing', 'procurement', 'merchandis', 'buyer', 'product', 'partnerships'],
  birth_professionals: ['owner', 'founder', 'doula', 'midwife', 'director', 'ob', 'practice'],
  hospital_hr: ['hr', 'human resources', 'benefits', 'total rewards', 'employee'],
}

export function personaMatchesTitle(industryKey: string, title: string): boolean {
  const t = title.toLowerCase()
  return (PERSONA_KEYWORDS[industryKey] ?? []).some(k => t.includes(k))
}

// Strict output schema — the API guarantees the response parses to this shape,
// so there is no prose to strip and no regex extraction.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          qualified: { type: 'boolean' },
          industry_key: { type: 'string', enum: [...Object.keys(INDUSTRIES), 'none'] },
          persona_match: { type: 'boolean' },
          reason: { type: 'string', description: 'Under 10 words.' },
        },
        required: ['id', 'qualified', 'industry_key', 'persona_match', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const

interface CacheRow {
  domain: string
  qualified: boolean
  industry_key: string
  persona_match: boolean
  reason: string
  classified_at: string
}

async function loadCache(domains: string[]): Promise<Map<string, CacheRow>> {
  const fresh = new Map<string, CacheRow>()
  if (!domains.length) return fresh
  const cutoff = new Date(Date.now() - QUALIFY_CACHE_DAYS * 86_400_000).toISOString()
  try {
    const { data } = await supabaseAdmin.from('qualification_cache')
      .select('*').in('domain', domains).gte('classified_at', cutoff)
    for (const r of (data ?? []) as CacheRow[]) fresh.set(r.domain, r)
  } catch { /* cache unavailable — treated as empty, results still cached on write */ }
  return fresh
}

async function saveCache(rows: Omit<CacheRow, 'classified_at'>[]): Promise<void> {
  if (!rows.length) return
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('qualification_cache')
    .upsert(rows.map(r => ({ ...r, classified_at: now })), { onConflict: 'domain' })
  if (error) console.error('qualification_cache upsert failed:', error.message)
}

/**
 * Qualify one scraped batch. `sourceIndustry` = the industry key the scrape
 * was unambiguously scoped to (single-industry directory/search) — those
 * prospects skip the API entirely.
 */
export async function qualifyProspects(
  batch: QualifyInput[],
  opts: { sourceIndustry?: string | null; dry?: boolean } = {},
): Promise<{ results: QualifyResult[]; stats: QualifyStats }> {
  const stats: QualifyStats = {
    total: batch.length, cacheHits: 0, sourceTagged: 0, apiClassified: 0,
    deferred: 0, apiCalls: 0, inputTokens: 0, outputTokens: 0,
  }
  const results: QualifyResult[] = []
  const toCache: Omit<CacheRow, 'classified_at'>[] = []

  const domains = [...new Set(batch.map(p => p.domain.toLowerCase()))]
  const cache = await loadCache(domains)

  const needsCall: QualifyInput[] = []
  for (const p of batch) {
    const dom = p.domain.toLowerCase()
    const hit = cache.get(dom)
    if (hit) {
      // Never re-classify a cached domain — persona still checked per person.
      results.push({
        id: p.id, domain: dom, qualified: hit.qualified, industry_key: hit.industry_key,
        persona_match: hit.industry_key !== 'none' && personaMatchesTitle(hit.industry_key, p.title),
        reason: hit.reason, via: 'cache',
      })
      stats.cacheHits++
    } else if (opts.sourceIndustry && INDUSTRIES[opts.sourceIndustry]) {
      const persona = personaMatchesTitle(opts.sourceIndustry, p.title)
      results.push({
        id: p.id, domain: dom, qualified: true, industry_key: opts.sourceIndustry,
        persona_match: persona, reason: 'tagged from scrape source', via: 'source',
      })
      toCache.push({ domain: dom, qualified: true, industry_key: opts.sourceIndustry, persona_match: persona, reason: 'tagged from scrape source' })
      stats.sourceTagged++
    } else {
      needsCall.push(p)
    }
  }

  if (needsCall.length) {
    const slice = needsCall.slice(0, MAX_QUALIFY_BATCH)   // one call per batch, hard 50
    stats.deferred += needsCall.length - slice.length

    // Dry runs are manual and supervised — they bypass the daily budget gate
    // (which fails closed on DB errors) but still report real token usage.
    if (!opts.dry && (await apiBudgetRemaining()) < 1) {
      stats.deferred += slice.length   // budget spent — batch queues for next run
    } else {
      const payload = slice.map(p => ({
        id: p.id,
        name: p.name,
        title: p.title,
        company: p.company,
        company_description: (p.company_description ?? '').slice(0, 300),
        source_url: p.source_url ?? null,
      }))
      const industryList = Object.values(INDUSTRIES)
        .map(i => `- ${i.key}: ${i.label} — target persona: ${i.persona}`).join('\n')

      try {
        const res = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 4000,
          output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
          system: `You qualify B2B prospects for Petite Lavande (organic newborn & postpartum gift boxes sold to companies as employee/client gifts). For each prospect decide:
- qualified: is this a real operating company that plausibly fits one of our target industries AND has roughly 100–1000 employees? Disqualify companies that are clearly smaller than ~100 people or clearly enterprise-scale (1000+). When headcount is genuinely unknown, judge from signals (office count, leadership team size, "Fortune 500" style language) and disqualify only if the evidence points outside the band.
- industry_key: the best-matching key below, or "none".
- persona_match: does the person's title match that industry's target persona AND suggest budget authority for a gifting program (Head/Director/VP/Manager of People, HR, Ops, Marketing, Partner, Principal, Owner)? An intern or individual contributor is not a match.
- reason: under 10 words.

Industries:
${industryList}`,
          messages: [{ role: 'user', content: JSON.stringify(payload) }],
        })

        stats.apiCalls = 1
        stats.inputTokens = res.usage.input_tokens
        stats.outputTokens = res.usage.output_tokens
        if (!opts.dry) {
          await logApiCall({
            purpose: 'qualification', model: MODEL, batch_size: slice.length,
            input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens, ok: true,
          })
        }

        const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
        const parsed = JSON.parse(text) as { results: Array<{ id: string; qualified: boolean; industry_key: string; persona_match: boolean; reason: string }> }
        const byId = new Map(parsed.results.map(r => [r.id, r]))

        for (const p of slice) {
          const r = byId.get(p.id)
          if (!r) { stats.deferred++; continue }
          const dom = p.domain.toLowerCase()
          results.push({ id: p.id, domain: dom, qualified: r.qualified, industry_key: r.industry_key, persona_match: r.persona_match, reason: r.reason, via: 'api' })
          toCache.push({ domain: dom, qualified: r.qualified, industry_key: r.industry_key, persona_match: r.persona_match, reason: r.reason })
          stats.apiClassified++
        }
      } catch (e) {
        // Queue the whole batch for the next run; already-qualified prospects
        // downstream are unaffected.
        stats.deferred += slice.length
        if (!opts.dry) {
          await logApiCall({
            purpose: 'qualification', model: MODEL, batch_size: slice.length,
            input_tokens: 0, output_tokens: 0, ok: false, error: e instanceof Error ? e.message : String(e),
          })
        }
        console.error('qualification call failed (batch queued for next run):', e)
      }
    }
  }

  if (!opts.dry) await saveCache(toCache)
  return { results, stats }
}
