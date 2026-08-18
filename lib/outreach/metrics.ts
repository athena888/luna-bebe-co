import { supabaseAdmin } from '../supabase'
import { sendEmail } from '../gmail'
import { getConfig, setConfig } from '../pipeline/config'
import { ROTATION, ROTATION_EPOCH } from './targeting'
import { apiUsageSince } from './api-ledger'

// Per-combo metrics and the weekly outreach summary email. Everything here is
// plain SQL aggregation — no model calls. Drafts made by the v2 drafter carry
// combo_key / track_used / subject_variant, which is all the tagging needed.

export interface ComboMetrics {
  comboKey: string
  sent: number
  bounces: number
  replies: number
  sampleRequests: number
  byVariant: Record<string, { sent: number; replies: number }>
  byTrack: Record<string, { sent: number; replies: number }>
  replyRate: number
}

interface DraftRow {
  combo_key: string | null
  track_used: string | null
  subject_variant: string | null
  prospect: { status: string; reply_triage: string | null } | null
  sends: Array<{ status: string; sent_at: string | null }> | null
}

/** Aggregate per-combo performance over the last `days` days (by send date). */
export async function comboMetrics(days: number): Promise<ComboMetrics[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data } = await supabaseAdmin.from('email_drafts')
    .select('combo_key, track_used, subject_variant, prospect:prospects!inner(status, reply_triage), sends(status, sent_at)')
    .not('combo_key', 'is', null)
  const byCombo = new Map<string, ComboMetrics>()

  for (const d of ((data ?? []) as unknown as DraftRow[])) {
    const sent = (d.sends ?? []).some(s => s.status === 'sent' && (s.sent_at ?? '') >= since)
    if (!sent || !d.combo_key) continue
    const m = byCombo.get(d.combo_key) ?? {
      comboKey: d.combo_key, sent: 0, bounces: 0, replies: 0, sampleRequests: 0,
      byVariant: {}, byTrack: {}, replyRate: 0,
    }
    m.sent++
    const status = d.prospect?.status
    const replied = status === 'replied'
    if (status === 'bounced') m.bounces++
    if (replied) m.replies++
    if (d.prospect?.reply_triage === 'sample_request') m.sampleRequests++
    const v = d.subject_variant ?? '?'
    const t = d.track_used ?? '?'
    ;(m.byVariant[v] ??= { sent: 0, replies: 0 }).sent++
    if (replied) m.byVariant[v].replies++
    ;(m.byTrack[t] ??= { sent: 0, replies: 0 }).sent++
    if (replied) m.byTrack[t].replies++
    byCombo.set(d.combo_key, m)
  }
  for (const m of byCombo.values()) m.replyRate = m.sent ? m.replies / m.sent : 0
  return [...byCombo.values()].sort((a, b) => b.sent - a.sent)
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

/** Plain-text weekly summary: per-combo + per-variant performance, API usage
 *  and estimated cost, and — after each full rotation — the 3 worst combos by
 *  reply rate (candidates for replacement in ROTATION). */
export async function buildWeeklySummary(): Promise<string> {
  const [week, rotationWindow, api] = await Promise.all([
    comboMetrics(7),
    comboMetrics(ROTATION.length * 7),
    apiUsageSince(7),
  ])

  const lines: string[] = []
  lines.push('PETITE LAVANDE — B2B OUTREACH WEEKLY SUMMARY')
  lines.push(new Date().toISOString().slice(0, 10))
  lines.push('')
  lines.push('── This week, per combo ──')
  if (!week.length) lines.push('(no v2 sends this week)')
  for (const m of week) {
    lines.push(`${m.comboKey}: ${m.sent} sent · ${m.bounces} bounced · ${m.replies} replies (${pct(m.replyRate)}) · ${m.sampleRequests} sample requests`)
    for (const [v, s] of Object.entries(m.byVariant)) {
      lines.push(`   subject ${v}: ${s.sent} sent, ${s.replies} replies (${s.sent ? pct(s.replies / s.sent) : '—'})`)
    }
    for (const [t, s] of Object.entries(m.byTrack)) {
      lines.push(`   track ${t}: ${s.sent} sent, ${s.replies} replies`)
    }
  }
  lines.push('')
  lines.push('── API usage (7 days) ──')
  lines.push(`${api.calls} calls · est. $${api.totalCostUsd.toFixed(4)} total (~$${(api.totalCostUsd / 7).toFixed(4)}/day, target <$0.05/day)`)
  for (const [purpose, p] of Object.entries(api.byPurpose)) {
    lines.push(`   ${purpose}: ${p.calls} calls, ${p.inputTokens.toLocaleString()} in / ${p.outputTokens.toLocaleString()} out tokens, $${p.costUsd.toFixed(4)}`)
  }

  // End-of-rotation review: flag the 3 worst combos by reply rate.
  const epoch = new Date(ROTATION_EPOCH + 'T00:00:00Z').getTime()
  const weeksSinceEpoch = Math.floor((Date.now() - epoch) / (7 * 86_400_000))
  if (weeksSinceEpoch > 0 && weeksSinceEpoch % ROTATION.length === 0 && rotationWindow.length) {
    const worst = [...rotationWindow]
      .filter(m => m.sent >= 20)   // need a real sample before judging a combo
      .sort((a, b) => a.replyRate - b.replyRate).slice(0, 3)
    lines.push('')
    lines.push('── Rotation complete — replacement candidates (worst reply rates) ──')
    for (const m of worst) lines.push(`${m.comboKey}: ${pct(m.replyRate)} (${m.replies}/${m.sent})`)
    lines.push('Swap these in ROTATION (lib/outreach/targeting.ts) for new city×industry combos.')
  }
  return lines.join('\n')
}

/** Friday-only, once: email the weekly summary to ADMIN_EMAIL. Called from the
 *  daily draft cron; a config marker prevents double sends. */
export async function maybeSendWeeklySummary(opts: { dry?: boolean } = {}): Promise<{ sent: boolean; why?: string }> {
  if (new Date().getUTCDay() !== 5) return { sent: false, why: 'not Friday' }
  const today = new Date().toISOString().slice(0, 10)
  const marker = await getConfig<{ last?: string }>('weekly_outreach_summary')
  if (marker?.last === today) return { sent: false, why: 'already sent today' }
  const to = process.env.ADMIN_EMAIL
  if (!to) return { sent: false, why: 'ADMIN_EMAIL not set' }

  const text = await buildWeeklySummary()
  if (opts.dry) return { sent: false, why: 'dry run' }
  await sendEmail({ to, subject: `Outreach weekly summary — ${today}`, text })
  await setConfig('weekly_outreach_summary', { last: today })
  return { sent: true }
}
