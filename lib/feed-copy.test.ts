// node --test lib/feed-copy.test.ts   (npm test)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scrubGots, scrubHardship } from './feed-copy.ts'

const clean = (s: string) => scrubHardship(s)

test('postpartum wording is rewritten (the US visibility flag)', () => {
  assert.equal(clean('New Mom Postpartum Gift Box'), 'New Mom Gift Box')
  assert.equal(clean('Botanical Postpartum Bath Saltz'), 'Botanical New Mom Bath Saltz')
  assert.equal(clean('postpartum recovery kit'), 'new mom Care kit')
  assert.equal(clean('Post-Partum care'), 'New Mom Care')
  assert.equal(clean('Organic Postpartum Calming Sitz Salt Soak'), 'Organic New Mom Calming Bath Salt Soak')
  assert.match(clean('for her postpartum healing'), /new mom/)
  assert.doesNotMatch(clean('postpartum recovery, healing and sitz baths'), /postpartum|recovery|healing|sitz/i)
})

test('sitz bath becomes an ordinary botanical bath', () => {
  assert.equal(clean('Sitz Bath'), 'Bath Soak')
  assert.equal(clean('Sitz Salt Soak'), 'Bath Salt Soak')
  assert.equal(clean('sitz salts'), 'Bath Salts')
  assert.equal(clean('a sitz for her'), 'a bath for her')
})

test('pain and soreness are softened', () => {
  assert.equal(clean('soothes sore gums'), 'soothes little gums')
  assert.equal(clean('relief for sore muscles'), 'comfort for tired body')
  assert.equal(clean('eases teething pain'), 'eases teething discomfort')
  assert.equal(clean('pain relief'), 'comfort')
  assert.equal(clean('aches and pains'), 'tiredness and discomfort')
  assert.equal(clean('painful nights'), 'uncomfortable nights')
})

test('gentle comfort words are deliberately left alone', () => {
  const kept = 'A soothing, calming lovey — soft, gentle and warm for naptime.'
  assert.equal(clean(kept), kept)
})

test('scrub never leaves double spaces or empties the string', () => {
  const out = clean('Postpartum   recovery  bath')
  assert.doesNotMatch(out, /\s{2,}/)
  assert.ok(out.length > 0)
})

test('scrub is idempotent — running it twice changes nothing further', () => {
  for (const s of ['Postpartum Bath Salts', 'relief for sore gums', 'C-Section recovery gift']) {
    assert.equal(clean(clean(s)), clean(s), s)
  }
})

test('GOTS scrub still behaves (no "certified organic organic")', () => {
  assert.equal(scrubGots('GOTS-certified organic cotton'), 'certified organic cotton')
  assert.equal(scrubGots('GOTS certified'), 'certified organic')
  assert.equal(scrubGots('Made with GOTS cotton'), 'Made with certified organic cotton')
})

test('the two scrubs compose without fighting each other', () => {
  const out = scrubHardship(scrubGots('GOTS-certified organic postpartum recovery set'))
  assert.equal(out, 'certified organic new mom Care set')
})
