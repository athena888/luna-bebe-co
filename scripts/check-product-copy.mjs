// Reports products missing customer-facing copy, and copy whose claims don't
// match the product record. Read-only: it never writes and never generates
// copy — the list is for a human to fill in.
//   npm run check:copy
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supa
  .from('products')
  .select('id, name, description, ingredients, organic, active, price')
  .order('id')
if (error) { console.error('read failed:', error.message); process.exit(1) }

const blank = v => !v || !String(v).trim()
const rows = (data ?? []).filter(p => p.active)
const noDesc = rows.filter(p => blank(p.description))
const noMat = rows.filter(p => blank(p.ingredients))

console.log(`active products: ${rows.length}`)
console.log(`  missing description : ${noDesc.length}`)
console.log(`  missing materials   : ${noMat.length}`)

if (noDesc.length) {
  console.log('\n--- MISSING DESCRIPTION ---')
  for (const p of noDesc) console.log(`  ${p.id}  —  ${p.name}`)
}
if (noMat.length) {
  console.log('\n--- MISSING MATERIALS ---')
  for (const p of noMat) console.log(`  ${p.organic ? 'ORGANIC ' : ''}${p.id}  —  ${p.name}`)
}

// Claim mismatch: copy that says "organic" on a product whose organic flag is
// false and whose materials line doesn't say organic either. Found in the
// 2026-08-18 audit — The Little Sheep Knit Blanket's description says "woven
// from breathable organic cotton" while organic=false and materials="Cotton".
// Either the flag is wrong or the copy is; both need a human, never a guess.
const mismatch = rows.filter(p =>
  /\borganic\b/i.test(String(p.description ?? '')) &&
  !p.organic &&
  !/organic/i.test(String(p.ingredients ?? '')))
if (mismatch.length) {
  console.log(`\n--- COPY SAYS "ORGANIC", RECORD DOES NOT (${mismatch.length}) ---`)
  for (const p of mismatch) {
    console.log(`  ${p.id}`)
    console.log(`      name      : ${p.name}`)
    console.log(`      materials : "${p.ingredients ?? ''}"   organic flag: ${p.organic}`)
  }
}

const thin = rows.filter(p => !blank(p.description) && String(p.description).trim().length < 120)
if (thin.length) {
  console.log(`\n--- THIN DESCRIPTION (<120 chars) ---`)
  for (const p of thin) console.log(`  ${String(p.description).trim().length} chars  ${p.id}  —  ${p.name}`)
}
