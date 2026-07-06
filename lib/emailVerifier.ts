import { getConfig, setConfig } from './pipeline/config'

// Multi-provider email verification cascade. One adapter per platform, each
// keyed by its own env var; the first provider with an API key AND monthly
// quota remaining wins, with automatic failover on errors. Quota counters live
// in outreach_config.verifier and reset when the calendar month rolls over.
// If every provider is exhausted/unavailable the caller must park the prospect
// as 'awaiting_verification' — an unverified address never reaches the queue.

export type Verdict = 'deliverable' | 'risky' | 'undeliverable' | 'unknown'

export interface VerifyOutcome {
  verdict: Verdict
  score: number | null          // 0..100 where the provider gives one
  provider: string
}

export interface VerifierAdapter {
  name: string
  envVar: string
  verify(email: string, apiKey: string): Promise<{ verdict: Verdict; score: number | null }>
}

const asScore = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

async function getJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

const hunter: VerifierAdapter = {
  name: 'hunter',
  envVar: 'HUNTER_API_KEY',
  async verify(email, apiKey) {
    const j = await getJson(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`)
    const d = (j.data ?? {}) as Record<string, unknown>
    const status = String(d.status ?? '')
    const score = asScore(d.score)
    if (status === 'valid') return { verdict: 'deliverable', score }
    if (status === 'invalid' || status === 'disposable') return { verdict: 'undeliverable', score }
    if (status === 'accept_all' || status === 'webmail') return { verdict: 'risky', score }
    return { verdict: 'unknown', score }
  },
}

const zerobounce: VerifierAdapter = {
  name: 'zerobounce',
  envVar: 'ZEROBOUNCE_API_KEY',
  async verify(email, apiKey) {
    const j = await getJson(`https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`)
    const status = String(j.status ?? '')
    if (status === 'valid') return { verdict: 'deliverable', score: 95 }
    if (['invalid', 'spamtrap', 'abuse', 'do_not_mail'].includes(status)) return { verdict: 'undeliverable', score: 0 }
    if (status === 'catch-all') return { verdict: 'risky', score: 50 }
    return { verdict: 'unknown', score: null }
  },
}

const apollo: VerifierAdapter = {
  name: 'apollo',
  envVar: 'APOLLO_API_KEY',
  async verify(email, apiKey) {
    const j = await getJson('https://api.apollo.io/api/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ email }),
    })
    const p = (j.person ?? {}) as Record<string, unknown>
    const status = String(p.email_status ?? '')
    if (status === 'verified') return { verdict: 'deliverable', score: 90 }
    if (status === 'unverified' || status === 'extrapolated') return { verdict: 'risky', score: 50 }
    return { verdict: 'unknown', score: null }
  },
}

const neverbounce: VerifierAdapter = {
  name: 'neverbounce',
  envVar: 'NEVERBOUNCE_API_KEY',
  async verify(email, apiKey) {
    const j = await getJson(`https://api.neverbounce.com/v4/single/check?key=${apiKey}&email=${encodeURIComponent(email)}`)
    const result = String(j.result ?? '')
    if (result === 'valid') return { verdict: 'deliverable', score: 95 }
    if (result === 'invalid' || result === 'disposable') return { verdict: 'undeliverable', score: 0 }
    if (result === 'catchall') return { verdict: 'risky', score: 50 }
    return { verdict: 'unknown', score: null }
  },
}

const millionverifier: VerifierAdapter = {
  name: 'millionverifier',
  envVar: 'MILLIONVERIFIER_API_KEY',
  async verify(email, apiKey) {
    const j = await getJson(`https://api.millionverifier.com/api/v3/?api=${apiKey}&email=${encodeURIComponent(email)}`)
    const result = String(j.result ?? j.quality ?? '')
    if (result === 'ok' || result === 'good') return { verdict: 'deliverable', score: asScore(j.quality_score) ?? 90 }
    if (result === 'invalid' || result === 'disposable') return { verdict: 'undeliverable', score: 0 }
    if (result === 'catch_all' || result === 'risky') return { verdict: 'risky', score: 50 }
    return { verdict: 'unknown', score: null }
  },
}

// Email Awesome is ASYNC: POST creates a validation, then we poll by id until
// COMPLETE (observed ~25–45s). That latency is why it sits second in the
// cascade behind Hunter — plentiful (1,000/mo renews) but slow. A timeout or
// FAILED throws, which fails over to the next provider.
const emailawesome: VerifierAdapter = {
  name: 'emailawesome',
  envVar: 'EMAILAWESOME_API_KEY',
  async verify(email, apiKey) {
    const base = 'https://api.emailawesome.com/api/validations/email_validation'
    const created = await getJson(base, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const id = String(created.id ?? '')
    if (!id) throw new Error('emailawesome: no validation id')
    for (let i = 0; i < 15; i++) {                       // ~60s ceiling
      await new Promise(r => setTimeout(r, 4000))
      const d = await getJson(`${base}/${id}`, { headers: { 'x-api-key': apiKey } })
      const status = String(d.status ?? '')
      if (status === 'FAILED') throw new Error('emailawesome: validation failed')
      if (status !== 'COMPLETE') continue
      const v = String(d.email_address_status ?? '')
      if (v === 'VALID') return { verdict: 'deliverable', score: 95 }
      if (v === 'INVALID') return { verdict: 'undeliverable', score: 0 }
      if (v === 'CATCH_ALL') return { verdict: 'risky', score: 50 }
      return { verdict: 'unknown', score: null }
    }
    throw new Error('emailawesome: validation timed out')
  },
}

export const ADAPTERS: VerifierAdapter[] = [hunter, emailawesome, zerobounce, apollo, neverbounce, millionverifier]

// ── Quota state (outreach_config.verifier) ───────────────────────────────────
interface ProviderState { monthly_quota: number; used: number; cycle_start: string | null }
interface VerifierConfig { cascade: string[]; providers: Record<string, ProviderState> }

const monthOf = (iso: string | null) => (iso ?? '').slice(0, 7)

async function loadVerifierConfig(): Promise<VerifierConfig> {
  const cfg = (await getConfig<VerifierConfig>('verifier')) ?? { cascade: ADAPTERS.map(a => a.name), providers: {} }
  // Roll counters when a provider's cycle month has passed.
  const nowIso = new Date().toISOString()
  let dirty = false
  for (const name of Object.keys(cfg.providers ?? {})) {
    const p = cfg.providers[name]
    if (!p.cycle_start || monthOf(p.cycle_start) !== monthOf(nowIso)) {
      cfg.providers[name] = { ...p, used: 0, cycle_start: nowIso }
      dirty = true
    }
  }
  if (dirty) await setConfig('verifier', cfg)
  return cfg
}

function stateFor(cfg: VerifierConfig, name: string): ProviderState {
  return cfg.providers?.[name] ?? { monthly_quota: 0, used: 0, cycle_start: null }
}

/**
 * Verify one address through the cascade. Returns null when EVERY provider is
 * unavailable (no key / quota exhausted / all errored) — the caller must park
 * the prospect, never queue it.
 */
export async function verifyEmail(email: string): Promise<VerifyOutcome | null> {
  const cfg = await loadVerifierConfig()
  const order = (cfg.cascade?.length ? cfg.cascade : ADAPTERS.map(a => a.name))
    .map(n => ADAPTERS.find(a => a.name === n))
    .filter((a): a is VerifierAdapter => Boolean(a))

  for (const adapter of order) {
    const apiKey = (process.env[adapter.envVar] ?? '').trim()
    if (!apiKey) continue
    const st = stateFor(cfg, adapter.name)
    if (st.monthly_quota > 0 && st.used >= st.monthly_quota) continue
    try {
      const r = await adapter.verify(email, apiKey)
      cfg.providers[adapter.name] = { ...st, used: st.used + 1, cycle_start: st.cycle_start ?? new Date().toISOString() }
      await setConfig('verifier', cfg)
      return { verdict: r.verdict, score: r.score, provider: adapter.name }
    } catch (e) {
      console.error(`verifier ${adapter.name} failed for ${email}:`, e)
      // fall through to the next provider
    }
  }
  return null
}

// ── Status for the review-UI chip ────────────────────────────────────────────
export interface QuotaStatus {
  providers: { name: string; configured: boolean; quota: number; used: number; remaining: number }[]
  totalRemaining: number
  /** True when, at the current pace, the combined quota runs out before month-end. */
  paceWarning: boolean
}

export async function quotaStatus(): Promise<QuotaStatus> {
  const cfg = await loadVerifierConfig()
  const providers = ADAPTERS.map(a => {
    const st = stateFor(cfg, a.name)
    const configured = Boolean((process.env[a.envVar] ?? '').trim())
    const remaining = configured ? Math.max(0, st.monthly_quota - st.used) : 0
    return { name: a.name, configured, quota: st.monthly_quota, used: st.used, remaining }
  })
  const totalRemaining = providers.reduce((s, p) => s + p.remaining, 0)
  const totalUsed = providers.filter(p => p.configured).reduce((s, p) => s + p.used, 0)

  const now = new Date()
  const dayOfMonth = now.getUTCDate()
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate()
  const dailyPace = totalUsed / Math.max(1, dayOfMonth)
  const paceWarning = totalUsed > 0 && dailyPace * (daysInMonth - dayOfMonth) > totalRemaining

  return { providers, totalRemaining, paceWarning }
}
