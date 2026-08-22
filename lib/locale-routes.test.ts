// node --test lib/locale-routes.test.ts   (npm test)
// Guards the EN↔ES URL map: a Spanish-labelled link must never point at an
// English page unless that fallback is the documented, deliberate one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { localePath, enPath, switchLocalePath } from './locale-routes.ts'

test('English callers are never rewritten', () => {
  for (const p of ['/', '/boxes', '/account', '/legal/terms']) {
    assert.equal(localePath(p, false), p)
  }
})

test('Spanish twins are used where they exist', () => {
  assert.equal(localePath('/', true), '/es')
  assert.equal(localePath('/boxes', true), '/es/canastillas')
  assert.equal(localePath('/story', true), '/es/historia')
  assert.equal(localePath('/gift-cards', true), '/es/tarjetas-regalo')
  assert.equal(localePath('/our-cotton', true), '/es/nuestro-algodon')
  assert.equal(localePath('/checkout', true), '/es/checkout')
  assert.equal(localePath('/build', true), '/es/build')
  assert.equal(localePath('/legal/returns', true), '/es/legal/devoluciones')
  assert.equal(localePath('/faq', true), '/es/faq')
})

test('dynamic segments survive the swap', () => {
  assert.equal(localePath('/boxes/mama-box', true), '/es/canastillas/mama-box')
  assert.equal(localePath('/collections/newborn', true), '/es/colecciones/newborn')
  assert.equal(localePath('/products/abc-123', true), '/es/productos/abc-123')
})

test('pages with no Spanish twin stay English on purpose', () => {
  // A half-translated legal page is worse than an English one — this is the
  // documented fallback, not an oversight. Labels still localize.
  for (const p of ['/account', '/track', '/corporate', '/press',
                   '/gift-guides', '/legal/privacy', '/legal/terms']) {
    assert.equal(localePath(p, true), p)
  }
})

test('/boxes and /build are not confused by prefix matching', () => {
  assert.equal(localePath('/build', true), '/es/build')
  assert.equal(localePath('/boxes', true), '/es/canastillas')
})

test('enPath inverts localePath', () => {
  for (const p of ['/', '/boxes', '/boxes/mama-box', '/story', '/gift-cards',
                   '/legal/returns', '/collections/newborn', '/products/x1', '/faq']) {
    assert.equal(enPath(localePath(p, true)), p, `round-trip failed for ${p}`)
  }
})

test('the switcher keeps the reader on the same page', () => {
  assert.equal(switchLocalePath('/boxes/mama-box', 'es'), '/es/canastillas/mama-box')
  assert.equal(switchLocalePath('/es/canastillas/mama-box', 'en'), '/boxes/mama-box')
  assert.equal(switchLocalePath('/es/historia', 'en'), '/story')
  assert.equal(switchLocalePath('/story', 'es'), '/es/historia')
})

test('the switcher is idempotent and safe on untwinned pages', () => {
  assert.equal(switchLocalePath('/es/canastillas', 'es'), '/es/canastillas')
  assert.equal(switchLocalePath('/boxes', 'en'), '/boxes')
  // /corporate has no Spanish twin: asking for Spanish leaves you on the
  // English page rather than linking to a 404.
  assert.equal(switchLocalePath('/corporate', 'es'), '/corporate')
})
