// Run REAL firmographic + signal enrichment against live web search.
//
//   node scripts/enrich-run.mjs <prospects.json> --limit=200 --out=<dir> [--resume]
//
// Writes results to <dir>/enrichment.json. Does NOT touch the database (the v3
// migration may not be applied yet) and never sends email. Safe to re-run:
// --resume skips domains already present in the output file.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { enrichBatch, MAX_ENRICH_BATCH } from '../lib/outreach/enrich.ts'

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
const limit = Number((args.find(a => a.startsWith('--limit=')) ?? '--limit=200').split('=')[1])
const outDir = (args.find(a => a.startsWith('--out=')) ?? '--out=./enrich-out').split('=')[1]
const resume = args.includes('--resume')

if (!file) { console.error('usage: node scripts/enrich-run.mjs <prospects.json> --limit=N --out=DIR'); process.exit(1) }
mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'enrichment.json')

const rows = JSON.parse(readFileSync(file, 'utf8')).filter(p => p.channel !== 'press')

// One target per unique domain.
const seen = new Set()
const targets = []
for (const p of rows) {
  const d = (p.domain || '').toLowerCase().trim()
  if (!d || seen.has(d)) continue
  seen.add(d)
  targets.push({ domain: d, company: p.company, hint: (p.fit_reason || '').slice(0, 200) || null })
}

let done = { firmographics: [], signals: [] }
if (resume && existsSync(outFile)) {
  done = JSON.parse(readFileSync(outFile, 'utf8'))
  console.log(`resuming: ${done.firmographics.length} domains already enriched`)
}
const doneDomains = new Set(done.firmographics.map(f => f.domain))
const todo = targets.filter(t => !doneDomains.has(t.domain)).slice(0, limit)

console.log(`domains total ${targets.length} | to research now ${todo.length} | batch ${MAX_ENRICH_BATCH}`)

let calls = 0, inTok = 0, outTok = 0
const started = Date.now()

for (let i = 0; i < todo.length; i += MAX_ENRICH_BATCH) {
  const batch = todo.slice(i, i + MAX_ENRICH_BATCH)
  try {
    const { firmographics, signals, usage } = await enrichBatch(batch, { dry: true })
    calls++; inTok += usage.input; outTok += usage.output
    done.firmographics.push(...firmographics)
    done.signals.push(...signals)
    const withSize = firmographics.filter(f => f.size_band).length
    console.log(
      `[${String(i + batch.length).padStart(4)}/${todo.length}] call ${calls} ` +
      `-> ${firmographics.length} companies, ${withSize} with size, ${signals.length} signals ` +
      `(${Math.round((Date.now() - started) / 1000)}s)`
    )
    writeFileSync(outFile, JSON.stringify(done, null, 1), 'utf8')
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`batch at ${i} failed:`, msg)
    // Abort immediately on errors that cannot succeed on retry. Without this
    // the loop hammers the API once per remaining batch — a credit-exhausted
    // run burned 22 pointless requests before exiting "successfully".
    if (/credit balance is too low|invalid_request_error|authentication|permission/i.test(msg)) {
      console.error('\nABORTING: this error will not resolve by retrying.')
      console.error(`Progress is saved — re-run with --resume once resolved (${done.firmographics.length} domains done).`)
      process.exit(1)
    }
  }
}

console.log(`\ndone: ${done.firmographics.length} domains, ${done.signals.length} signals`)
console.log(`api calls ${calls} | tokens in ${inTok.toLocaleString()} out ${outTok.toLocaleString()}`)
console.log(`written to ${outFile}`)
