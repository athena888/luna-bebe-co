// node --test lib/site-config.test.ts   (npm test)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { conflictsWithReturnsPolicy, RETURNS_SUMMARY, RETURNS_SUMMARY_ES } from './site-config.ts'

// Our policy: cancel within 24 hours; NO change-of-mind returns once shipped;
// damaged or incorrect reported within 7 days. Merchant Center carries the
// same policy ("defective products only"), and Google disapproves a listing
// whose landing page promises something friendlier — so stored copy that
// invents a return window has to be caught before it is published.

test('a promised return window is a conflict, in either language', () => {
  assert.ok(conflictsWithReturnsPolicy('Unopened boxes are returnable within 30 days.'))
  assert.ok(conflictsWithReturnsPolicy('We accept returns within 30 days of delivery.'))
  assert.ok(conflictsWithReturnsPolicy('Enjoy 30-day returns on every order.'))
  assert.ok(conflictsWithReturnsPolicy('Returns accepted within 14 days.'))
  assert.ok(conflictsWithReturnsPolicy('Aceptamos devoluciones dentro de 30 días.'))
  assert.ok(conflictsWithReturnsPolicy('Tienes 30 días para devoluciones.'))
})

test('conditions and freebies we never offer are conflicts', () => {
  assert.ok(conflictsWithReturnsPolicy('Boxes may be returned unopened.'))
  assert.ok(conflictsWithReturnsPolicy('Las cajas sin abrir se pueden devolver.'))
  assert.ok(conflictsWithReturnsPolicy('Free returns, always.'))
  assert.ok(conflictsWithReturnsPolicy('Devoluciones gratis en todos los pedidos.'))
  assert.ok(conflictsWithReturnsPolicy('Backed by our money-back guarantee.'))
})

// The narrow half of the job: our OWN correct wording must never be flagged,
// or the guard would start deleting the very answers we want published.
test('the real policy, and its legitimate day counts, pass', () => {
  assert.equal(conflictsWithReturnsPolicy(RETURNS_SUMMARY), false)
  assert.equal(conflictsWithReturnsPolicy(RETURNS_SUMMARY_ES), false)
  // Damaged goods reported within 7 days — a reporting window, not a return window.
  assert.equal(conflictsWithReturnsPolicy(
    'If your order arrives damaged or contains the wrong items, please contact us within 7 days of delivery with photos.'), false)
  assert.equal(conflictsWithReturnsPolicy(
    'Si tu pedido llega dañado o con algo que no pediste, escríbenos dentro de los 7 días con fotos.'), false)
  // Money moving back, not goods.
  assert.equal(conflictsWithReturnsPolicy(
    'Approved refunds are processed within 3–5 business days and appear within 5–10 business days.'), false)
  assert.equal(conflictsWithReturnsPolicy('Every textile is organic cotton from GOTS-certified makers.'), false)
  assert.equal(conflictsWithReturnsPolicy(''), false)
  assert.equal(conflictsWithReturnsPolicy(null), false)
})
