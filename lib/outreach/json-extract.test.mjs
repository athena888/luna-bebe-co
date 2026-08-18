import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractJsonObject } from './json-extract.ts'

test('extracts the payload from a real web-search response shape', () => {
  const blocks = [
    'Based on the official Gusto company news page, the current Chief People Officer is **Amelia Generalis**, who was ',
    'welcomed as the new Chief People Officer at Gusto',
    ', bringing deep experience in scaling people operations.',
    '\n\n```json\n{\n  "contacts": [\n    {"domain": "gusto.com", "person_name": "Amelia Generalis", "title": "Chief People Officer"}\n  ]\n}\n```',
  ]
  const got = extractJsonObject(blocks, 'contacts')
  assert.ok(got, 'must find the payload')
  assert.equal(got.contacts.length, 1)
  assert.equal(got.contacts[0].person_name, 'Amelia Generalis')
})

test('a brace inside a quoted URL cannot end the scan early', () => {
  const blocks = ['```json\n{"companies":[{"domain":"x.com","source_urls":["https://x.com/a{b}c"]}]}\n```']
  const got = extractJsonObject(blocks, 'companies')
  assert.equal(got.companies[0].source_urls[0], 'https://x.com/a{b}c')
})

test('requiredKey prevents picking up an unrelated object', () => {
  const blocks = ['I considered {"note":"ignore me"} first.', '```json\n{"contacts":[]}\n```']
  assert.deepEqual(extractJsonObject(blocks, 'contacts'), { contacts: [] })
})

test('returns null when there is genuinely no payload', () => {
  assert.equal(extractJsonObject(['I could not find anything.'], 'contacts'), null)
})
