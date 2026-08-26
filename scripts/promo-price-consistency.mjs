// Price consistency check for the Founding Families promotion:
//   npm run promo:check           (uses the built feeds + catalog)
//   npm run promo:check -- --live (also fetches the live pages' JSON-LD)
//
// Merchant Center disapproves an offer whose landing-page price disagrees with
// its feed price. Four numbers therefore have to be identical for every box,
// in both locales:
//
//   1. what the EN feed advertises   (sale_price, else price)
//   2. what the ES feed advertises   (same)
//   3. what the product page shows   (JSON-LD offer price)
//   4. what Stripe charges           (checkout's unit_amount)
//
// This asserts them against each other rather than against a hardcoded table,
// so it keeps working when the tier prices change.
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
const { foundingSalePrice, priceValidUntil, FOUNDING_TIERS, FOUNDING_MAX_PERCENT } = await load('lib/promo.ts')
const { foundingPromoState } = await load('lib/promo-state.ts')
const { buildProductTsv } = await load('lib/google-feed-tsv.ts')
const { buildEsFeedRows } = await load('lib/google-feed-es.ts')
const { getBoxProducts } = await load('lib/catalog-db.ts')

const live = process.argv.includes('--live')
const usd = c => `$${(c / 100).toFixed(2)}`
const parseUsd = s => (s ? Math.round(parseFloat(String(s).replace(' USD', '')) * 100) : null)

const promo = await foundingPromoState()
console.log('=== FOUNDING FAMILIES PRICE CONSISTENCY ===')
console.log(`promo: ${promo.active ? 'ACTIVE' : 'OFF'} (${promo.reason || 'in window'})  sold ${promo.sold}/${promo.sold + promo.remaining}`)
console.log(`copy claim "up to ${FOUNDING_MAX_PERCENT}% off" — deepest tier discount is ${FOUNDING_MAX_PERCENT}%`)
console.log(`priceValidUntil: ${priceValidUntil()}\n`)

// ── Gather the four views ───────────────────────────────────────────────────
// NOT .trim(): a row whose trailing columns are empty ends in tabs, and
// trimming the whole document drops them from the LAST row — which reads as
// a feed misalignment when it is only the checker's own fault.
const enLines = (await buildProductTsv()).split('\n').filter(l => l.length > 0)
const enHead = enLines[0].split('\t')
const col = (cells, name) => cells[enHead.indexOf(name)]
const enById = new Map()
for (const l of enLines.slice(1)) {
  const c = l.split('\t')
  enById.set(col(c, 'id'), { price: parseUsd(col(c, 'price')), sale: parseUsd(col(c, 'sale_price')), window: col(c, 'sale_price_effective_date') })
}

const { rows: esRows } = await buildEsFeedRows()
const esById = new Map(esRows.map(r => [r.id, { price: parseUsd(r.price), sale: parseUsd(r.sale_price), window: r.sale_price_effective_date }]))

const boxes = await getBoxProducts()

let failures = 0
const fail = m => { console.log(`  ✗ ${m}`); failures++ }

for (const b of boxes) {
  for (const v of b.variants) {
    const id = `box-${b.slug}--${v.key}`
    const expected = (promo.active ? foundingSalePrice(v.price) : null) ?? v.price   // = checkout's unit_amount
    const en = enById.get(id)
    const es = esById.get(`${id}-es`)

    console.log(`${id}  list ${usd(v.price)} → charged ${usd(expected)}`)

    if (!en) { fail(`${id}: missing from the EN feed`); continue }
    const enEffective = en.sale ?? en.price
    if (en.price !== v.price) fail(`${id}: EN feed price ${usd(en.price)} != catalog ${usd(v.price)}`)
    if (enEffective !== expected) fail(`${id}: EN feed charges ${usd(enEffective)}, checkout charges ${usd(expected)}`)
    if (en.sale && !en.window) fail(`${id}: EN feed has sale_price with no sale_price_effective_date`)

    // The ES feed only carries boxes with approved Spanish copy; a box that is
    // legitimately absent is reported, not failed.
    if (!es) { console.log(`    (not in ES feed — no approved Spanish copy)`); continue }
    const esEffective = es.sale ?? es.price
    if (es.price !== v.price) fail(`${id}: ES feed price ${usd(es.price)} != catalog ${usd(v.price)}`)
    if (esEffective !== expected) fail(`${id}: ES feed charges ${usd(esEffective)}, checkout charges ${usd(expected)}`)
    if (enEffective !== esEffective) fail(`${id}: EN ${usd(enEffective)} != ES ${usd(esEffective)} — the two feeds disagree`)
    if (en.window !== es.window) fail(`${id}: sale windows differ between feeds`)
  }
}

// ── Optional: the deployed pages' JSON-LD ───────────────────────────────────
if (live) {
  console.log('\n=== LIVE JSON-LD ===')
  for (const b of boxes) {
    const prices = b.variants.map(v => (promo.active ? foundingSalePrice(v.price) : null) ?? v.price)
    const lo = Math.min(...prices), hi = Math.max(...prices)
    for (const [label, url] of [['EN', `https://petitelavande.com/boxes/${b.slug}`], ['ES', `https://petitelavande.com/es/canastillas/${b.slug}`]]) {
      try {
        const html = await (await fetch(url)).text()
        const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1])
        const prod = blocks.map(x => { try { return JSON.parse(x) } catch { return null } }).find(o => o && o['@type'] === 'Product')
        if (!prod) { fail(`${label} ${b.slug}: no Product JSON-LD`); continue }
        const o = prod.offers ?? {}
        const shown = Math.round(parseFloat(o.price ?? o.lowPrice) * 100)
        const want = o.price ? lo : lo   // single-price boxes and the low end of a range are both `lo`
        console.log(`  ${label} ${b.slug}: JSON-LD ${usd(shown)} (expect ${usd(want)})${o.priceValidUntil ? ` valid until ${o.priceValidUntil}` : ''}`)
        if (shown !== want) fail(`${label} ${b.slug}: JSON-LD ${usd(shown)} != expected ${usd(want)}`)
        if (o.highPrice && Math.round(parseFloat(o.highPrice) * 100) !== hi) fail(`${label} ${b.slug}: JSON-LD highPrice != ${usd(hi)}`)
        if (promo.active && lo !== Math.min(...b.variants.map(v => v.price)) && !o.priceValidUntil)
          fail(`${label} ${b.slug}: on sale but JSON-LD has no priceValidUntil`)
      } catch (e) {
        fail(`${label} ${b.slug}: fetch failed — ${e.message}`)
      }
    }
  }
} else {
  console.log('\n(run with --live to also check the deployed pages\' JSON-LD)')
}

console.log(failures ? `\n${failures} INCONSISTENCIES` : '\nAll prices consistent across feed, page and checkout.')
process.exit(failures ? 1 : 0)
