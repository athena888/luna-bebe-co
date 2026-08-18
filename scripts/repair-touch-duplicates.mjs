// Report — and optionally remove — duplicate outbound touch rows.
//
//   node scripts/repair-touch-duplicates.mjs            # report only (default)
//   node scripts/repair-touch-duplicates.mjs --apply    # delete the duplicates
//
// BACKGROUND: the audit found 94 outbound rows in `touches` against 75 real
// `sends`, and a first reading assumed 19 duplicate bookkeeping rows.
//
// That reading was WRONG. All 94 rows carry DISTINCT Gmail message ids, and 19
// contacts hold two of them 4-15 seconds apart. Nineteen people genuinely
// received the same email twice on 2026-08-17, because two drain runs
// overlapped and each seeded its own in-process "already sent today" set.
//
// So there is nothing to repair by deletion here: the ledger is ACCURATE and
// those rows are real history that must be preserved. The double-send itself is
// fixed in lib/pipeline/sender.ts by an atomic `queued -> sending` claim, which
// lets the database arbitrate between concurrent runners.
//
// This script now serves two purposes: prove the ledger holds no genuine
// same-message_id duplicates before the unique index is applied, and catch any
// that appear in future.
//
// SAFETY:
//  * Report-only by default. --apply is required to delete anything.
//  * Groups by gmail message_id; one Gmail message is one delivered email.
//  * Keeps the EARLIEST row in each group — the original evidence — and removes
//    only the later copies.
//  * Rows with a null message_id are never touched; they cannot be proven
//    duplicate, so they are reported and left alone.
//  * Writes a full JSON backup of every row it intends to delete BEFORE
//    deleting, so the operation is reversible.
//
// Run this BEFORE applying outreach_quality_v3.sql — the unique index on
// touches(message_id) cannot be created while duplicates exist.

import { writeFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')
const SUP = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUP || !KEY) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const rows = await (await fetch(
  `${SUP}/rest/v1/touches?select=id,message_id,contact_id,direction,channel,subject,created_at&direction=eq.outbound&order=created_at.asc`,
  { headers: H },
)).json()

console.log(`outbound touch rows: ${rows.length}`)

const byMessage = new Map()
let nullMessageId = 0
for (const r of rows) {
  if (!r.message_id) { nullMessageId++; continue }
  if (!byMessage.has(r.message_id)) byMessage.set(r.message_id, [])
  byMessage.get(r.message_id).push(r)
}

const dupeGroups = [...byMessage.entries()].filter(([, g]) => g.length > 1)
const toDelete = dupeGroups.flatMap(([, g]) => g.slice(1))   // keep earliest

console.log(`distinct gmail message ids: ${byMessage.size}`)
console.log(`rows with no message_id (left alone): ${nullMessageId}`)
console.log(`duplicated message ids: ${dupeGroups.length}`)
console.log(`redundant rows: ${toDelete.length}`)
console.log(`ledger after repair: ${rows.length - toDelete.length}`)

if (!dupeGroups.length) {
  console.log('\nNothing to repair.')
  process.exit(0)
}

console.log('\nduplicate groups (message_id -> copies, keeping the earliest):')
for (const [mid, g] of dupeGroups.slice(0, 20)) {
  console.log(`  ${mid}  x${g.length}  first ${g[0].created_at}  subject "${(g[0].subject ?? '').slice(0, 50)}"`)
}
if (dupeGroups.length > 20) console.log(`  ... and ${dupeGroups.length - 20} more`)

if (!APPLY) {
  console.log('\nREPORT ONLY. Re-run with --apply to delete the redundant rows.')
  process.exit(0)
}

const backup = `touches-duplicates-backup-${new Date().toISOString().slice(0, 10)}.json`
writeFileSync(backup, JSON.stringify(toDelete, null, 1), 'utf8')
console.log(`\nbackup of rows to delete written to ${backup}`)

let deleted = 0
for (const r of toDelete) {
  const res = await fetch(`${SUP}/rest/v1/touches?id=eq.${r.id}`, { method: 'DELETE', headers: H })
  if (res.ok) deleted++
  else console.error(`  failed to delete ${r.id}: ${res.status}`)
}
console.log(`deleted ${deleted} redundant rows; kept ${rows.length - deleted}`)
console.log('You can now apply the unique index in outreach_quality_v3.sql.')
