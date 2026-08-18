import { resolveMx } from 'node:dns/promises'
import { supabaseAdmin } from '../supabase.ts'
import { sendEmail, gmailSender } from '../gmail.ts'
import { withFooter } from '../outreach-templates.ts'
import { getSuppressedSet, emailDomain } from '../outreach.ts'
import { getDailySendCap, getConfig, bumpDailyStats, pipelineEnabled } from './config.ts'

// Pipeline queue drainer. THE structural guarantee lives here: the only query
// that feeds sendEmail() inner-joins email_drafts with status
// 'approved_by_user' — there is no code path that sends a pending, rejected or
// superseded draft. The daily cap is enforced from today's outbound `touches`
// count (shared with campaign sends), independent of anything the UI does.
// Suppression + dedup + MX are re-checked per send, again independent of the
// checks made at discovery time.

export interface DrainStats {
  capRemaining: number
  sent: number
  failed: number
  skipped: { to: string; why: string }[]
  dry: boolean
  paused?: boolean
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
function jitterMs(): number {
  const min = Number(process.env.OUTREACH_GAP_MIN_MS) || 4000
  const max = Number(process.env.OUTREACH_GAP_MAX_MS) || 12000
  return min + Math.floor(Math.random() * Math.max(0, max - min))
}
async function hasMx(domain: string): Promise<boolean> {
  try { return (await resolveMx(domain)).length > 0 } catch { return false }
}

/**
 * Outbound emails already sent today — the cap is global.
 *
 * Counts ACTUAL send rows, not `touches`. The audit found the touches ledger
 * had inflated to 94 rows against 75 real sends (19 duplicate bookkeeping rows
 * on one day). Because the cap read `touches`, those duplicates silently ate
 * the daily allowance and throttled real sending. `sends` is the authoritative
 * record of a message actually handed to Gmail.
 */
async function sentTodayCount(): Promise<number> {
  const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
  const { count } = await supabaseAdmin.from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'sent').gte('sent_at', since)
  return count ?? 0
}

interface QueuedRow {
  id: string
  draft: {
    id: string; subject: string; body: string; status: string; is_followup: boolean
    prospect: { id: string; email: string | null; company: string; person_name: string | null; status: string; email_grade: string | null; channel: string | null }
  }
}

/** Press pitches already sent today (press has its own sub-cap). */
async function pressSentTodayCount(): Promise<number> {
  const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
  const { data } = await supabaseAdmin.from('sends')
    .select('id, draft:email_drafts!inner(prospect:prospects!inner(channel))')
    .eq('status', 'sent').gte('sent_at', since)
  return ((data ?? []) as unknown as { draft: { prospect: { channel: string | null } } }[])
    .filter(r => r.draft?.prospect?.channel === 'press').length
}

async function pressDailyCap(): Promise<number> {
  const env = Number(process.env.PRESS_DAILY_CAP)
  if (Number.isFinite(env) && env > 0) return Math.floor(env)
  const cfg = await getConfig<{ daily_cap?: number }>('press').catch(() => null)
  const n = Number(cfg?.daily_cap)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5
}

export async function drainPipelineQueue(opts: { dry?: boolean; timeBudgetMs?: number; startedAt?: number } = {}): Promise<DrainStats> {
  const started = opts.startedAt ?? Date.now()
  const budget = opts.timeBudgetMs ?? 280_000
  const dry = Boolean(opts.dry)

  // Paused from Morning Review → even already-approved drafts hold (queued).
  if (!(await pipelineEnabled())) {
    return { capRemaining: 0, sent: 0, failed: 0, skipped: [], dry, paused: true }
  }

  // Second, independent gate. pipeline_enabled controls the whole machine
  // (discovery, drafting, sending); live_sends_enabled controls SENDING alone,
  // so discovery and qualification can run at full speed while outbound stays
  // dark. Defaults to FALSE: the flag must be set true explicitly, because the
  // failure mode here is irreversible — an email cannot be unsent.
  const v3 = await getConfig<{ live_sends_enabled?: boolean }>('quality_v3')
  if (v3 && v3.live_sends_enabled !== true) {
    return { capRemaining: 0, sent: 0, failed: 0, skipped: [], dry, paused: true }
  }

  const cap = await getDailySendCap()
  const capRemaining = Math.max(0, cap - (await sentTodayCount()))
  const stats: DrainStats = { capRemaining, sent: 0, failed: 0, skipped: [], dry }
  if (capRemaining === 0) return stats

  // Approval enforced structurally: inner join on approved_by_user.
  const { data } = await supabaseAdmin.from('sends')
    .select('id, draft:email_drafts!inner(id, subject, body, status, is_followup, prospect:prospects!inner(id, email, company, person_name, status, email_grade, channel))')
    .eq('status', 'queued')
    .eq('email_drafts.status', 'approved_by_user')
    .order('created_at', { ascending: true })
    .limit(capRemaining + 10)   // headroom so press-capped skips don't starve corporate

  const rows = ((data ?? []) as unknown as QueuedRow[]).filter(r => r.draft?.prospect)
  if (!rows.length) return stats

  const suppressed = await getSuppressedSet()
  // Press sub-cap: press + corporate share the global Gmail ceiling above, but
  // press alone never exceeds its own daily cap (default 5).
  const pressCap = await pressDailyCap()
  let pressSent = await pressSentTodayCount()
  let pressSentThisDrain = 0

  // Belt-and-suspenders duplicate guard: never hit the same address twice in a
  // day, regardless of how the drafts came to exist. Seeded with everything
  // already sent today, then updated as this drain sends.
  const sentToday = new Set<string>()
  {
    const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
    const { data: todays } = await supabaseAdmin.from('sends')
      .select('id, draft:email_drafts!inner(prospect:prospects!inner(email))')
      .eq('status', 'sent').gte('sent_at', since)
    for (const r of (todays ?? []) as unknown as { draft: { prospect: { email: string | null } } }[]) {
      const e = r.draft?.prospect?.email?.toLowerCase()
      if (e) sentToday.add(e)
    }
  }

  for (let i = 0; i < rows.length; i++) {
    if (Date.now() - started > budget) break
    if (stats.sent >= capRemaining) break
    const r = rows[i]
    const p = r.draft.prospect
    const to = (p.email ?? '').trim().toLowerCase()

    // Send-time re-checks (discovery-time checks are NOT trusted here).
    const skip = async (why: string, terminal = true) => {
      stats.skipped.push({ to: to || p.company, why })
      if (!dry && terminal) await supabaseAdmin.from('sends').update({ status: 'failed' }).eq('id', r.id)
    }
    const isPress = p.channel === 'press'
    if (!to) { await skip('no email'); continue }
    if (!(p.email_grade === 'A' || p.email_grade === 'B')) { await skip('grade not A/B'); continue }
    if (suppressed.has(to)) { await skip('suppressed'); continue }
    if (p.status === 'replied' || p.status === 'bounced' || p.status === 'suppressed') { await skip(`prospect ${p.status}`); continue }
    // Press sub-cap reached → leave the row QUEUED for tomorrow's drain.
    if (isPress && pressSent >= pressCap) { await skip('press daily cap reached (stays queued)', false); continue }
    // Same address already contacted today → hold until tomorrow, never double-send.
    if (sentToday.has(to)) { await skip('already emailed today (stays queued)', false); continue }
    if (!(await hasMx(emailDomain(to)))) { await skip('no MX record (would bounce)'); continue }

    const body = withFooter(r.draft.body, to)   // CAN-SPAM footer at send time, never in the draft
    if (dry) { stats.sent++; if (isPress) pressSent++; sentToday.add(to); continue }

    // ATOMIC CLAIM — the fix for concurrent double-sends.
    //
    // On 2026-08-17 nineteen prospects received the identical email twice,
    // 4–15 seconds apart, with distinct Gmail message ids. Two drain runs
    // overlapped: each seeded its own in-memory `sentToday` set at start, so
    // neither could see the other's sends. An in-process guard cannot span
    // processes; only the database can arbitrate.
    //
    // Flipping queued -> sending is atomic, so exactly one runner wins the row.
    // A loser gets zero rows back and skips without sending.
    const { data: claimed } = await supabaseAdmin.from('sends')
      .update({ status: 'sending' })
      .eq('id', r.id).eq('status', 'queued')
      .select('id')
    if (!claimed || claimed.length === 0) {
      await skip('claimed by a concurrent drain (stays queued)', false)
      continue
    }

    try {
      const res = await sendEmail({ to, subject: r.draft.subject, text: body, replyTo: gmailSender() })
      // threadId is what makes reply/bounce detection possible later — the old
      // sender received it from sendEmail() and threw it away, which is why
      // replies were invisible. recipient_email is stored alongside so the sync
      // can match inbound mail without re-joining through the draft.
      await supabaseAdmin.from('sends').update({
        status: 'sent',
        gmail_message_id: res.messageId,
        gmail_thread_id: res.threadId ?? null,
        recipient_email: to,
        sent_at: new Date().toISOString(),
      }).eq('id', r.id)
      // A press follow-up is the LAST touch this cycle: the editor closes for
      // 90 days (re-pitchable next season) instead of lingering in 'sent'.
      const nextStatus = isPress && r.draft.is_followup ? 'closed_this_cycle' : 'sent'
      await supabaseAdmin.from('prospects').update({
        status: nextStatus,
        ...(nextStatus === 'closed_this_cycle'
          ? { closed_until: new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10) }
          : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', p.id)
      if (isPress) { pressSent++; pressSentThisDrain++ }
      sentToday.add(to)
      // Mirror into the unified touches ledger (cockpit visibility). No
      // followup_due — the pipeline drafts its own follow-ups after 6 days.
      const contactId = await mirrorContact(to, p.company, p.person_name)
      if (contactId) {
        // Idempotent on message_id: one Gmail message can only ever be one
        // touch. Paired with the unique index in the v3 migration, a repeated
        // drain can no longer inflate the ledger (the 94-vs-75 bug).
        await supabaseAdmin.from('touches').upsert({
          contact_id: contactId, direction: 'outbound', channel: 'email',
          subject: r.draft.subject, snippet: body.slice(0, 280),
          message_id: res.messageId, track: 'pipeline', status: 'sent', followup_due: null,
        }, { onConflict: 'message_id', ignoreDuplicates: true })
      }
      stats.sent++
    } catch (e) {
      console.error('pipeline send failed', to, e)
      await supabaseAdmin.from('sends').update({ status: 'failed' }).eq('id', r.id)
      stats.failed++
    }
    if (i < rows.length - 1) await sleep(jitterMs())
  }

  if (!dry && (stats.sent || stats.failed)) {
    await bumpDailyStats({ sent: stats.sent, send_failed: stats.failed, press_sent: pressSentThisDrain })
  }
  return stats
}

// Contact mirror WITHOUT enrolling in the legacy cold sender (outreach_enrolled
// stays false) so a prospect is never double-contacted by both systems.
async function mirrorContact(email: string, company: string, personName: string | null): Promise<string | null> {
  const { data: existing } = await supabaseAdmin.from('contacts').select('id').eq('email', email).maybeSingle()
  if (existing?.id) return existing.id as string
  const first = (personName ?? '').trim().split(/\s+/)[0] || null
  const { data } = await supabaseAdmin.from('contacts').insert({
    email, name: personName, first_name: first, company,
    track: 'C', status: 'contacted', source: 'pipeline', is_corporate: true,
  }).select('id').maybeSingle()
  return (data?.id as string) ?? null
}
