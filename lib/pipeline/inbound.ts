import { supabaseAdmin } from '../supabase'
import { addSuppression, emailDomain } from '../outreach'
import { bumpDailyStats } from './config'
import { renderPipelineTemplate, getPipelineTemplates } from './drafter'
import { getCurrentLookbook } from '../lookbook/current'

// Pipeline feedback loops, called from the inbound-email webhook:
//  • bounce NDRs → suppression + prospect 'bounced'
//  • replies → prospect 'replied' + pending follow-ups superseded; interested
//    replies get a reply-assist draft (lookbook link when published, "this
//    week" fallback + red-banner counter otherwise) into the review queue
//  • unsubscribe intent → suppression + a confirm-once draft for approval
// Every draft created here is 'pending_review' — nothing auto-sends.

// ── Bounces ──────────────────────────────────────────────────────────────────
export function isBounceNotification(fromEmail: string, subject: string | null): boolean {
  return /^(mailer-daemon|postmaster|mail-delivery|no-?reply.*(delivery|mailer))@/i.test(fromEmail)
    || /\b(delivery status notification|undeliverable|delivery (has )?failed|returned to sender|failure notice)\b/i.test(subject ?? '')
}

/** The bounced recipient, pulled from the NDR body (first address that isn't ours). */
export function extractFailedRecipient(snippet: string | null): string | null {
  const owners = new Set((process.env.OWNER_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean))
  for (const m of (snippet ?? '').matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    const e = m[0].toLowerCase()
    if (!owners.has(e) && !/^(mailer-daemon|postmaster)@/.test(e)) return e
  }
  return null
}

/** Suppress a bounced address and mark its prospect. True when it matched a prospect. */
export async function handleProspectBounce(failedEmail: string): Promise<boolean> {
  await addSuppression(failedEmail, 'bounce')
  await supabaseAdmin.from('suppression').update({ domain: emailDomain(failedEmail) }).eq('email', failedEmail)
  const { data } = await supabaseAdmin.from('prospects')
    .update({ status: 'bounced', updated_at: new Date().toISOString() })
    .ilike('email', failedEmail).select('id')
  const matched = (data ?? []).length > 0
  if (matched) {
    await supersedePendingDrafts((data![0] as { id: string }).id)
    await bumpDailyStats({ bounced: 1 })
  }
  return matched
}

// ── Replies ──────────────────────────────────────────────────────────────────
interface ProspectRow { id: string; company: string; person_name: string | null; email: string | null }

async function findProspectByEmail(email: string): Promise<ProspectRow | null> {
  const { data } = await supabaseAdmin.from('prospects')
    .select('id, company, person_name, email').ilike('email', email).maybeSingle()
  return (data as ProspectRow) ?? null
}

async function supersedePendingDrafts(prospectId: string): Promise<void> {
  await supabaseAdmin.from('email_drafts')
    .update({ status: 'superseded', updated_at: new Date().toISOString() })
    .eq('prospect_id', prospectId).eq('status', 'pending_review').neq('draft_kind', 'reply_assist')
}

export interface ReplyOutcome { matched: boolean; replyAssistDrafted: boolean }

/**
 * A reply arrived from a pipeline prospect. Marks it replied, cancels the
 * pending follow-up, and — when the classifier says they're interested —
 * queues the reply-assist draft for the morning review.
 */
export async function handleProspectReply(
  fromEmail: string,
  opts: { interested: boolean },
): Promise<ReplyOutcome> {
  const p = await findProspectByEmail(fromEmail)
  if (!p) return { matched: false, replyAssistDrafted: false }

  await supabaseAdmin.from('prospects')
    .update({ status: 'replied', updated_at: new Date().toISOString() }).eq('id', p.id)
  await supersedePendingDrafts(p.id)
  await bumpDailyStats({ replied: 1 })

  let drafted = false
  if (opts.interested) drafted = await draftReplyAssist(p)
  return { matched: true, replyAssistDrafted: drafted }
}

/** "Wonderful — here's our lookbook…" (or the not-published-yet fallback). */
async function draftReplyAssist(p: ProspectRow): Promise<boolean> {
  // One reply-assist draft per prospect at a time.
  const { count } = await supabaseAdmin.from('email_drafts')
    .select('id', { count: 'exact', head: true })
    .eq('prospect_id', p.id).eq('draft_kind', 'reply_assist').eq('status', 'pending_review')
  if ((count ?? 0) > 0) return false

  const [templates, lookbook] = await Promise.all([getPipelineTemplates(), getCurrentLookbook()])
  const key = lookbook ? 'reply-lookbook' : 'reply-lookbook-pending'
  const tpl = templates.find(t => t.key === key)
  if (!tpl) return false

  const firstName = (p.person_name ?? '').trim().split(/\s+/)[0] || 'there'
  const rendered = renderPipelineTemplate(tpl, {
    first_name: firstName, company: p.company,
    ...(lookbook ? { lookbook_url: lookbook.url } : {}),
  })
  if (!rendered.ok) return false

  await supabaseAdmin.from('email_drafts').insert({
    prospect_id: p.id, template_key: key, subject: rendered.subject, body: rendered.body,
    is_followup: false, draft_kind: 'reply_assist', status: 'pending_review',
  })
  return true
}

// ── Unsubscribe intent ───────────────────────────────────────────────────────
const UNSUB_CONFIRM_BODY = (firstName: string) => `Hi ${firstName || 'there'},

Understood — you're removed from our list and you won't hear from us again. Sorry for the interruption, and all the best.

Warmly,
Emily Liu, Founder · Petite Lavande`

/** Suppress a prospect who asked out + queue a confirm-once draft for approval. */
export async function handleProspectUnsubscribe(fromEmail: string): Promise<boolean> {
  const p = await findProspectByEmail(fromEmail)
  if (!p) return false
  await supabaseAdmin.from('prospects')
    .update({ status: 'suppressed', updated_at: new Date().toISOString() }).eq('id', p.id)
  await supersedePendingDrafts(p.id)
  const firstName = (p.person_name ?? '').trim().split(/\s+/)[0] ?? ''
  await supabaseAdmin.from('email_drafts').insert({
    prospect_id: p.id, template_key: 'unsub-confirm', subject: 'You’re removed — confirming',
    body: UNSUB_CONFIRM_BODY(firstName), is_followup: false, draft_kind: 'reply_assist', status: 'pending_review',
  })
  return true
}
