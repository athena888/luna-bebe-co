// Reply / bounce / manual-reply detection via scheduled Gmail synchronization.
//
// WHY THIS EXISTS: the inbound-email webhook was never connected
// (INBOUND_EMAIL_SECRET unset, no provider forwarding), so replies and bounces
// were invisible. The audit's "0 replies, 0 bounces" was UNMEASURED, not zero.
// Follow-ups cannot safely run until this works — you must never chase someone
// who already answered.
//
// Approach: we already send through the Gmail API, and sendEmail() already
// returns the threadId. Reading those same threads back is the shortest path
// with no new external dependency. Each outbound send records its thread; this
// job re-reads the thread and looks at what arrived after we sent.
//
// SCOPE REQUIREMENT (manual action): sending uses gmail.send, which cannot
// read. This needs `gmail.readonly` added to the service account's domain-wide
// delegation in Google Admin. Until then isReadScopeConfigured() returns false
// and the job no-ops instead of failing — reply sync stays flagged OFF.
//
// This module never sends anything and never drafts a reply.

import { google } from 'googleapis'
import { supabaseAdmin } from '../supabase.ts'
import { gmailSender } from '../gmail.ts'
import { addSuppression, emailDomain } from '../outreach.ts'
import {
  looksLikeBounce, isHardBounce, classifyReply, extractReferredContact,
} from './reply-rules.ts'

const READ_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


export interface SyncStats {
  enabled: boolean
  threadsChecked: number
  repliesFound: number
  bouncesFound: number
  manualRepliesFound: number
  unsubscribes: number
  byCategory: Record<string, number>
  errors: string[]
  dry: boolean
  skippedReason?: string
}

function readClient() {
  const raw = process.env.GOOGLE_SA_KEY
  if (!raw) throw new Error('GOOGLE_SA_KEY is not set')
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string }
  if (!key.client_email || !key.private_key) throw new Error('GOOGLE_SA_KEY missing fields')
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key.replace(/\\n/g, '\n'),
    scopes: READ_SCOPES,
    subject: gmailSender(),
  })
  return google.gmail({ version: 'v1', auth })
}

/** Cheap probe: can we actually read? Returns false when the delegation scope
 *  has not been granted, so the caller can no-op rather than throw nightly. */
export async function isReadScopeConfigured(): Promise<boolean> {
  if (!process.env.GOOGLE_SA_KEY) return false
  try {
    const gmail = readClient()
    await gmail.users.getProfile({ userId: 'me' })
    return true
  } catch {
    return false
  }
}

// Reply/bounce judgement lives in reply-rules.ts (pure, unit-tested). This
// module only performs I/O and delegates every decision to it.
export {
  looksLikeBounce, isHardBounce, classifyReply, extractReferredContact,
  followupDecision, FOLLOWUP_SCHEDULE, MAX_TOUCHES,
} from "./reply-rules.ts"
export type { ReplyCategory, FollowupCandidate } from "./reply-rules.ts"

// ── Header helpers ───────────────────────────────────────────────────────────
interface GmailHeader { name?: string | null; value?: string | null }
function header(headers: GmailHeader[] | undefined, name: string): string {
  const h = (headers ?? []).find(x => (x.name ?? '').toLowerCase() === name.toLowerCase())
  return (h?.value ?? '').trim()
}
function parseAddress(v: string): string {
  const m = v.match(/<([^>]+)>/)
  return (m ? m[1] : v).trim().toLowerCase()
}

function decodeBody(payload: unknown): string {
  const p = payload as { body?: { data?: string }; parts?: unknown[]; mimeType?: string } | undefined
  if (!p) return ''
  if (p.body?.data) {
    try { return Buffer.from(p.body.data, 'base64').toString('utf8') } catch { /* ignore */ }
  }
  let out = ''
  for (const part of (p.parts ?? [])) out += decodeBody(part)
  return out
}

// ── Main sync ────────────────────────────────────────────────────────────────
interface SendRow {
  id: string
  gmail_thread_id: string | null
  gmail_message_id: string | null
  recipient_email: string | null
  sent_at: string | null
  draft: { prospect: { id: string; email: string | null; status: string } } | null
}

/**
 * Re-read the threads we sent into and record what came back.
 *
 * Deliberately conservative: it only ever moves a prospect to a TERMINAL state
 * (replied / bounced / suppressed). It never re-opens, never un-suppresses,
 * and never sends. Safe to run repeatedly — every write is idempotent.
 */
export async function runGmailSync(opts: { dry?: boolean; limit?: number } = {}): Promise<SyncStats> {
  const dry = Boolean(opts.dry)
  const stats: SyncStats = {
    enabled: false, threadsChecked: 0, repliesFound: 0, bouncesFound: 0,
    manualRepliesFound: 0, unsubscribes: 0, byCategory: {}, errors: [], dry,
  }

  if (!(await isReadScopeConfigured())) {
    stats.skippedReason =
      'gmail.readonly not granted to the service account — add it in Google Admin → domain-wide delegation'
    return stats
  }
  stats.enabled = true

  const gmail = readClient()
  const ourDomain = emailDomain(gmailSender())

  // Backfill thread ids for sends made BEFORE gmail_thread_id existed.
  // The historical 75 recorded only gmail_message_id, so without this they are
  // invisible to the sync and their replies/bounces can never be measured.
  // A message id resolves to its thread, so the history is recoverable.
  if (!dry) {
    const { data: legacy } = await supabaseAdmin.from('sends')
      .select('id, gmail_message_id, draft:email_drafts!inner(prospect:prospects!inner(email))')
      .eq('status', 'sent')
      .is('gmail_thread_id', null)
      .not('gmail_message_id', 'is', null)
      .limit(300)

    for (const row of ((legacy ?? []) as unknown as Array<{
      id: string; gmail_message_id: string; draft: { prospect: { email: string | null } }
    }>)) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me', id: row.gmail_message_id, format: 'metadata',
        })
        const threadId = msg.data.threadId
        if (!threadId) continue
        await supabaseAdmin.from('sends').update({
          gmail_thread_id: threadId,
          recipient_email: row.draft?.prospect?.email?.toLowerCase() ?? null,
        }).eq('id', row.id)
      } catch (e) {
        // A message deleted from the mailbox simply stays unmeasurable.
        stats.errors.push(`thread backfill ${row.id}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // Sends that have a thread and no terminal outcome recorded yet.
  const { data } = await supabaseAdmin.from('sends')
    .select('id, gmail_thread_id, gmail_message_id, recipient_email, sent_at, draft:email_drafts!inner(prospect:prospects!inner(id, email, status))')
    .eq('status', 'sent')
    .not('gmail_thread_id', 'is', null)
    .is('replied_at', null)
    .is('bounced_at', null)
    .order('sent_at', { ascending: false })
    .limit(opts.limit ?? 200)

  const rows = ((data ?? []) as unknown as SendRow[]).filter(r => r.draft?.prospect)

  for (const row of rows) {
    try {
      stats.threadsChecked++
      const thread = await gmail.users.threads.get({
        userId: 'me', id: row.gmail_thread_id!, format: 'full',
      })
      const messages = thread.data.messages ?? []
      const sentAt = row.sent_at ? Date.parse(row.sent_at) : 0
      const prospect = row.draft!.prospect
      const theirEmail = (row.recipient_email ?? prospect.email ?? '').toLowerCase()

      for (const msg of messages) {
        const headers = msg.payload?.headers as GmailHeader[] | undefined
        const from = parseAddress(header(headers, 'From'))
        const subject = header(headers, 'Subject')
        const internalDate = Number(msg.internalDate ?? 0)
        if (internalDate && sentAt && internalDate <= sentAt) continue   // our own outbound

        const body = decodeBody(msg.payload).slice(0, 4000)

        // 1) Bounce
        if (looksLikeBounce(from, subject)) {
          const hard = isHardBounce(body)
          stats.bouncesFound++
          if (!dry) {
            await supabaseAdmin.from('sends').update({
              delivery_state: hard ? 'hard_bounce' : 'soft_bounce',
              bounced_at: new Date(internalDate || Date.now()).toISOString(),
              bounce_reason: subject.slice(0, 300) || 'bounce notification',
            }).eq('id', row.id)
            await supabaseAdmin.from('prospects').update({
              status: 'bounced',
              account_stage: 'LOST',
              followup_paused_reason: hard ? 'hard_bounce' : 'soft_bounce',
              next_followup_at: null,
              updated_at: new Date().toISOString(),
            }).eq('id', prospect.id)
            // Only a HARD bounce earns permanent suppression.
            if (hard && theirEmail) {
              await addSuppression(theirEmail, 'bounce')
              await supabaseAdmin.from('suppression')
                .update({ domain: emailDomain(theirEmail) }).eq('email', theirEmail)
            }
            await supersedePending(prospect.id)
          }
          break
        }

        // 2) Manual reply from us — Emily answered by hand. That is a live
        //    conversation; automation must get out of the way.
        if (emailDomain(from) === ourDomain) {
          stats.manualRepliesFound++
          if (!dry) {
            await supabaseAdmin.from('prospects').update({
              followup_paused_reason: 'manual_conversation',
              next_followup_at: null,
              updated_at: new Date().toISOString(),
            }).eq('id', prospect.id)
            await supersedePending(prospect.id)
          }
          continue
        }

        // 3) Inbound reply from the prospect
        if (theirEmail && from === theirEmail) {
          const category = classifyReply(subject, body)
          stats.repliesFound++
          stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1

          // An auto-reply is not a human answer: record it, do NOT mark replied,
          // do NOT stop the sequence (they never saw the message).
          if (category === 'AUTO_REPLY') continue

          const referred = category === 'WRONG_PERSON'
            ? extractReferredContact(body, ourDomain, theirEmail)
            : null

          if (!dry) {
            const repliedAt = new Date(internalDate || Date.now()).toISOString()
            await supabaseAdmin.from('sends')
              .update({ replied_at: repliedAt, delivery_state: 'delivered' }).eq('id', row.id)
            await supabaseAdmin.from('prospects').update({
              status: 'replied',
              replied_at: repliedAt,
              reply_category: category,
              reply_snippet: body.replace(/\s+/g, ' ').slice(0, 500),
              referred_contact: referred,
              account_stage: category === 'POSITIVE' ? 'POSITIVE_REPLY' : 'REPLIED',
              followup_paused_reason: `reply:${category}`,
              next_followup_at: null,
              updated_at: new Date().toISOString(),
            }).eq('id', prospect.id)
            await supersedePending(prospect.id)

            if (category === 'UNSUBSCRIBE' && theirEmail) {
              stats.unsubscribes++
              await addSuppression(theirEmail, 'stop')
              await supabaseAdmin.from('prospects')
                .update({ status: 'suppressed', account_stage: 'SUPPRESSED' }).eq('id', prospect.id)
            }
          }
          break
        }
      }
    } catch (e) {
      stats.errors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  if (!dry) {
    await supabaseAdmin.from('gmail_sync_log').insert({
      threads_checked: stats.threadsChecked,
      replies_found: stats.repliesFound,
      bounces_found: stats.bouncesFound,
      manual_replies_found: stats.manualRepliesFound,
      errors: stats.errors.length ? stats.errors.slice(0, 20).join(' | ') : null,
      dry: false,
    }).then(() => {}, () => {})
  }
  return stats
}

async function supersedePending(prospectId: string): Promise<void> {
  await supabaseAdmin.from('email_drafts')
    .update({ status: 'superseded', updated_at: new Date().toISOString() })
    .eq('prospect_id', prospectId).eq('status', 'pending_review').neq('draft_kind', 'reply_assist')
}
