// Write the OpenAI Ads feed to a local file for manual upload or inspection:
//   npm run feed:openai
//
// Calls the SAME buildOpenAiFeed() the hosted route uses, so the file and the
// endpoint cannot drift. The CSV is written to the repo root and is gitignored
// — generated catalog data is not committed.
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Same .env.local loading the other maintenance scripts use.
try {
  const env = readFileSync(path.join(root, '.env.local'), 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
} catch {
  console.error('No .env.local found — Supabase credentials are required.')
  process.exit(1)
}

// pathToFileURL: a bare Windows path ('c:\...') is not a valid ESM specifier.
const { buildOpenAiFeed } = await import(pathToFileURL(path.join(root, 'lib/openai-feed.ts')).href)
const { csv, rows, rejected } = await buildOpenAiFeed()

const out = path.join(root, 'petite-lavande-openai-products.csv')
writeFileSync(out, csv, 'utf8')

console.log(`wrote ${out}`)
console.log(`  rows:     ${rows.length}`)
console.log(`  rejected: ${rejected.length}`)
for (const r of rejected) console.log(`     ${r.itemId}: ${r.reasons.join('; ')}`)
for (const r of rows) console.log(`  ${r.item_id.padEnd(38)} ${r.price.padStart(11)}  ${r.availability}`)
