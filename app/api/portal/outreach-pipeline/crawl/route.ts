import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runContactCrawler } from '@/lib/outreach/contact-crawler'

// On-demand contact crawler + seed intake (Portal-protected).
//
// POST body:
//   seeds?: Array<{ company, domain, metro, industry, size_band, employee_est? }>
//     Directory-crawled companies to add to the NEEDS_CONTACT_RESEARCH backlog.
//     One prospect per domain (unique index) — duplicates are skipped, never
//     overwritten.
//   run?: boolean (default true)  — run the crawler after seeding
//   dry?: boolean                 — crawl + score but write nothing
//   limit?, verifyBudget?         — crawler tunables for a manual run
//
// The daily cron run lives in /api/cron/outreach-draft; this route exists so a
// manual session (or Emily) can push throughput beyond the once-a-day cron.
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Directory industry -> legacy category (classifySegment's strong prior).
const CATEGORY_BY_INDUSTRY: Record<string, string> = {
  law: 'law',
  tech: 'tech_people_ops',
  consulting: 'agencies_pr',
  finance: 'wealth_mgmt',
  real_estate: 'luxury_real_estate',
}

interface Seed { company: string; domain: string; metro?: string; industry?: string; size_band?: string; employee_est?: number }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      seeds?: Seed[]; run?: boolean; dry?: boolean; limit?: number; verifyBudget?: number
    }

    const seeded: string[] = []
    const seedSkipped: { domain: string; why: string }[] = []
    for (const s of body.seeds ?? []) {
      const domain = (s.domain ?? '').trim().toLowerCase()
      const company = (s.company ?? '').trim()
      if (!domain || !company) { seedSkipped.push({ domain: domain || '(none)', why: 'company and domain required' }); continue }
      const { error } = await supabaseAdmin.from('prospects').insert({
        company, domain,
        channel: 'corporate',
        status: 'needs_manual_check',
        qualification_status: 'NEEDS_CONTACT_RESEARCH',
        category: CATEGORY_BY_INDUSTRY[s.industry ?? ''] ?? null,
        industry_key: s.industry ?? null,
        metro: s.metro ?? null,
        company_size_band: s.size_band ?? null,
        ...(s.employee_est ? { employee_count: s.employee_est, employee_count_source: 'inferred' } : {}),
        fit_reason: `Directory-crawled seed: ${s.metro ?? '?'} ${s.industry ?? '?'} firm, ${s.size_band ?? '?'} employees.`,
      })
      if (error) {
        // 23505 = domain already a prospect — expected, never an error state.
        seedSkipped.push({ domain, why: error.code === '23505' ? 'already a prospect' : error.message })
      } else {
        seeded.push(domain)
      }
    }

    const crawl = body.run === false ? null : await runContactCrawler({
      dry: body.dry,
      limit: body.limit,
      verifyBudget: body.verifyBudget,
      timeBudgetMs: 270_000,
    })

    return NextResponse.json({ ok: true, seeded: seeded.length, seedSkipped, crawl })
  } catch (e) {
    console.error('crawl route error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Crawl failed' }, { status: 500 })
  }
}
