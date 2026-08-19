import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyEmail } from '@/lib/emailVerifier'
import { qualifyRecord } from '@/lib/outreach/qualify-v3'
import { isGenericEmail, looksLikeMachineAddress, SIZE_BANDS, bandForRange, type SizeBand } from '@/lib/outreach/icp'

// Researched-contact intake (Portal-protected) — the write path for the daily
// cloud research routine (option B, Emily 2026-08-19: cheapest working route
// to "30 drafts / 30 sends every morning").
//
// The routine researches the BUYER PERSON at companies already seeded as
// prospects and submits { domain, person_name, title, email?, evidence? }.
// This endpoint is deliberately paranoid, because research prose is untrusted:
//  - The prospect row must already exist (by domain) — this endpoint never
//    creates companies, so the intake can't invent targets.
//  - An email is written ONLY after passing the verifier cascade right here,
//    same grades as the site crawler (deliverable→A, risky/unknown→C,
//    undeliverable→rejected). No verification, no write. Generic inboxes and
//    machine addresses are refused outright.
//  - Scoring runs through the SAME deterministic qualifyRecord as every other
//    path; QUALIFIED flips the row to status='discovered' for the drafter.
//    Nothing here drafts or sends.
//  - Per-call verify budget caps quota burn.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface ContactIn {
  domain: string
  person_name: string
  title: string
  email?: string | null
  /** Where the person/title was seen — required so a human can check. */
  source_url?: string | null
  /** Benefits/gifting evidence text found on the company's own pages. */
  evidence_text?: string | null
  evidence_url?: string | null
}

const MAX_VERIFIES_PER_CALL = 20

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { contacts?: ContactIn[] }
    const contacts = (body.contacts ?? []).slice(0, 60)
    if (!contacts.length) return NextResponse.json({ error: 'contacts[] required' }, { status: 400 })

    let verifies = 0
    const results: Array<Record<string, unknown>> = []

    for (const c of contacts) {
      const domain = (c.domain ?? '').trim().toLowerCase()
      const name = (c.person_name ?? '').trim()
      const title = (c.title ?? '').trim()
      const out = (r: Record<string, unknown>) => results.push({ domain, ...r })

      if (!domain || !name || !title) { out({ status: 'rejected', why: 'domain, person_name and title are required' }); continue }

      const { data: p } = await supabaseAdmin.from('prospects')
        .select('id, company, category, fit_reason, employee_count, company_size_band, status, qualification_status')
        .eq('channel', 'corporate').ilike('domain', domain).maybeSingle()
      if (!p) { out({ status: 'rejected', why: 'no prospect with this domain — seed the company first' }); continue }
      if (['sent', 'replied', 'bounced', 'suppressed'].includes(String(p.status))) {
        out({ status: 'rejected', why: `prospect already ${p.status}` }); continue
      }

      // ── Email: verify or refuse. Never store an unverified address. ────────
      let email: string | null = null
      let grade: 'A' | 'C' | null = null
      let provider: string | null = null
      let vscore: number | null = null
      const candidate = (c.email ?? '').trim().toLowerCase()
      if (candidate) {
        if (!candidate.endsWith('@' + domain)) { out({ status: 'rejected', why: 'email domain does not match company domain' }); continue }
        if (isGenericEmail(candidate) || looksLikeMachineAddress(candidate)) { out({ status: 'rejected', why: 'generic or machine address' }); continue }
        if (verifies >= MAX_VERIFIES_PER_CALL) { out({ status: 'parked', why: 'verify budget for this call spent — resubmit later' }); continue }
        verifies++
        const v = await verifyEmail(candidate)
        if (!v) { out({ status: 'parked', why: 'all verifiers unavailable' }); continue }
        if (v.verdict === 'undeliverable') { out({ status: 'rejected', why: 'verification: undeliverable' }); continue }
        email = candidate
        grade = v.verdict === 'deliverable' ? 'A' : 'C'
        provider = v.provider; vscore = v.score
      }

      // ── Score through the shared deterministic pipeline ────────────────────
      const storedBand = p.company_size_band as SizeBand | null
      const band = (storedBand && (SIZE_BANDS as readonly string[]).includes(storedBand))
        ? storedBand
        : bandForRange(p.employee_count as number | null, p.employee_count as number | null)
      const q = qualifyRecord({
        company: String(p.company ?? ''),
        domain,
        category: p.category as string | null,
        title,
        personName: name,
        email,
        emailGrade: grade,
        fitReason: [p.fit_reason as string | null, (c.evidence_text ?? '').slice(0, 6000)].filter(Boolean).join(' '),
        sourceUrl: c.evidence_url ?? c.source_url ?? null,
        researchAgeDays: 0,
        known: band ? { sizeBand: band, sizeConfidence: 'MEDIUM' } : null,
      })

      await supabaseAdmin.from('prospects').update({
        person_name: name,
        title,
        ...(email ? { email, email_grade: grade, verifier_provider: provider, verifier_score: vscore } : {}),
        source_url: c.source_url ?? null,
        segment: q.segment,
        qualification_score: q.result.score,
        qualification_tier: q.result.tier,
        qualification_status: q.result.status,
        company_fit_score: q.result.companyFit,
        contact_fit_score: q.result.contactFit,
        intent_score: q.result.intent,
        data_quality_score: q.result.dataQuality,
        recurring_potential: q.result.recurring,
        contact_confidence: q.result.contactConfidence,
        company_size_band: q.sizeBand,
        company_size_confidence: q.sizeConfidence,
        email_is_generic: q.result.emailIsGeneric,
        title_interpretation: q.result.titleInterpretation,
        role_family: q.result.roleFamily,
        qualification_summary: ('[research-intake] ' + q.explanation).slice(0, 4000),
        qualification_reasons: q.result.reasons,
        disqualification_reasons: q.result.disqualifiers,
        qualification_via: 'cloud_research',
        qualified_at: new Date().toISOString(),
        research_version: 3,
        ...(q.result.status === 'QUALIFIED' && email ? { status: 'discovered' } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', String(p.id))

      // Refresh signals so the drafter can cite the evidence.
      await supabaseAdmin.from('prospect_signals').delete().eq('domain', domain)
      if (q.signals.length) {
        await supabaseAdmin.from('prospect_signals').insert(q.signals.map(s => ({
          prospect_id: p.id, domain,
          signal_type: String(s.signal_type), signal_value: s.signal_value ?? null,
          confidence: s.confidence ?? 'MEDIUM',
          source_url: s.source_url ?? c.evidence_url ?? null, source_title: s.source_title ?? null,
        })))
      }

      out({
        status: q.result.status, tier: q.result.tier,
        emailStored: Boolean(email), grade,
        drafterVisible: q.result.status === 'QUALIFIED' && Boolean(email),
      })
    }

    const summary = {
      received: contacts.length,
      qualified: results.filter(r => r.status === 'QUALIFIED').length,
      drafterVisible: results.filter(r => r.drafterVisible).length,
      rejected: results.filter(r => r.status === 'rejected').length,
      parked: results.filter(r => r.status === 'parked').length,
      verifiesUsed: verifies,
    }
    return NextResponse.json({ ok: true, ...summary, results })
  } catch (e) {
    console.error('contact intake error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Intake failed' }, { status: 500 })
  }
}
