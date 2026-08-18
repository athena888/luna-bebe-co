import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { addSuppression, emailDomain } from '@/lib/outreach'
import { quotaStatus } from '@/lib/emailVerifier'
import { getDailySendCap, bumpDailyStats, getRecentRuns, pipelineEnabled, setPipelineEnabled } from '@/lib/pipeline/config'
import { getCurrentLookbook } from '@/lib/lookbook/current'
import { getCurrentPressKit } from '@/lib/press-kit'
import { getPipelineTemplates, renderPipelineTemplate } from '@/lib/pipeline/drafter'
import { selectPressTemplateKey, founderStoryEnabled } from '@/lib/pipeline/press-drafter'
import { getPressConfig } from '@/lib/pipeline/press-prospector'

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

    const [{ data: queue }, cap, quota, runs, lookbook, pressKit] = await Promise.all([
      supabaseAdmin.from('email_drafts')
        // v3 qualification fields included so the reviewer can see WHY a lead
        // qualified without querying the database.
        .select('id, subject, body, is_followup, draft_kind, status, created_at, template_key, prospect:prospects(id, company, domain, person_name, title, metro, category, linkedin_url, email, email_grade, verifier_score, fit_reason, status, channel, outlet, tier, guide_title, guide_url, freelancer, segment, qualification_score, qualification_tier, qualification_status, recurring_potential, company_size_band, company_size_confidence, contact_confidence, email_is_generic, role_family, qualification_reasons, disqualification_reasons, qualification_summary)')
        .eq('status', 'pending_review').order('created_at', { ascending: true }).limit(100),
      getDailySendCap(),
      quotaStatus(),
      getRecentRuns(7),
      getCurrentLookbook(),
      getCurrentPressKit(),
    ])
    const enabled = await pipelineEnabled()

    const [queuedCount, sentToday, replied, manualCheck, lookbookWaiting, needsPersonalization, awaitingKit] = await Promise.all([
      supabaseAdmin.from('sends').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
      supabaseAdmin.from('sends').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', `${today}T00:00:00Z`),
      supabaseAdmin.from('prospects').select('id, company, person_name, title, email, metro, category, updated_at, channel, outlet, tier, guide_title, placement_url')
        .eq('status', 'replied').gte('updated_at', new Date(Date.now() - 7 * 86_400_000).toISOString())
        .order('updated_at', { ascending: false }).limit(20),
      supabaseAdmin.from('prospects').select('id', { count: 'exact', head: true }).eq('status', 'needs_manual_check'),
      supabaseAdmin.from('email_drafts').select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review').eq('template_key', 'reply-lookbook-pending'),
      supabaseAdmin.from('prospects')
        .select('id, outlet, tier, person_name, title, email, email_grade, guide_url, guide_title, freelancer, created_at')
        .eq('channel', 'press').eq('status', 'needs_human_personalization')
        .order('created_at', { ascending: true }).limit(20),
      supabaseAdmin.from('prospects').select('id', { count: 'exact', head: true })
        .eq('channel', 'press').eq('status', 'awaiting_press_kit'),
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
      press: {
        kit: pressKit,                                       // { url, imageCount } | null
        needsPersonalization: needsPersonalization.data ?? [],
        awaitingKit: awaitingKit.count ?? 0,
      },
      pipelineEnabled: enabled,
    })
  } catch (e) {
    console.error('review GET error:', e)
    return NextResponse.json({ error: 'Failed to load review queue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  let body: { action?: string; draftId?: string; subject?: string; bodyText?: string; prospectId?: string; guideReference?: string; url?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const { action, draftId } = body

  try {
    // ── Master switch: pause/resume the whole pipeline (prospect+draft+send) ──
    if (action === 'set_pipeline_enabled') {
      await setPipelineEnabled(Boolean((body as { enabled?: boolean }).enabled))
      return NextResponse.json({ ok: true })
    }

    // ── Press: finish a parked personalization by hand ───────────────────────
    if (action === 'finish_personalization' && body.prospectId) {
      const ref = (body.guideReference ?? '').trim()
      if (ref.length < 10) return NextResponse.json({ error: 'Write the personalization sentence first' }, { status: 400 })
      const { data: p } = await supabaseAdmin.from('prospects')
        .select('id, person_name, outlet, tier, freelancer, email_grade, status')
        .eq('id', body.prospectId).eq('channel', 'press').maybeSingle()
      if (!p || p.status !== 'needs_human_personalization') return NextResponse.json({ error: 'Prospect not found or not parked' }, { status: 404 })
      if (!(p.email_grade === 'A' || p.email_grade === 'B')) return NextResponse.json({ error: 'Email not verified (grade A/B required)' }, { status: 400 })
      const kit = await getCurrentPressKit()
      if (!kit) return NextResponse.json({ error: 'Tag press images first — no pitch may point at an empty /press page' }, { status: 400 })

      const [templates, cfg] = await Promise.all([getPipelineTemplates(), getPressConfig()])
      const key = selectPressTemplateKey(p.tier as number | null, Boolean(p.freelancer), founderStoryEnabled(Boolean(cfg?.founder_story_enabled)), new Date().getMonth())
      const tpl = templates.find(t => t.key === key)
      if (!tpl) return NextResponse.json({ error: `Template ${key} missing` }, { status: 500 })
      const firstName = ((p.person_name as string) ?? '').trim().split(/\s+/)[0] ?? ''
      const rendered = renderPipelineTemplate(tpl, {
        first_name: firstName, outlet: (p.outlet as string) ?? '', guide_reference: ref, press_kit_url: kit.url,
      })
      if (!rendered.ok) return NextResponse.json({ error: `Unresolved fields: ${rendered.missing.join(', ')}` }, { status: 400 })
      await supabaseAdmin.from('email_drafts').insert({
        prospect_id: p.id, template_key: key, subject: rendered.subject, body: rendered.body,
        is_followup: false, draft_kind: 'cold', status: 'pending_review', edited_by_user: true,
      })
      await supabaseAdmin.from('prospects').update({ status: 'drafted', updated_at: new Date().toISOString() }).eq('id', p.id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'discard_personalization' && body.prospectId) {
      await supabaseAdmin.from('prospects')
        .update({ status: 'discarded', updated_at: new Date().toISOString() })
        .eq('id', body.prospectId).eq('channel', 'press').eq('status', 'needs_human_personalization')
      return NextResponse.json({ ok: true })
    }

    // ── Press: record a placement (guide published with Petite Lavande in it) ─
    if (action === 'mark_placement' && body.prospectId) {
      const url = (body.url ?? '').trim()
      if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Placement needs a full URL' }, { status: 400 })
      const { data } = await supabaseAdmin.from('prospects')
        .update({ placement_url: url, placed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', body.prospectId).eq('channel', 'press').select('id').maybeSingle()
      if (!data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
      await bumpDailyStats({ placements: 1 })
      return NextResponse.json({ ok: true })
    }

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
