// node --test lib/purchase-analytics.test.ts   (npm test)
// Stripe is the purchase source of truth: an order advances (and a GA4
// purchase fires) only for a PAID session, exactly once, live mode only.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { orderAdvanceDecision, purchaseAnalyticsAllowed } from './purchase-analytics.ts'
import { buildPurchaseBody } from './ga-measurement-protocol.ts'

const paidSession = (over: Record<string, unknown> = {}) => ({
  livemode: true,
  payment_status: 'paid',
  metadata: { order_id: 'ord_123' },
  ...over,
})

// TEST 11 — successful verified Stripe webhook: the order advances (one order,
// created 'pending' at session creation, moves to 'processing' exactly once).
test('a paid session with a pending order advances', () => {
  assert.deepEqual(orderAdvanceDecision(paidSession(), 'pending'), { advance: true })
})

// TEST 12 — same Stripe webhook delivered twice: still exactly one order
test('a replayed delivery for an already-advanced order never advances again', () => {
  for (const status of ['processing', 'shipped', 'delivered', 'refunded', 'cancelled']) {
    const d = orderAdvanceDecision(paidSession(), status)
    assert.equal(d.advance, false)
    assert.equal(!d.advance && d.reason, 'already-advanced')
  }
})

// TEST 13 — unpaid/expired checkout: zero order/purchase creation
test('an unpaid completed session (async payment pending) never advances', () => {
  for (const payment_status of ['unpaid', 'no_payment_required', null, undefined]) {
    const d = orderAdvanceDecision(paidSession({ payment_status }), 'pending')
    assert.equal(d.advance, false)
    assert.equal(!d.advance && d.reason, 'not-paid')
  }
})

test('a session without our order_id metadata is ignored', () => {
  const d = orderAdvanceDecision(paidSession({ metadata: {} }), 'pending')
  assert.equal(d.advance, false)
  assert.equal(!d.advance && d.reason, 'no-order-id')
})

test('an order_id matching no row never runs side effects', () => {
  const d = orderAdvanceDecision(paidSession(), null)
  assert.equal(d.advance, false)
  assert.equal(!d.advance && d.reason, 'no-order-row')
})

// TEST 14 / 15 — one GA4 purchase per paid transaction, never for test mode.
// (Once-per-transaction is the advance gate above: the purchase event is sent
// only on the single pending→processing transition; GA4 additionally dedupes
// on transaction_id = order id.)
test('purchase analytics fire for live mode only', () => {
  assert.equal(purchaseAnalyticsAllowed(true), true)
  assert.equal(purchaseAnalyticsAllowed(false), false)   // stripe listen / test keys
  assert.equal(purchaseAnalyticsAllowed(null), false)    // hand-built payloads
  assert.equal(purchaseAnalyticsAllowed(undefined), false)
})

// TEST 16 — purchase payload: transaction_id, USD currency, value, item data
test('the GA4 MP purchase payload carries the exact transaction fields', () => {
  const body = buildPurchaseBody({
    orderId: 'ord_123',
    valueCents: 8286,
    currency: 'USD',
    clientId: '111.222',
    sessionId: '333',
    items: [
      { id: 'swaddle-1', name: 'Organic Swaddle', price: 3400, qty: 2, category: 'swaddle' },
      { id: 'romper-2', name: 'Pointelle Romper', price: 1486 },
    ],
  }, 'https://petitelavande.com')

  assert.equal(body.client_id, '111.222')
  const [ev] = body.events
  assert.equal(ev.name, 'purchase')
  assert.equal(ev.params.transaction_id, 'ord_123')
  assert.equal(ev.params.currency, 'USD')
  assert.equal(ev.params.value, 82.86)
  assert.deepEqual(ev.params.items, [
    { item_id: 'swaddle-1', item_name: 'Organic Swaddle', price: 34, quantity: 2, item_category: 'swaddle' },
    { item_id: 'romper-2', item_name: 'Pointelle Romper', price: 14.86, quantity: 1, item_category: undefined },
  ])
})

test('without a browser client id the purchase still lands under a stable server id', () => {
  const body = buildPurchaseBody({ orderId: 'ord_123', valueCents: 100 }, 'https://petitelavande.com')
  assert.equal(body.client_id, 'srv.ord_123')  // stable — a replay maps to the same id
  assert.equal(body.events[0].params.currency, 'USD')
})

test('internal orders are tagged so a GA4 internal filter can drop them', () => {
  const body = buildPurchaseBody({ orderId: 'ord_123', valueCents: 100, internal: true }, 'https://petitelavande.com')
  assert.equal((body.events[0].params as Record<string, unknown>).traffic_type, 'internal')
})
