// node --test lib/pipeline/mx.test.ts   (npm test)
// A DNS hiccup must never be mistaken for "this domain cannot receive mail".
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyMxError, mxVerdict } from './mx.ts'

test('only a positive not-found answer is a verdict about the domain', () => {
  assert.equal(classifyMxError('ENOTFOUND'), 'no')
  assert.equal(classifyMxError('ENODATA'), 'no')
})

test('timeouts, SERVFAIL, refused, and unknown errors are NOT "no MX"', () => {
  for (const code of ['ETIMEOUT', 'ESERVFAIL', 'ECONNREFUSED', 'EAI_AGAIN', 'ECANCELLED', undefined]) {
    assert.equal(classifyMxError(code), 'unknown', String(code))
  }
})

test('an empty domain is a hard no; a resolver that never answers is unknown', async () => {
  assert.equal(await mxVerdict(''), 'no')
  // 1ms budget against a real lookup: the timeout wins → unknown, never 'no'.
  assert.equal(await mxVerdict('example.com', 1), 'unknown')
})
