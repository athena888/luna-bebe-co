// node --test lib/openai-feed-core.test.ts   (npm test)
//
// Covers the OpenAI Ads feed rules against the stable spec fetched 2026-08-21:
// https://developers.openai.com/commerce/specs/file-upload/products
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRows, toCsv, csvCell, formatPrice, plainText, clamp, COLUMNS,
  TITLE_MAX, HOST, type FeedInput,
} from './openai-feed-core.ts'

// Every Required field in the spec, plus the flags this feed pins.
const REQUIRED = [
  'item_id', 'title', 'description', 'url', 'image_url', 'price', 'availability',
  'brand', 'seller_name', 'target_countries',
  'is_ads_eligible', 'is_eligible_search', 'is_eligible_checkout',
]

const base = (over: Partial<FeedInput> = {}): FeedInput => ({
  itemId: 'box-signature-baby-gift-box--girl',
  title: 'The Petite — Coral Pink',
  description: 'Twelve hand-packed pieces in a woven basket.',
  url: `${HOST}/boxes/signature-baby-gift-box?tier=girl`,
  imageUrl: 'https://cdn.example.com/petite.jpg',
  priceCents: 9500,
  availability: 'in_stock',
  ...over,
})

/** Minimal RFC-4180 parser, so "it parses back" is actually proven. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += c
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\r') { /* skip */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows
}

test('1. a normal product produces one valid row', () => {
  const { rows, rejected } = buildRows([base()])
  assert.equal(rejected.length, 0)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].item_id, 'box-signature-baby-gift-box--girl')
  assert.equal(rows[0].brand, 'Petite Lavande')
  assert.equal(rows[0].seller_name, 'Petite Lavande')
  assert.equal(rows[0].target_countries, 'US')
  assert.equal(rows[0].condition, 'new')
  assert.equal(rows[0].is_digital, 'false')
})

test('2. commas in a title survive a CSV round trip', () => {
  const { rows } = buildRows([base({ title: 'The Petite, Coral Pink, 12 pieces' })])
  const parsed = parseCsv(toCsv(rows))
  const titleIdx = COLUMNS.indexOf('title')
  assert.equal(parsed[1][titleIdx], 'The Petite, Coral Pink, 12 pieces')
})

test('3. quotes in a description are escaped and recovered', () => {
  const desc = 'She said "this is the one" when it arrived.'
  const { rows } = buildRows([base({ description: desc })])
  const csv = toCsv(rows)
  assert.match(csv, /""this is the one""/)
  const parsed = parseCsv(csv)
  assert.equal(parsed[1][COLUMNS.indexOf('description')], desc)
})

test('4. Unicode and French accents pass through intact', () => {
  const title = 'Mama et Bébé — Fraise'
  const { rows } = buildRows([base({ title, description: 'Canastilla française, faite à la main.' })])
  const parsed = parseCsv(toCsv(rows))
  assert.equal(parsed[1][COLUMNS.indexOf('title')], title)
  assert.match(parsed[1][COLUMNS.indexOf('description')], /française, faite à la main/)
})

test('5. an out-of-stock product is emitted as out_of_stock, not dropped', () => {
  const { rows, rejected } = buildRows([base({ availability: 'out_of_stock' })])
  assert.equal(rejected.length, 0)
  assert.equal(rows[0].availability, 'out_of_stock')
})

test('6. a real sale price is emitted; a fake one is refused', () => {
  const ok = buildRows([base({ priceCents: 9500, salePriceCents: 7600 })])
  assert.equal(ok.rows[0].sale_price, '76.00 USD')
  assert.equal(ok.rows[0].price, '95.00 USD')

  // A "sale" at or above list price is not a discount.
  const bad = buildRows([base({ salePriceCents: 9500 })])
  assert.equal(bad.rows.length, 0)
  assert.ok(bad.rejected[0].reasons.includes('sale price is not below price'))

  // No sale → the column is present but empty, never a fabricated number.
  assert.equal(buildRows([base()]).rows[0].sale_price, '')
})

test('7. a missing or unusable image is rejected with a reason', () => {
  assert.ok(buildRows([base({ imageUrl: null })]).rejected[0].reasons.includes('missing image'))
  assert.ok(buildRows([base({ imageUrl: 'http://cdn.example.com/x.jpg' })]).rejected[0].reasons.includes('malformed image url'))
  assert.ok(buildRows([base({ imageUrl: 'https://cdn.example.com/x.webp' })]).rejected[0].reasons.includes('image is not JPEG/PNG'))
})

test('8. a duplicate item_id is dropped, the first one survives', () => {
  const { rows, rejected } = buildRows([base(), base()])
  assert.equal(rows.length, 1)
  assert.equal(rejected.length, 1)
  assert.ok(rejected[0].reasons.includes('duplicate item_id'))
})

test('9. bad rows are reported without corrupting the good ones', () => {
  const { rows, rejected } = buildRows([
    base(),
    base({ itemId: 'broken', imageUrl: null, priceCents: 0, availability: 'sold' as never }),
    base({ itemId: 'box-two', title: 'The Mama Box' }),
  ])
  assert.equal(rows.length, 2)
  assert.equal(rejected.length, 1)
  assert.deepEqual(rejected[0].reasons.sort(), ['invalid availability', 'invalid price', 'missing image'].sort())
})

test('10. prices are always "N.NN USD"', () => {
  assert.equal(formatPrice(9500), '95.00 USD')
  assert.equal(formatPrice(2997), '29.97 USD')
  assert.equal(formatPrice(16500), '165.00 USD')
  assert.doesNotMatch(formatPrice(9500), /\$/)
  assert.match(buildRows([base()]).rows[0].price, /^\d+\.\d{2} USD$/)
})

test('11. the whole file parses back to the rows that went in', () => {
  const { rows } = buildRows([
    base(),
    base({ itemId: 'b2', title: 'Mama et Bébé — Citron, 14 pieces', description: 'A "lemon" theme.' }),
    base({ itemId: 'b3', title: 'The Mama Box' }),
  ])
  const parsed = parseCsv(toCsv(rows))
  assert.equal(parsed.length, 4)                      // header + 3
  assert.deepEqual(parsed[0], [...COLUMNS])
  for (const line of parsed.slice(1)) assert.equal(line.length, COLUMNS.length)
  assert.equal(parsed[2][COLUMNS.indexOf('title')], 'Mama et Bébé — Citron, 14 pieces')
})

test('12. every emitted row carries every required Ads field', () => {
  const { rows } = buildRows([base(), base({ itemId: 'b2' })])
  for (const row of rows) {
    for (const field of REQUIRED) {
      assert.ok(field in row, `${field} missing from the row`)
      assert.notEqual(row[field], '', `${field} is empty`)
    }
    assert.equal(row.is_ads_eligible, 'true')
    assert.equal(row.is_eligible_search, 'false')
    assert.equal(row.is_eligible_checkout, 'false')
  }
})

test('descriptions are plain text — HTML and markdown are stripped', () => {
  const messy = '<p>Hand-packed <strong>organic</strong> cotton.</p>\n\n**Bold** and [a link](https://x.com)  <script>bad()</script>'
  const out = plainText(messy)
  assert.doesNotMatch(out, /<[^>]+>/)
  assert.doesNotMatch(out, /\*\*|\[|\]\(/)
  assert.doesNotMatch(out, /bad\(\)/)
  assert.match(out, /Hand-packed organic cotton\./)
  assert.doesNotMatch(out, /\s{2,}/)
})

test('titles are clamped to the spec limit on a word boundary', () => {
  const long = 'Petite '.repeat(40)
  const out = clamp(plainText(long), TITLE_MAX)
  assert.ok(out.length <= TITLE_MAX)
  assert.doesNotMatch(out, /Petit$/)
})

test('urls must be absolute HTTPS on the canonical host', () => {
  assert.ok(buildRows([base({ url: '/boxes/x' })]).rejected[0].reasons.includes('malformed url'))
  assert.ok(buildRows([base({ url: 'https://example.com/boxes/x' })]).rejected[0].reasons.includes('url is not on the canonical host'))
  assert.equal(buildRows([base()]).rejected.length, 0)
})

test('ads_metadata is serialized as valid JSON in one cell', () => {
  const { rows } = buildRows([base({ adsMetadata: { product_line: 'new_mom', purchase_intent: 'postpartum_gift', price_tier: 'premium' } })])
  const parsed = parseCsv(toCsv(rows))
  const cell = parsed[1][COLUMNS.indexOf('ads_metadata')]
  assert.deepEqual(JSON.parse(cell), { product_line: 'new_mom', purchase_intent: 'postpartum_gift', price_tier: 'premium' })
})

test('csvCell only quotes when it has to', () => {
  assert.equal(csvCell('plain'), 'plain')
  assert.equal(csvCell('a,b'), '"a,b"')
  assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('line\nbreak'), '"line\nbreak"')
})
