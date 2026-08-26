// Validate the Spanish Merchant feed and diff it against the English one:
//   npm run feed:es:verify
//
// Two questions, answered against real catalog data rather than assumptions:
//   1. Does every ES row carry the attributes Google requires?
//   2. Is ES coverage 1:1 with EN — same offers, ids differing only by "-es"?
//
// Calls the SAME builders the hosted routes use, so the report and the served
// feeds cannot drift.
import { readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const load = p => import(pathToFileURL(path.join(root, p)).href)
const { buildEsFeedRows } = await load('lib/google-feed-es.ts')
const { buildProductTsv } = await load('lib/google-feed-tsv.ts')

// Google Merchant required attributes for apparel-free gift sets.
const REQUIRED = [
  'id', 'title', 'description', 'link', 'image_link',
  'availability', 'price', 'brand', 'condition', 'google_product_category',
]

const { rows, skipped } = await buildEsFeedRows()

// ── 1. Required-attribute validation ────────────────────────────────────────
console.log('=== ES FEED VALIDATION ===')
console.log(`rows: ${rows.length}   skipped (no approved Spanish): ${skipped.length}\n`)

let problems = 0
for (const r of rows) {
  const missing = REQUIRED.filter(a => !String(r[a] ?? '').trim())
  const issues = missing.map(m => `missing ${m}`)
  if (r.link && !/^https:\/\/petitelavande\.com\/es\//.test(r.link)) issues.push(`link is not an /es/ URL: ${r.link}`)
  if (r.price && !/^\d+\.\d{2} USD$/.test(r.price)) issues.push(`price format: ${r.price}`)
  if (r.image_link && !/^https:\/\//.test(r.image_link)) issues.push('image_link is not https')
  if (r.content_language !== 'es') issues.push(`content_language=${r.content_language}`)
  if (r.target_country !== 'US') issues.push(`target_country=${r.target_country}`)
  if (issues.length) { problems++; console.log(`  ✗ ${r.id}: ${issues.join('; ')}`) }
}
console.log(problems ? `\n${problems} row(s) with problems` : rows.length ? '\nall rows valid' : '\n(no rows to validate)')

// ── 2. Coverage diff against the English feed ───────────────────────────────
const enTsv = await buildProductTsv()
const enLines = enTsv.trim().split('\n')
const enIdIdx = enLines[0].split('\t').indexOf('id')
const enIds = enLines.slice(1).map(l => l.split('\t')[enIdIdx]).filter(Boolean)
const esIds = new Set(rows.map(r => r.id))

console.log('\n=== EN ↔ ES COVERAGE DIFF ===')
console.log(`EN offers: ${enIds.length}   ES offers: ${esIds.size}`)

const missingInEs = enIds.filter(id => !esIds.has(`${id}-es`))
const extraInEs = [...esIds].filter(id => !enIds.includes(id.replace(/-es$/, '')))

if (missingInEs.length) {
  console.log(`\nin EN but NOT in ES (${missingInEs.length}):`)
  for (const id of missingInEs) console.log('  -', id)
}
if (extraInEs.length) {
  console.log(`\nin ES but NOT in EN (${extraInEs.length}):`)
  for (const id of extraInEs) console.log('  +', id)
}
if (!missingInEs.length && !extraInEs.length) console.log('\n1:1 coverage confirmed')

if (skipped.length) {
  console.log('\n=== HELD BACK FOR MISSING SPANISH COPY ===')
  console.log('Add these to `translations` (entity_type catalog_product, locale es, approved true):')
  for (const s of skipped) console.log(`  ${s.slug} — needs: ${s.missing.join(', ')}`)
}

process.exit(problems ? 1 : 0)
