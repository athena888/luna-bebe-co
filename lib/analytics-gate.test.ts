// node --test lib/analytics-gate.test.ts   (npm test)
// The one gate for "may this browser send analytics?" — production GA4 must
// never receive localhost, Vercel-preview, portal or owner-flagged traffic,
// and must keep receiving genuine production storefront traffic.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gateDecision, type GateEnv } from './analytics-gate.ts'

const env = (over: Partial<GateEnv> = {}, flags: Record<string, string> = {}): GateEnv => ({
  hostname: 'petitelavande.com',
  pathname: '/boxes/mama-et-bebe',
  getItem: k => flags[k] ?? null,
  ...over,
})

test('production storefront traffic is allowed (both hosts)', () => {
  assert.equal(gateDecision(env()).allowed, true)
  assert.equal(gateDecision(env({ hostname: 'www.petitelavande.com' })).allowed, true)
  assert.equal(gateDecision(env({ hostname: 'PETITELAVANDE.COM' })).allowed, true)
})

// TEST 7 — localhost: zero production analytics events
test('localhost and loopback never track', () => {
  for (const hostname of ['localhost', '127.0.0.1', 'app.localhost']) {
    const d = gateDecision(env({ hostname }))
    assert.equal(d.allowed, false)
    assert.equal(d.reason, 'non-production-host')
  }
})

// TEST 8 — Vercel preview: zero production analytics events
test('Vercel preview and any other deployment host never track', () => {
  for (const hostname of ['luna-bebe-co-git-outreach-quality-v3.vercel.app', 'luna-bebe-co.vercel.app', 'staging.petitelavande.com']) {
    assert.equal(gateDecision(env({ hostname })).allowed, false)
  }
})

// TEST 9 — portal/admin route: zero storefront analytics
test('portal routes never track, customer routes are unaffected', () => {
  assert.equal(gateDecision(env({ pathname: '/portal' })).allowed, false)
  assert.equal(gateDecision(env({ pathname: '/portal/orders' })).allowed, false)
  // Prefix must be a path segment: a hypothetical customer page starting with
  // the same letters is NOT internal.
  assert.equal(gateDecision(env({ pathname: '/portale' })).allowed, true)
  assert.equal(gateDecision(env({ pathname: '/account' })).allowed, true)
})

// TEST 10 — owner internal flag: zero analytics events
test('the owner browser flag silences all tracking (both keys)', () => {
  assert.equal(gateDecision(env({}, { pl_internal_analytics: '1' })).allowed, false)
  assert.equal(gateDecision(env({}, { pl_internal: '1' })).allowed, false)
  // Removing the flag restores tracking; other values do not silence.
  assert.equal(gateDecision(env({}, { pl_internal_analytics: '0' })).allowed, true)
})

test('declined cookie consent silences all tracking', () => {
  assert.equal(gateDecision(env({}, { cookie_consent: 'declined' })).allowed, false)
  assert.equal(gateDecision(env({}, { cookie_consent: 'accepted' })).allowed, true)
})

test('a throwing storage never breaks the store (fails closed on consent read)', () => {
  const d = gateDecision(env({ getItem: () => { throw new Error('private mode') } }))
  assert.equal(d.allowed, true) // storage unavailable = no flags set, consent undecided
})
