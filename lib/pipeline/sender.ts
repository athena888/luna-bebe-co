import { resolveMx } from 'node:dns/promises'
import { supabaseAdmin } from '../supabase'
import { sendEmail, gmailSender } from '../gmail'
import { withFooter } from '../outreach-templates'
import { getSuppressedSet, emailDomain } from '../outreach'
import { getDailySendCap, bumpDailyStats } from './config'

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

/** Outbound emails already sent today (any sender) — the cap is global. */
async function sentTodayCount(): Promise<number> {
  const since = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`
  const { count } = await supabaseAdmin.from('touches')
    .select('id', { count: 'exact', head: true })
    .eq('direction', 'outbound').eq('channel', 'email').gte('created_at', since)
  return count ?? 0
}

interface QueuedRow {
  id: string
  draft: {
    id: string; subject: string; body: string; status: string; is_followup: boolean
    prospect: { id: string; email: string | null; company: string; person_name: string | null; status: string; email_grade: string | null }
  }
}

export async function drainPipelineQueue(opts: { dry?: boolean; timeBudgetMs?: number; startedAt?: number } = {}): Promise<DrainStats> {
  const started = opts.startedAt ?? Date.now()
  const budget = opts.timeBudgetMs ?? 280_000
  const dry = Boolean(opts.dry)

  const cap = await getDailySendCap()
  const capRemaining = Math.max(0, cap - (await sentTodayCount()))
  const stats: DrainStats = { capRemaining, sent: 0, failed: 0, skipped: [], dry }
  if (capRemaining === 0) return stats

  // Approval enforced structurally: inner join on approved_by_user.
  const { data } = await supabaseAdmin.from('sends')
    .select('id, draft:email_drafts!inner(id, subject, body, status, is_followup, prospect:prospects!inner(id, email, company, person_name, status, email_grade))')
    .eq('status', 'queued')
    .eq('email_drafts.status', 'approved_by_user')
    .order('created_at', { ascending: true })
    .limit(capRemaining)

  const rows = ((data ?? []) as unknown as QueuedRow[]).filter(r => r.draft?.prospect)
  if (!rows.length) return stats

  const suppressed = await getSuppressedSet()

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
    if (!to) { await skip('no email'); continue }
    if (!(p.email_grade === 'A' || p.email_grade === 'B')) { await skip('grade not A/B'); continue }
    if (suppressed.has(to)) { await skip('suppressed'); continue }
    if (p.status === 'replied' || p.status === 'bounced' || p.status === 'suppressed') { await skip(`prospect ${p.status}`); continue }
    if (!(await hasMx(emailDomain(to)))) { await skip('no MX record (would bounce)'); continue }

    const body = withFooter(r.draft.body)   // CAN-SPAM footer at send time, never in the draft
    if (dry) { stats.sent++; continue }

    try {
      const res = await sendEmail({ to, subject: r.draft.subject, text: body, replyTo: gmailSender() })
      await supabaseAdmin.from('sends').update({
        status: 'sent', gmail_message_id: res.messageId, sent_at: new Date().toISOString(),
      }).eq('id', r.id)
      await supabaseAdmin.from('prospects').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', p.id)
      // Mirror into the unified touches ledger (cockpit visibility). No
      // followup_due — the pipeline drafts its own follow-ups after 6 days.
      const contactId = await mirrorContact(to, p.company, p.person_name)
      if (contactId) {
        await supabaseAdmin.from('touches').insert({
          contact_id: contactId, direction: 'outbound', channel: 'email',
          subject: r.draft.subject, snippet: body.slice(0, 280),
          message_id: res.messageId, track: 'pipeline', status: 'sent', followup_due: null,
        })
      }
      stats.sent++
    } catch (e) {
      console.error('pipeline send failed', to, e)
      await supabaseAdmin.from('sends').update({ status: 'failed' }).eq('id', r.id)
      stats.failed++
    }
    if (i < rows.length - 1) await sleep(jitterMs())
  }

  if (!dry && (stats.sent || stats.failed)) await bumpDailyStats({ sent: stats.sent, send_failed: stats.failed })
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
