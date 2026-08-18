import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// KPI dashboard data (§33) + the contact-research backlog (§21).
//
// Deliberately NOT open-rate driven: there is no open tracking and there never
// will be (tracking pixels hurt deliverability). Everything here is an outcome
// a human can act on — delivered, bounced, replied, and what is waiting.
//
// Account stage and email activity are kept distinct (§32): a company is the
// account, a send is an activity on it.

export const dynamic = 'force-dynamic'

interface SendRow {
  sent_at: string | null
  replied_at: string | null
  bounced_at: string | null
  delivery_state: string | null
  draft: {
    template_key: string | null
    is_followup: boolean
    prospect: {
      company: string
      segment: string | null
      metro: string | null
      company_size_band: string | null
      qualification_tier: string | null
      reply_category: string | null
      role_family: string | null
    } | null
  } | null
}

const bump = (m: Record<string, number>, k: string | null | undefined) => {
  const key = k ?? 'unknown'
  m[key] = (m[key] ?? 0) + 1
}

export async function GET() {
  try {
    const [{ data: sends }, { data: prospects }, { data: research }] = await Promise.all([
      supabaseAdmin.from('sends')
        .select('sent_at, replied_at, bounced_at, delivery_state, draft:email_drafts!inner(template_key, is_followup, prospect:prospects!inner(company, segment, metro, company_size_band, qualification_tier, reply_category, role_family))')
        .eq('status', 'sent').limit(2000),
      supabaseAdmin.from('prospects')
        .select('qualification_status, qualification_tier, segment, company_size_band, email_is_generic, status, recurring_potential')
        .eq('channel', 'corporate').limit(5000),
      // The contact-research backlog: strong companies with no reachable buyer.
      supabaseAdmin.from('prospects')
        .select('id, company, domain, segment, qualification_score, company_size_band, email, email_is_generic, disqualification_reasons')
        .eq('qualification_status', 'NEEDS_CONTACT_RESEARCH')
        .order('qualification_score', { ascending: false }).limit(60),
    ])

    const rows = ((sends ?? []) as unknown as SendRow[]).filter(r => r.draft?.prospect)
    const sent = rows.length
    const replied = rows.filter(r => r.replied_at).length
    const bounced = rows.filter(r => r.bounced_at).length
    const hardBounced = rows.filter(r => r.delivery_state === 'hard_bounce').length
    const followups = rows.filter(r => r.draft?.is_followup).length
    const v3 = rows.filter(r => (r.draft?.template_key ?? '').startsWith('v3:')).length

    // Outcome categories that matter commercially, not vanity metrics.
    const replyCats: Record<string, number> = {}
    for (const r of rows) if (r.draft?.prospect?.reply_category) bump(replyCats, r.draft.prospect.reply_category)
    const positive = replyCats.POSITIVE ?? 0

    // Breakdowns (§33).
    const bySegment: Record<string, { sent: number; replied: number }> = {}
    const byMetro: Record<string, { sent: number; replied: number }> = {}
    const bySize: Record<string, { sent: number; replied: number }> = {}
    const byTier: Record<string, { sent: number; replied: number }> = {}
    const byRole: Record<string, { sent: number; replied: number }> = {}
    const add = (m: Record<string, { sent: number; replied: number }>, k: string | null | undefined, did: boolean) => {
      const key = k ?? 'unknown'
      m[key] ??= { sent: 0, replied: 0 }
      m[key].sent++
      if (did) m[key].replied++
    }
    for (const r of rows) {
      const p = r.draft!.prospect!
      const did = Boolean(r.replied_at)
      add(bySegment, p.segment, did)
      add(byMetro, p.metro, did)
      add(bySize, p.company_size_band, did)
      add(byTier, p.qualification_tier, did)
      add(byRole, p.role_family, did)
    }

    // Inventory (§49) — is lead supply actually constrained?
    const pool = (prospects ?? []) as Array<Record<string, string | boolean | null>>
    const byStatus: Record<string, number> = {}
    for (const p of pool) bump(byStatus, p.qualification_status as string)
    const contacted = ['sent', 'replied', 'bounced', 'suppressed']
    const uncontacted = pool.filter(p =>
      p.qualification_status === 'QUALIFIED' && !contacted.includes(String(p.status)))
    const uncontactedExcellent = uncontacted.filter(p => p.qualification_tier === 'EXCELLENT').length

    return NextResponse.json({
      ok: true,
      results: {
        emailsSent: sent,
        uniqueAccountsContacted: new Set(rows.map(r => r.draft!.prospect!.company)).size,
        initial: sent - followups,
        followups,
        viaNewPipeline: v3,
        replied,
        positiveReplies: positive,
        bounced,
        hardBounced,
        replyRate: sent ? replied / sent : 0,
        positiveReplyRate: sent ? positive / sent : 0,
        bounceRate: sent ? bounced / sent : 0,
        replyCategories: replyCats,
      },
      breakdowns: { bySegment, byMetro, bySize, byTier, byRole },
      inventory: {
        byStatus,
        uncontactedQualified: uncontacted.length,
        uncontactedExcellent,
        needsContactResearch: byStatus.NEEDS_CONTACT_RESEARCH ?? 0,
      },
      contactResearch: (research ?? []).map(r => ({
        ...r,
        blocker: Array.isArray(r.disqualification_reasons) && r.disqualification_reasons.length
          ? String(r.disqualification_reasons[0])
          : 'no reachable named buyer',
      })),
    })
  } catch (e) {
    console.error('outreach dashboard failed:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
