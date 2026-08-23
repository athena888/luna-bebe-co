// node --test lib/pipeline/drafter-links.test.ts   (npm test)
// The "exactly one link" rule is what every cold draft is judged by, so the
// counter itself needs to be right.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linkCount } from './draft-rules.ts'

test('an email address on the brand domain is not counted as a link', () => {
  // The real signature that broke drafting: address + one CTA link.
  const signature = 'Warmly,\nPetite Lavande\nhello@petitelavande.com\npetitelavande.com/corporate'
  assert.equal(linkCount(signature), 1)
})

test('the one real link is still counted', () => {
  assert.equal(linkCount('see petitelavande.com/corporate'), 1)
  assert.equal(linkCount('see https://petitelavande.com/corporate'), 1)
  assert.equal(linkCount('see www.petitelavande.com'), 1)
})

test('a genuine second link is still rejected by the rule', () => {
  const two = 'petitelavande.com/corporate and https://example.com/pricing'
  assert.equal(linkCount(two), 2)
})

test('an address alone counts as no link at all', () => {
  assert.equal(linkCount('reply to hello@petitelavande.com'), 0)
  assert.equal(linkCount('reply to emily+test@petitelavande.com'), 0)
})

test('a body with no link or address counts zero', () => {
  assert.equal(linkCount('Hi Sarah, congratulations on the new arrival.'), 0)
})
