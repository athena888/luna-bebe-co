// node --test lib/outreach/followup-gate.test.ts   (npm test)
// The gate exists to stop follow-ups going out while replies are invisible, so
// every way of "not knowing" must produce the same answer: hold.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluateFollowupGate, SYNC_MAX_AGE_HOURS, type SyncRow } from './followup-gate.ts'

const NOW = new Date('2026-08-23T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()
const row = (over: Partial<SyncRow> = {}): SyncRow =>
  ({ ran_at: hoursAgo(2), errors: null, dry: false, ...over })

test('a recent clean sync opens the gate', () => {
  const v = evaluateFollowupGate([row()], NOW)
  assert.equal(v.safe, true)
  assert.match(v.reason, /healthy/)
})

test('no sync history at all holds follow-ups', () => {
  const v = evaluateFollowupGate([], NOW)
  assert.equal(v.safe, false)
  assert.match(v.reason, /never completed cleanly/)
})

test('a stale sync holds follow-ups', () => {
  const v = evaluateFollowupGate([row({ ran_at: hoursAgo(SYNC_MAX_AGE_HOURS + 1) })], NOW)
  assert.equal(v.safe, false)
  assert.match(v.reason, /last succeeded/)
})

test('the boundary is inclusive — exactly at the limit still counts', () => {
  assert.equal(evaluateFollowupGate([row({ ran_at: hoursAgo(SYNC_MAX_AGE_HOURS) })], NOW).safe, true)
  assert.equal(evaluateFollowupGate([row({ ran_at: hoursAgo(SYNC_MAX_AGE_HOURS + 0.5) })], NOW).safe, false)
})

test('a dry run is not evidence that sync works', () => {
  assert.equal(evaluateFollowupGate([row({ dry: true })], NOW).safe, false)
})

test('a sync that errored is not evidence either', () => {
  assert.equal(evaluateFollowupGate([row({ errors: 'invalid_grant' })], NOW).safe, false)
})

test('a recent clean run wins over older broken ones', () => {
  const v = evaluateFollowupGate([
    row({ ran_at: hoursAgo(1), errors: 'boom' }),
    row({ ran_at: hoursAgo(3) }),
    row({ ran_at: hoursAgo(200) }),
  ], NOW)
  assert.equal(v.safe, true)
})

test('recent broken runs cannot be rescued by an old clean one', () => {
  const v = evaluateFollowupGate([
    row({ ran_at: hoursAgo(1), errors: 'invalid_grant' }),
    row({ ran_at: hoursAgo(500) }),
  ], NOW)
  assert.equal(v.safe, false)
})

test('an unreadable timestamp holds follow-ups', () => {
  assert.equal(evaluateFollowupGate([row({ ran_at: 'not-a-date' })], NOW).safe, false)
})

test('the gate opens by itself once a clean sync lands', () => {
  // The whole point: no manual switch. Grant the scope, the sync logs a row,
  // the next drafter run resumes follow-ups.
  const before = evaluateFollowupGate([], NOW)
  assert.equal(before.safe, false)
  const after = evaluateFollowupGate([row({ ran_at: hoursAgo(0) })], NOW)
  assert.equal(after.safe, true)
})
