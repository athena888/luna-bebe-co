// Seeds the translations table from scripts/spanish-seed.json (approved=false
// — the reviewer's approval flips per-entity approval later, or run with
// --approve after the skim pass). Requires §44. Idempotent upsert.
//   node scripts/seed-spanish-translations.mjs [--approve]
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
}
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const approve = process.argv.includes('--approve')
const rows = JSON.parse(readFileSync(new URL('./spanish-seed.json', import.meta.url), 'utf8'))

let ok = 0
for (const r of rows) {
  const { error } = await supa.from('translations').upsert(
    { ...r, locale: 'es', approved: approve, updated_at: new Date().toISOString() },
    { onConflict: 'entity_type,entity_id,locale,field' }
  )
  if (error) { console.error('FAIL', r.entity_type, r.entity_id, r.field, error.message); process.exit(1) }
  ok++
}
console.log(`seeded ${ok} translations (approved=${approve})`)
