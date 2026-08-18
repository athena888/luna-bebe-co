import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { getConfig, bumpDailyStats } from '../pipeline/config.ts'
import { addSuppression } from '../outreach.ts'
import { apiBudgetRemaining, logApiCall } from './api-ledger.ts'

// OPTIONAL reply triage — config flag targeting_v2.reply_triage_enabled,
// default OFF. When on: one daily Haiku batch classifying prospect replies
// into {sample_request, question, not_interested, unsubscribe, other}.
// Ledgered against the 3-call/day cap like every other model call.
// (The inbound webhook's per-email classifier is a separate, pre-existing
// system — this batch triage only annotates outreach replies for metrics.)

const MODEL = 'claude-haiku-4-5-20251001'
export type Triage = 'sample_request' | 'question' | 'not_interested' | 'unsubscribe' | 'other'

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          triage: { type: 'string', enum: ['sample_request', 'question', 'not_interested', 'unsubscribe', 'other'] },
        },
        required: ['id', 'triage'],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
} as const

export interface TriageStats {
  enabled: boolean
  triaged: number
  deferred: number
  byTriage: Record<string, number>
  inputTokens: number
  outputTokens: number
  dry: boolean
}

export async function runReplyTriage(opts: { dry?: boolean } = {}): Promise<TriageStats> {
  const dry = Boolean(opts.dry)
  const stats: TriageStats = { enabled: false, triaged: 0, deferred: 0, byTriage: {}, inputTokens: 0, outputTokens: 0, dry }

  const cfg = await getConfig<{ reply_triage_enabled?: boolean }>('targeting_v2')
  if (!cfg?.reply_triage_enabled) return stats   // default OFF
  stats.enabled = true

  // Un-triaged replies (any age — a backlog drains at ≤50/day).
  const { data: replied } = await supabaseAdmin.from('prospects')
    .select('id, email, company')
    .eq('status', 'replied').is('reply_triage', null).limit(50)
  const prospects = (replied ?? []) as { id: string; email: string | null; company: string }[]
  if (!prospects.length) return stats

  if ((await apiBudgetRemaining()) < 1) { stats.deferred = prospects.length; return stats }

  // Latest inbound snippet per prospect, via the mirrored contact.
  const emails = prospects.map(p => (p.email ?? '').toLowerCase()).filter(Boolean)
  const { data: contactRows } = await supabaseAdmin.from('contacts').select('id, email').in('email', emails)
  const contactByEmail = new Map((contactRows ?? []).map((c: { id: string; email: string }) => [c.email.toLowerCase(), c.id]))
  const contactIds = [...contactByEmail.values()]
  const { data: touchRows } = contactIds.length
    ? await supabaseAdmin.from('touches')
        .select('contact_id, snippet, created_at')
        .in('contact_id', contactIds).eq('direction', 'inbound')
        .order('created_at', { ascending: false }).limit(200)
    : { data: [] }
  const snippetByContact = new Map<string, string>()
  for (const t of (touchRows ?? []) as { contact_id: string; snippet: string | null }[]) {
    if (!snippetByContact.has(t.contact_id)) snippetByContact.set(t.contact_id, t.snippet ?? '')
  }

  const payload = prospects.map(p => ({
    id: p.id,
    company: p.company,
    reply: (snippetByContact.get(contactByEmail.get((p.email ?? '').toLowerCase()) ?? '') ?? '').slice(0, 500),
  })).filter(p => p.reply)
  if (!payload.length) return stats

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      system: `You triage replies to Petite Lavande's B2B outreach (organic newborn gift boxes sold to companies). Classify each reply:
- sample_request: they want a sample box, line sheet, lookbook, or to talk/buy
- question: they asked something and need an answer
- not_interested: a decline, however polite
- unsubscribe: any request to stop emailing
- other: auto-replies, out-of-office, ambiguous`,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
    })

    stats.inputTokens = res.usage.input_tokens
    stats.outputTokens = res.usage.output_tokens
    if (!dry) {
      await logApiCall({
        purpose: 'reply_triage', model: MODEL, batch_size: payload.length,
        input_tokens: res.usage.input_tokens, output_tokens: res.usage.output_tokens, ok: true,
      })
    }

    const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
    const parsed = JSON.parse(text) as { results: Array<{ id: string; triage: Triage }> }
    const prospectById = new Map(prospects.map(p => [p.id, p]))

    for (const r of parsed.results) {
      const p = prospectById.get(r.id)
      if (!p) continue
      stats.byTriage[r.triage] = (stats.byTriage[r.triage] ?? 0) + 1
      if (dry) { stats.triaged++; continue }
      await supabaseAdmin.from('prospects')
        .update({ reply_triage: r.triage, updated_at: new Date().toISOString() }).eq('id', r.id)
      // Unsubscribes suppress immediately and permanently (belt-and-suspenders
      // on top of the inbound webhook's STOP regex).
      if (r.triage === 'unsubscribe' && p.email) {
        await addSuppression(p.email, 'stop')
        await supabaseAdmin.from('prospects')
          .update({ status: 'suppressed', updated_at: new Date().toISOString() }).eq('id', r.id)
      }
      stats.triaged++
    }
    if (!dry && stats.byTriage.sample_request) {
      await bumpDailyStats({ sample_requests: stats.byTriage.sample_request })
    }
  } catch (e) {
    stats.deferred = payload.length
    if (!dry) {
      await logApiCall({
        purpose: 'reply_triage', model: MODEL, batch_size: payload.length,
        input_tokens: 0, output_tokens: 0, ok: false, error: e instanceof Error ? e.message : String(e),
      })
    }
    console.error('reply triage failed (batch retried next run):', e)
  }
  return stats
}
