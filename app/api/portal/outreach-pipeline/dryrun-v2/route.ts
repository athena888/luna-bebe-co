import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { scrapeAndQualify } from '@/lib/outreach/prospector-v2'
import { renderSlot } from '@/lib/outreach/drafter-v2'
import { renderFrozenTemplate, FROZEN_TEMPLATES, outreachFooter, pickTrack, subjectVariantForSlot } from '@/lib/outreach/templates'
import { estimateCostUsd } from '@/lib/outreach/api-ledger'
import { DAILY_SEND_CAP, INDUSTRIES } from '@/lib/outreach/targeting'
import type { PitchTrack } from '@/lib/outreach/targeting'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Targeting-v2 acceptance dry run: scrape → qualify → select → render one full
// day (25 emails) into outreach-preview/ at the repo root. NO sending, NO DB
// writes, no verifier quota spent (email discovery is skipped — recipients are
// previewed as preview@domain). Intended to be run locally (next dev) — the
// preview folder is the local filesystem. Gated by CRON_SECRET like the crons.

const SEARCH_MODEL = 'claude-sonnet-4-6'
const QUALIFY_MODEL = 'claude-haiku-4-5-20251001'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 })
  }

  try {
    // ?date=YYYY-MM-DD simulates that day's combo (e.g. a multi-industry week
    // to exercise the qualification call); default is today's real combo.
    const dateParam = req.nextUrl.searchParams.get('date')
    const date = dateParam ? new Date(`${dateParam}T12:00:00Z`) : new Date()
    const scraped = await scrapeAndQualify({ dry: true, want: 35, date })
    const q = scraped.qualify

    const previewDir = path.join(process.cwd(), 'outreach-preview')
    await mkdir(previewDir, { recursive: true })

    // Select + render the day's batch — same deterministic path as the drafter.
    const usable = scraped.qualified.filter(c => c.persona_match)
    const industrySlots: Record<string, number> = {}
    const trackSlots: Record<string, number> = {}
    let globalSlot = 0
    const files: string[] = []
    const rendered: Array<{ file: string; track: string; variant: string; company: string }> = []
    const skips: Array<{ company: string; why: string }> = []

    for (const c of usable) {
      if (globalSlot >= DAILY_SEND_CAP) break
      const industry = INDUSTRIES[c.industry_key]
      if (!industry) { skips.push({ company: c.company, why: `unknown industry ${c.industry_key}` }); continue }
      const slot = industrySlots[c.industry_key] ?? 0
      const track = pickTrack(industry.track, slot)
      const variant = subjectVariantForSlot(trackSlots[track] ?? 0)
      const draft = renderSlot(
        { company: c.company, person_name: c.person_name },
        c.industry_key, scraped.combo.city, track, variant,
      )
      if ('error' in draft) { skips.push({ company: c.company, why: draft.error }); continue }
      industrySlots[c.industry_key] = slot + 1
      trackSlots[track] = (trackSlots[track] ?? 0) + 1
      globalSlot++

      const previewTo = `preview@${c.domain}`
      const footer = outreachFooter(previewTo) ?? '\n\n[FOOTER BLOCKED: BUSINESS_ADDRESS is not set — sends would be refused]'
      const file = `${String(globalSlot).padStart(2, '0')}-${draft.comboKey}-${draft.track}-${draft.variant}.txt`
      await writeFile(path.join(previewDir, file),
        `To: ${c.person_name} <${previewTo}>\nSubject: ${draft.subject}\nX-Combo: ${draft.comboKey} · X-Track: ${draft.track} · X-Variant: ${draft.variant}\nX-Qualified-Via: ${c.qualification_via} (${c.qualification_reason})\n\n${draft.body}${footer}`,
        'utf8')
      files.push(file)
      rendered.push({ file, track: draft.track, variant: draft.variant, company: c.company })
    }

    // The three review samples requested in the acceptance check — one per
    // named track, using the first real scraped prospect's data.
    const sample = usable[0] ?? { company: 'Meridian Advisors', person_name: 'Jordan Lee', domain: 'example.com' }
    const samples: Record<string, { subject: string; body: string }> = {}
    for (const track of ['EMPLOYEE_GIFTING', 'CLIENT_GIFTING', 'REFERRAL_PARTNER'] as PitchTrack[]) {
      const r = renderFrozenTemplate(FROZEN_TEMPLATES[track], 'A', {
        first_name: (sample.person_name ?? '').split(/\s+/)[0], company: sample.company,
      })
      if ('error' in r) continue
      const footer = outreachFooter(`preview@${sample.domain}`) ?? ''
      samples[track] = { subject: r.subject, body: r.body + footer }
      await writeFile(path.join(previewDir, `SAMPLE-${track}.txt`), `Subject: ${r.subject}\n\n${r.body}${footer}`, 'utf8')
    }

    const searchCost = estimateCostUsd(SEARCH_MODEL, scraped.searchTokens.input, scraped.searchTokens.output)
    const qualifyCost = q ? estimateCostUsd(QUALIFY_MODEL, q.inputTokens, q.outputTokens) : 0

    return NextResponse.json({
      ok: true,
      combo: scraped.combo,
      apiCalls: {
        prospect_search: { model: SEARCH_MODEL, calls: 1, tokens: scraped.searchTokens, estCostUsd: +searchCost.toFixed(4) },
        qualification: q?.apiCalls
          ? { model: QUALIFY_MODEL, calls: q.apiCalls, tokens: { input: q.inputTokens, output: q.outputTokens }, estCostUsd: +qualifyCost.toFixed(4) }
          : { calls: 0, skippedVia: q?.sourceTagged ? 'source-tagged (single-industry week)' : 'cache/deferred' },
      },
      totalEstCostUsd: +(searchCost + qualifyCost).toFixed(4),
      scraped: scraped.candidates.length,
      qualified: scraped.qualified.length,
      personaMatched: usable.length,
      qualifyStats: q,
      renderedCount: rendered.length,
      previewDir,
      files,
      skips,
      samples,
      industryBreakdown: Object.fromEntries(Object.entries(industrySlots).map(([k, v]) => [INDUSTRIES[k]?.label ?? k, v])),
    })
  } catch (e) {
    console.error('dryrun-v2 error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'dry run failed' }, { status: 500 })
  }
}
