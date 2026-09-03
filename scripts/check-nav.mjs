// Guard for the header's pre-hydration box list.
//
// components/layout/Header.tsx ships DEFAULT_BOX_PRODUCTS as the SSR fallback
// so crawlers see the Gift Boxes links before /api/catalog-nav answers. That
// list is hand-maintained, so it can drift out of sync with the catalog — on
// 2026-08-18 it still carried Noël, an unpublished draft, which meant every
// page in both locales rendered a header link to a 404.
//
// This checks every fallback slug against the live catalog. Exit 1 on drift.
//   npm run check:nav
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf8')
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
}
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const header = readFileSync('components/layout/Header.tsx', 'utf8')
const block = header.match(/const DEFAULT_BOX_PRODUCTS[^=]*=\s*\[([\s\S]*?)\]/)
if (!block) { console.error('FAIL: DEFAULT_BOX_PRODUCTS not found in Header.tsx'); process.exit(1) }
const slugs = [...block[1].matchAll(/slug:\s*'([^']+)'/g)].map(m => m[1])

const { data, error } = await supa.from('catalog_products').select('slug, name, active, visible')
if (error) { console.error('FAIL: catalog read —', error.message); process.exit(1) }
const live = new Map((data ?? []).map(p => [p.slug, p]))

let bad = 0
console.log(`header fallback lists ${slugs.length} boxes:`)
for (const s of slugs) {
  const p = live.get(s)
  const ok = p && p.active && p.visible
  if (!ok) bad++
  console.log(`  ${ok ? 'OK  ' : 'DEAD'} ${s}${p ? ` (active=${p.active} visible=${p.visible})` : ' — no such box'}`)
}

// The "best for" tags rendered beside each nav entry live in
// lib/gifting-copy.ts and are keyed by slug, so they drift the same way the
// fallback list does. A stale key is harmless on screen (the tag simply
// disappears), but it means the header, the product page and the occasion
// pages have quietly stopped describing a box — worth reporting, not fatal.
const copy = readFileSync('lib/gifting-copy.ts', 'utf8')
const bestForBlock = copy.match(/BEST_FOR_BY_SLUG[^=]*=\s*\{([\s\S]*?)\n\}/)
if (bestForBlock) {
  const tagged = [...bestForBlock[1].matchAll(/^\s*'([^']+)':/gm)].map(m => m[1])
  const stale = tagged.filter(s => !live.has(s))
  const untagged = (data ?? []).filter(p => p.active && p.visible && !tagged.includes(p.slug)).map(p => p.slug)
  if (stale.length) console.log(`\nBEST_FOR_BY_SLUG keys with no such box: ${stale.join(', ')}`)
  if (untagged.length) console.log(`published boxes with no "best for" line: ${untagged.join(', ')}`)
  if (!stale.length && !untagged.length) console.log('\nBEST_FOR_BY_SLUG: every published box has a "best for" line.')
} else {
  console.log('\nnote: BEST_FOR_BY_SLUG not found in lib/gifting-copy.ts — skipped.')
}

// The reverse drift: published boxes the fallback never mentions (fine, but
// worth seeing — they only appear once the API answers).
const missing = (data ?? []).filter(p => p.active && p.visible && !slugs.includes(p.slug)).map(p => p.slug)
if (missing.length) console.log(`\npublished but not in the fallback (appear post-hydration): ${missing.join(', ')}`)

if (bad) { console.error(`\nFAIL: ${bad} nav entr${bad === 1 ? 'y' : 'ies'} would render a link to a 404.`); process.exit(1) }
console.log('\nPASS: every fallback nav entry resolves to a published box.')
