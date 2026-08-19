import { NextRequest, NextResponse } from 'next/server'
import { runContactCrawler } from '@/lib/outreach/contact-crawler'
import { processSeeds, type SeedIn } from '@/lib/outreach/intake'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as {
      seeds?: SeedIn[]; run?: boolean; dry?: boolean; limit?: number; verifyBudget?: number
    }

    const { seeded, skipped: seedSkipped } = await processSeeds(body.seeds ?? [])

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
