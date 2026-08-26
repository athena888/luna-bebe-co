// node --test lib/promo.test.ts   (npm test)
//
// The pure half of the Founding Families promotion. Everything the feeds, the
// product pages and the Stripe checkout rely on resolves through these
// functions, so a wrong answer here is a Merchant Center disapproval.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  foundingSalePrice, resolvePrice, effectivePrice, inFoundingWindow, foundingBadge,
  saleEffectiveDate, priceValidUntil, FOUNDING_TIERS, FOUNDING_LIMIT,
  FOUNDING_MAX_PERCENT, FOUNDING_BADGE, FOUNDING_CODE,
} from './promo.ts'

test('every advertised tier maps to its stated price', () => {
  assert.equal(foundingSalePrice(6500), 5500)    // $65 → $55
  assert.equal(foundingSalePrice(9500), 8000)    // $95 → $80
  assert.equal(foundingSalePrice(12500), 10500)  // $125 → $105
  assert.equal(foundingSalePrice(16500), 14000)  // $165 → $140
})

test('a price that is not a tier gets no sale', () => {
  // Build Your Own ($29.97) and every standalone item must be excluded — this
  // is what keeps blankets and dolls out of the promotion.
  assert.equal(foundingSalePrice(2997), null)
  assert.equal(foundingSalePrice(3800), null)
  assert.equal(foundingSalePrice(0), null)
  assert.equal(foundingSalePrice(9501), null)   // one cent off a tier is not a tier
})

test('"15% off" is delivered at every tier and never overstated', () => {
  // A customer who checks the arithmetic must never find they got LESS than
  // the copy promised; rounding to fives should also not drift far past it.
  const percents = Object.entries(FOUNDING_TIERS)
    .map(([full, sale]) => (1 - Number(sale) / Number(full)) * 100)
  assert.ok(Math.min(...percents) >= 15, 'every tier must deliver at least the advertised 15%')
  assert.ok(Math.max(...percents) <= 17, 'rounding should not drift far past the claim')
  assert.equal(FOUNDING_MAX_PERCENT, 16)
})

test('the badge counts down, and gets singular/plural right in both languages', () => {
  assert.equal(foundingBadge(20), 'Founding Families — 20 left')
  assert.equal(foundingBadge(7), 'Founding Families — 7 left')
  assert.equal(foundingBadge(1), 'Founding Families — 1 left')
  assert.equal(foundingBadge(20, 'es'), 'Familias Fundadoras — quedan 20')
  assert.equal(foundingBadge(1, 'es'), 'Familias Fundadoras — queda 1')
  // Never advertise a negative or fractional remainder.
  assert.equal(foundingBadge(-3), 'Founding Families — 0 left')
  assert.equal(foundingBadge(2.7), 'Founding Families — 2 left')
})

test('every sale price is strictly below its list price', () => {
  for (const [full, sale] of Object.entries(FOUNDING_TIERS)) {
    assert.ok(sale < Number(full), `${full} → ${sale} is not a discount`)
    assert.ok(sale > 0)
  }
})

test('resolvePrice honours the promo gate — off means list price', () => {
  assert.deepEqual(resolvePrice(16500, true), { price: 16500, salePrice: 14000 })
  assert.deepEqual(resolvePrice(16500, false), { price: 16500, salePrice: null })
  assert.equal(effectivePrice(resolvePrice(16500, true)), 14000)
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
  assert.equal(FOUNDING_LIMIT, 20)
  assert.equal(FOUNDING_CODE, 'FOUNDING30')
  assert.match(FOUNDING_BADGE.en, /first 20 boxes/)
  assert.match(FOUNDING_BADGE.es, /primeras 20 cajas/)
})
