// Render the emails the v3 pipeline WOULD send — without a database and
// without sending anything.
//
//   node scripts/preview-drafts.mjs <prospects.json> --enrichment=<file> [--n=5]
//
// Qualifies in memory, ranks by the real selection order, composes the
// researched opening from stored evidence, renders the frozen template, and
// prints the result. Nothing is written anywhere.

import { readFileSync } from 'node:fs'
import { qualifyRecord } from '../lib/outreach/qualify-v3.ts'
import { rankForSend } from '../lib/outreach/scoring.ts'
import { buildOpening, openingSource } from '../lib/outreach/opening.ts'
import { templateFor, renderTemplateV3, findBannedContent } from '../lib/outreach/templates-v3.ts'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const enrichFile = (args.find(a => a.startsWith('--enrichment=')) ?? '').split('=')[1]
const n = Number((args.find(a => a.startsWith('--n=')) ?? '--n=5').split('=')[1])

const rows = JSON.parse(readFileSync(file, 'utf8')).filter(p => p.channel !== 'press')
const firmo = new Map(), sigs = new Map()
if (enrichFile) {
  const e = JSON.parse(readFileSync(enrichFile, 'utf8'))
  for (const f of e.firmographics) firmo.set(f.domain.toLowerCase(), f)
  for (const s of e.signals) {
    const d = s.domain.toLowerCase()
    if (!sigs.has(d)) sigs.set(d, [])
    sigs.get(d).push(s)
  }
}

const qualified = []
for (const p of rows) {
  const domain = (p.domain ?? '').toLowerCase()
  const f = firmo.get(domain)
  if (!f) continue
  const out = qualifyRecord({
    company: p.company, domain, category: p.category, title: p.title,
    personName: p.person_name, email: p.email, emailGrade: p.email_grade,
    fitReason: [f.research_summary, p.fit_reason].filter(Boolean).join(' '),
    sourceUrl: f.source_urls?.[0], researchAgeDays: 0,
    known: { sizeBand: f.size_band, sizeConfidence: f.size_confidence },
    extraSignals: sigs.get(domain) ?? [],
  })
  if (out.result.status === 'QUALIFIED') qualified.push({ p, out, domain })
}

const ranked = rankForSend(qualified.map(({ p, out }) => ({
  id: p.id, qualification_tier: out.result.tier, qualification_score: out.result.score,
  recurring_potential: out.result.recurring, contact_fit_score: out.result.contactFit,
  intent_score: out.result.intent, data_quality_score: out.result.dataQuality,
  qualified_at: null, segment: out.segment,
})))
const byId = new Map(qualified.map(q => [q.p.id, q]))

console.log(`${qualified.length} qualified — showing the top ${Math.min(n, ranked.length)} in real send order\n`)

let slot = 0
for (const r of ranked.slice(0, n)) {
  const { p, out, domain } = byId.get(r.id)
  const signals = sigs.get(domain) ?? []
  const opening = buildOpening({ company: p.company, segment: out.segment, signals })
  console.log('='.repeat(74))
  console.log(`${p.company}  |  ${out.segment}  |  score ${out.result.score} ${out.result.tier}  |  ${out.sizeBand}`)
  console.log(`to: ${p.person_name} — ${out.result.titleClean}`)
  console.log(`opening derived from: ${openingSource({ company: p.company, segment: out.segment, signals }) ?? 'NONE'}`)
  if (!opening) { console.log('\n  SKIPPED — no substantive signal, no first touch sent.\n'); continue }
  const tpl = templateFor(out.segment, 0)
  const rendered = renderTemplateV3(tpl, slot++ % 2 === 0 ? 'A' : 'B', {
    first_name: p.person_name?.split(/\s+/)[0], company: p.company, opening,
  })
  if (!rendered.ok) { console.log(`\n  SKIPPED — ${rendered.error}\n`); continue }
  console.log(`banned-content check: ${findBannedContent(rendered.body) ? 'FAIL' : 'clean'}`)
  console.log(`\nSubject: ${rendered.subject}\n`)
  console.log(rendered.body)
  console.log()
}
