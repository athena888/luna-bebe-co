// node --test lib/promo.test.ts   (npm test)
//
// The pure half of the Founding Families promotion. Everything the feeds, the
// product pages and the Stripe checkout rely on resolves through these
// functions, so a wrong answer here is a Merchant Center disapproval.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  foundingSalePrice, resolvePrice, effectivePrice, inFoundingWindow,
  saleEffectiveDate, priceValidUntil, FOUNDING_TIERS, FOUNDING_LIMIT,
  FOUNDING_MAX_PERCENT, FOUNDING_BADGE, FOUNDING_CODE,
} from './promo.ts'

test('every advertised tier maps to its stated price', () => {
  assert.equal(foundingSalePrice(6500), 4900)    // $65 → $49
  assert.equal(foundingSalePrice(9500), 6800)    // $95 → $68
  assert.equal(foundingSalePrice(12500), 8800)   // $125 → $88
  assert.equal(foundingSalePrice(16500), 11500)  // $165 → $115
})

test('a price that is not a tier gets no sale', () => {
  // Build Your Own ($29.97) and every standalone item must be excluded — this
  // is what keeps blankets and dolls out of the promotion.
  assert.equal(foundingSalePrice(2997), null)
  assert.equal(foundingSalePrice(3800), null)
  assert.equal(foundingSalePrice(0), null)
  assert.equal(foundingSalePrice(9501), null)   // one cent off a tier is not a tier
})

test('"up to 30% off" is literally true and not an overstatement', () => {
  // The claim must be >= every actual discount, and reached by at least one.
  const percents = Object.entries(FOUNDING_TIERS)
    .map(([full, sale]) => (1 - Number(sale) / Number(full)) * 100)
  assert.ok(Math.max(...percents) <= 30.5, 'no tier may exceed the advertised 30%')
  assert.ok(Math.max(...percents) >= 29.5, 'at least one tier must reach ~30% or the copy oversells')
  assert.equal(FOUNDING_MAX_PERCENT, 30)
})

test('every sale price is strictly below its list price', () => {
  for (const [full, sale] of Object.entries(FOUNDING_TIERS)) {
    assert.ok(sale < Number(full), `${full} → ${sale} is not a discount`)
    assert.ok(sale > 0)
  }
})

test('resolvePrice honours the promo gate — off means list price', () => {
  assert.deepEqual(resolvePrice(16500, true), { price: 16500, salePrice: 11500 })
  assert.deepEqual(resolvePrice(16500, false), { price: 16500, salePrice: null })
  assert.equal(effectivePrice(resolvePrice(16500, true)), 11500)
  assert.equal(effectivePrice(resolvePrice(16500, false)), 16500)
})

test('the window excludes instants on either side', () => {
  assert.ok(inFoundingWindow(new Date('2026-09-01T12:00:00Z')))
  assert.ok(!inFoundingWindow(new Date('2026-08-01T00:00:00Z')))
  assert.ok(!inFoundingWindow(new Date('2027-01-01T00:00:00Z')))
})

test('the feed window and the JSON-LD date describe the same end', () => {
  // Google compares sale_price_effective_date against the landing page's
  // priceValidUntil; if they disagree the offer reads as stale.
  const [, end] = saleEffectiveDate().split('/')
  assert.equal(end.slice(0, 10), priceValidUntil())
  assert.match(saleEffectiveDate(), /^\d{4}-\d\d-\d\dT.+\/\d{4}-\d\d-\d\dT.+$/)
})

test('the promo constants match what the marketing says', () => {
  assert.equal(FOUNDING_LIMIT, 30)
  assert.equal(FOUNDING_CODE, 'FOUNDING30')
  assert.match(FOUNDING_BADGE.en, /first 30 boxes/)
  assert.match(FOUNDING_BADGE.es, /primeras 30 cajas/)
})
