// node --test lib/analytics-events.test.ts   (npm test)
// The client ecommerce events: one user action → at most one event, and
// rendering/hydration/state syncs can never fire anything.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cartGrowthEvent, checkoutSignature, shouldFireBeginCheckout, oncePerKey } from './analytics-events.ts'

const item = (id: string, price: number, qty = 1, lineKey?: string) =>
  ({ id, name: id, price, qty, lineKey: lineKey ?? id })

// ── view_item ──────────────────────────────────────────────────────────────

// TEST 1 — production product page view: one view_item
test('view_item guard fires exactly once for a product view', () => {
  const sent = { current: null as string | null }
  assert.equal(oncePerKey(sent, 'swaddle-1'), true)
})

// TEST 2 — React rerender: zero additional view_item
test('view_item guard never fires again on rerender/refetch of the same product', () => {
  const sent = { current: null as string | null }
  oncePerKey(sent, 'swaddle-1')
  for (let i = 0; i < 5; i++) assert.equal(oncePerKey(sent, 'swaddle-1'), false)
  // A genuinely different product on the same mount is a new view.
  assert.equal(oncePerKey(sent, 'romper-2'), true)
})

// ── add_to_cart ────────────────────────────────────────────────────────────

// TEST 3 — one Add to Cart click: one add_to_cart
test('one add produces one growth event with the added line only', () => {
  const ev = cartGrowthEvent([], [item('swaddle-1', 3400)])
  assert.ok(ev)
  assert.equal(ev.value, 34)
  assert.equal(ev.items.length, 1)
  assert.deepEqual(ev.items[0], { item_id: 'swaddle-1', item_name: 'swaddle-1', price: 34, quantity: 1, item_category: undefined })
})

// TEST 4 — subsequent unrelated cart render/sync: zero additional add_to_cart
test('rewriting the same cart, removals and qty decreases produce no event', () => {
  const cart = [item('swaddle-1', 3400, 2), item('romper-2', 4200)]
  assert.equal(cartGrowthEvent(cart, cart), null)                            // hydration/state sync
  assert.equal(cartGrowthEvent(cart, [item('swaddle-1', 3400, 2)]), null)    // removal
  assert.equal(cartGrowthEvent(cart, [item('swaddle-1', 3400, 1), item('romper-2', 4200)]), null) // qty down
  assert.equal(cartGrowthEvent(cart, []), null)                              // cleared
})

test('a qty bump reports the DELTA, not the full line quantity', () => {
  const ev = cartGrowthEvent([item('swaddle-1', 3400, 2)], [item('swaddle-1', 3400, 3)])
  assert.ok(ev)
  assert.equal(ev.items[0].quantity, 1)
  assert.equal(ev.value, 34)
})

test('adding two units in one action reports quantity 2', () => {
  const ev = cartGrowthEvent([], [item('swaddle-1', 3400, 2)])
  assert.ok(ev)
  assert.equal(ev.items[0].quantity, 2)
  assert.equal(ev.value, 68)
})

test('two variants of one product are tracked per line, not collapsed by id', () => {
  const prev = [item('swaddle-1', 3400, 1, 'swaddle-1:sage:0-3')]
  const next = [...prev, item('swaddle-1', 3400, 1, 'swaddle-1:oat:3-6')]
  const ev = cartGrowthEvent(prev, next)
  assert.ok(ev)
  assert.equal(ev.items.length, 1)
  assert.equal(ev.items[0].quantity, 1)
})

// ── begin_checkout ─────────────────────────────────────────────────────────

const memStore = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
}

// TEST 5 — one checkout click/arrival: one begin_checkout
test('begin_checkout fires once for a cart', () => {
  const store = memStore()
  const sig = checkoutSignature([item('swaddle-1', 3400)])
  assert.equal(shouldFireBeginCheckout(sig, store), true)
})

// TEST 6 — internal retry / refresh / back-button: no duplicate begin_checkout
test('the same cart signature never fires begin_checkout twice in a session', () => {
  const store = memStore()
  const sig = checkoutSignature([item('swaddle-1', 3400), item('romper-2', 4200, 2)])
  assert.equal(shouldFireBeginCheckout(sig, store), true)
  for (let i = 0; i < 5; i++) assert.equal(shouldFireBeginCheckout(sig, store), false)
})

test('a genuinely changed cart is a new checkout initiation', () => {
  const store = memStore()
  assert.equal(shouldFireBeginCheckout(checkoutSignature([item('a', 100)]), store), true)
  assert.equal(shouldFireBeginCheckout(checkoutSignature([item('a', 100), item('b', 200)]), store), true)
})

test('checkout signature is order-independent and qty-sensitive', () => {
  const a = checkoutSignature([item('a', 100), item('b', 200, 2)])
  const b = checkoutSignature([item('b', 200, 2), item('a', 100)])
  assert.equal(a, b)
  assert.notEqual(a, checkoutSignature([item('a', 100), item('b', 200, 3)]))
})
