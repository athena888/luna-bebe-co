import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { addSuppression, emailDomain } from '@/lib/outreach'
import { quotaStatus } from '@/lib/emailVerifier'
import { getDailySendCap, getRecentRuns } from '@/lib/pipeline/config'
import { getCurrentLookbook } from '@/lib/lookbook/current'

export const dynamic = 'force-dynamic'

// Morning review queue (portal-authed via middleware). Approving a draft is the
// ONLY thing that creates a `sends` row — and the drainer re-verifies approval
// with an inner join. GET = everything the page needs; POST = per-card actions.

interface QueueRow {
  id: string
  subject: string
  body: string
  is_followup: boolean
  draft_kind: string
  status: string
  created_at: string
  prospect: {
    id: string; company: string; domain: string | null; person_name: string | null; title: string | null
    metro: string | null; category: string | null; linkedin_url: string | null
    email: string | null; email_grade: string | null; verifier_score: number | null; fit_reason: string | null; status: string
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10)

    const [{ data: queue }, cap, quota, runs, lookbook] = await Promise.all([
      supabaseAdmin.from('email_drafts')
        .select('id, subject, body, is_followup, draft_kind, status, created_at, prospect:prospects(id, company, domain, person_name, title, metro, category, linkedin_url, email, email_grade, verifier_score, fit_reason, status)')
        .eq('status', 'pending_review').order('created_at', { ascending: true }).limit(100),
      getDailySendCap(),
      quotaStatus(),
      getRecentRuns(7),
      getCurrentLookbook(),
    ])

    const [queuedCount, sentToday, replied, manualCheck, lookbookWaiting] = await Promise.all([
      supabaseAdmin.from('sends').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
      supabaseAdmin.from('sends').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', `${today}T00:00:00Z`),
      supabaseAdmin.from('prospects').select('id, company, person_name, title, email, metro, category, updated_at')
        .eq('status', 'replied').gte('updated_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('updated_at', { ascending: false }).limit(20),
      supabaseAdmin.from('prospects').select('id', { count: 'exact', head: true }).eq('status', 'needs_manual_check'),
      supabaseAdmin.from('email_drafts').select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review').eq('template_key', 'reply-lookbook-pending'),
    ])

    const yesterday = runs.length >= 2 ? runs[runs.length - 2]?.stats ?? {} : {}

    return NextResponse.json({
      queue: (queue ?? []) as unknown as QueueRow[],
      stats: {
        cap,
        queued: queuedCount.count ?? 0,
        sentToday: sentToday.count ?? 0,
        capRemaining: Math.max(0, cap - (sentToday.count ?? 0)),
        yesterdayReplies: Number(yesterday.replied) || 0,
        yesterdayBounces: Number(yesterday.bounced) || 0,
        needsManualCheck: manualCheck.count ?? 0,
      },
      quota,
      runs,
      replies: replied.data ?? [],
      lookbook: {
        published: lookbook,                       // { url, version } | null
        waiting: lookbookWaiting.count ?? 0,       // interested replies awaiting the lookbook
      },
    })
  } catch (e) {
    console.error('review GET error:', e)
    return NextResponse.json({ error: 'Failed to load review queue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { action?: string; draftId?: string; subject?: string; bodyText?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const { action, draftId } = body

  try {
    if (action === 'approve' && draftId) {
      const patch: Record<string, unknown> = { status: 'approved_by_user', updated_at: new Date().toISOString() }
      if (typeof body.bodyText === 'string' || typeof body.subject === 'string') {
        if (typeof body.bodyText === 'string') patch.body = body.bodyText
        if (typeof body.subject === 'string') patch.subject = body.subject
        patch.edited_by_user = true
      }
      const { data: d } = await supabaseAdmin.from('email_drafts')
        .update(patch).eq('id', draftId).eq('status', 'pending_review')
        .select('id, prospect_id').maybeSingle()
      if (!d) return NextResponse.json({ error: 'Draft not found or not pending' }, { status: 404 })
      await supabaseAdmin.from('sends').insert({ draft_id: d.id })
      await supabaseAdmin.from('prospects').update({ status: 'queued', updated_at: new Date().toISOString() }).eq('id', d.prospect_id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'approve_all') {
      const { data: drafts } = await supabaseAdmin.from('email_drafts')
        .update({ status: 'approved_by_user', updated_at: new Date().toISOString() })
        .eq('status', 'pending_review').select('id, prospect_id')
      for (const d of (drafts ?? []) as { id: string; prospect_id: string }[]) {
        await supabaseAdmin.from('sends').insert({ draft_id: d.id })
        await supabaseAdmin.from('prospects').update({ status: 'queued', updated_at: new Date().toISOString() }).eq('id', d.prospect_id)
      }
      return NextResponse.json({ ok: true, approved: (drafts ?? []).length })
    }

    if (action === 'skip' && draftId) {
      // Recycle: draft superseded, prospect back to 'discovered' → tomorrow's drafter redrafts.
      const { data: d } = await supabaseAdmin.from('email_drafts')
        .update({ status: 'superseded', updated_at: new Date().toISOString() })
        .eq('id', draftId).eq('status', 'pending_review').select('prospect_id').maybeSingle()
      if (d) await supabaseAdmin.from('prospects').update({ status: 'discovered', updated_at: new Date().toISOString() }).eq('id', d.prospect_id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'reject' && draftId) {
      // Never contact again: suppression (email + domain) and prospect closed out.
      const { data: d } = await supabaseAdmin.from('email_drafts')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', draftId).select('prospect_id').maybeSingle()
      if (d) {
        const { data: p } = await supabaseAdmin.from('prospects')
          .update({ status: 'suppressed', updated_at: new Date().toISOString() })
          .eq('id', d.prospect_id).select('email, domain').maybeSingle()
        if (p?.email) {
          await addSuppression(p.email as string, 'manual')
          await supabaseAdmin.from('suppression')
            .update({ domain: (p.domain as string) || emailDomain(p.email as string) })
            .eq('email', (p.email as string).toLowerCase())
        }
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('review POST error:', e)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
