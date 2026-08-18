import { supabaseAdmin } from './supabase.ts'
import { sendCampaignEmail } from './resend.ts'
import { isOptedOut } from './unsubscribe.ts'
import type { ContactSegment } from './contacts.ts'

// Build 8 — one-off campaigns from Portal → Campaigns. Recipients come ONLY
// from marketing_contacts with marketing_opt_in, filtered by segment, minus
// opt-outs. Every send is logged per-recipient in email_events with
// flow='campaign' and the campaign slug, so attribution and "who got what"
// are answerable forever. A slug can only be sent once (resend = new slug).

export interface CampaignInput {
  slug: string           // kebab-case id, e.g. 'reopening-2026-08'
  subject: string
  heading: string
  paragraphs: string[]
  ctaLabel?: string
  ctaHref?: string
  segments: ContactSegment[]  // which segments receive it; 'unknown' allowed
}

export async function campaignRecipients(segments: ContactSegment[]): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('marketing_contacts')
    .select('email, segment')
    .eq('marketing_opt_in', true)
    .in('segment', segments)
  const emails = [...new Set((data ?? []).map(c => (c.email as string).trim().toLowerCase()))]
  const out: string[] = []
  for (const e of emails) {
    if (!await isOptedOut(e)) out.push(e)
  }
  return out
}

export async function sendCampaign(input: CampaignInput): Promise<{ sent: number; failed: number; error?: string }> {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
  if (!slug) return { sent: 0, failed: 0, error: 'Campaign needs a slug' }
  if (!input.subject.trim() || !input.heading.trim() || !input.paragraphs.some(p => p.trim())) {
    return { sent: 0, failed: 0, error: 'Subject, heading and body are required' }
  }

  // One send per slug — a replayed click can't double-blast the list.
  const { data: prior } = await supabaseAdmin
    .from('email_events').select('id').eq('flow', 'campaign').eq('campaign', slug).limit(1)
  if (prior?.length) return { sent: 0, failed: 0, error: `Campaign "${slug}" was already sent — use a new name to send again` }

  const recipients = await campaignRecipients(input.segments)
  if (!recipients.length) return { sent: 0, failed: 0, error: 'No opted-in recipients in the selected segments' }

  let sent = 0, failed = 0
  for (const email of recipients) {
    try {
      await sendCampaignEmail({
        customerEmail: email,
        subject: input.subject,
        heading: input.heading,
        paragraphs: input.paragraphs.filter(p => p.trim()),
        ctaLabel: input.ctaLabel?.trim() || undefined,
        ctaHref: input.ctaHref?.trim() || undefined,
        campaign: slug,
      })
      await supabaseAdmin.from('email_events').insert({
        flow: 'campaign', step: 1, recipient: email, template: 'campaign',
        campaign: slug, scheduled_at: new Date().toISOString(), sent_at: new Date().toISOString(),
      })
      sent++
    } catch (e) {
      console.error(`campaign ${slug} → ${email} failed:`, e)
      failed++
    }
  }
  return { sent, failed }
}

/** Past campaigns with recipient counts, newest first (for the portal list). */
export async function listCampaigns(): Promise<Array<{ slug: string; sent: number; lastAt: string }>> {
  const { data } = await supabaseAdmin
    .from('email_events')
    .select('campaign, sent_at')
    .eq('flow', 'campaign')
    .not('campaign', 'is', null)
  const bySlug = new Map<string, { sent: number; lastAt: string }>()
  for (const r of data ?? []) {
    const cur = bySlug.get(r.campaign) ?? { sent: 0, lastAt: '' }
    cur.sent++
    if ((r.sent_at ?? '') > cur.lastAt) cur.lastAt = r.sent_at ?? ''
    bySlug.set(r.campaign, cur)
  }
  return [...bySlug.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
