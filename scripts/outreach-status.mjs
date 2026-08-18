// One-command view of the outbound system.
//
//   node scripts/outreach-status.mjs
//
// Read-only. Shows what was sent, what came back, what is queued, and what the
// qualified inventory looks like. Written because the portal review UI still
// renders v1 fields and cannot show scores, tiers, segments or buying signals.

const SUP = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUP || !KEY) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const q = async p => (await fetch(`${SUP}/rest/v1/${p}`, { headers: H })).json()
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : '—')

const cfg = Object.fromEntries((await q('outreach_config?select=key,value')).map(r => [r.key, r.value]))
const v3 = cfg.quality_v3 ?? {}

console.log('\n══ SWITCHES ══')
console.log(`  pipeline_enabled   ${cfg.pipeline_enabled}`)
console.log(`  live_sends_enabled ${v3.live_sends_enabled}      daily cap ${cfg.daily_send_cap}`)
console.log(`  follow-ups         ${v3.followup_1_enabled} / ${v3.followup_2_enabled}`)

// ── Outcomes ────────────────────────────────────────────────────────────────
const sent = await q('sends?select=sent_at,delivery_state,replied_at,bounced_at,recipient_email,draft:email_drafts!inner(template_key,prospect:prospects!inner(company,status,reply_category,reply_snippet))&status=eq.sent&order=sent_at.desc&limit=500')
const v3sent = sent.filter(s => (s.draft?.template_key ?? '').startsWith('v3:'))
const replied = sent.filter(s => s.replied_at)
const bounced = sent.filter(s => s.bounced_at)

console.log('\n══ RESULTS ══')
console.log(`  emails sent (all time)   ${sent.length}   of which new pipeline: ${v3sent.length}`)
console.log(`  replies                  ${replied.length}   (${pct(replied.length, sent.length)})`)
console.log(`  bounces                  ${bounced.length}   (${pct(bounced.length, sent.length)})`)

const cats = {}
for (const s of sent) {
  const c = s.draft?.prospect?.reply_category
  if (c) cats[c] = (cats[c] ?? 0) + 1
}
if (Object.keys(cats).length) {
  console.log('  reply types:')
  for (const [k, v] of Object.entries(cats).sort((a, b) => b[1] - a[1])) console.log(`     ${String(v).padStart(3)}  ${k}`)
} else {
  console.log('  reply types:              none yet')
}

if (replied.length) {
  console.log('\n  REPLIES — these need a human:')
  for (const s of replied) {
    const p = s.draft.prospect
    console.log(`     ${String(p.company).padEnd(24)} ${String(p.reply_category ?? '?').padEnd(16)} "${String(p.reply_snippet ?? '').replace(/\s+/g, ' ').slice(0, 60)}"`)
  }
}

// ── Inventory ───────────────────────────────────────────────────────────────
const prospects = await q('prospects?select=company,qualification_status,qualification_tier,qualification_score,status,segment,channel&channel=eq.corporate&limit=2000')
const byStatus = {}
for (const p of prospects) byStatus[p.qualification_status ?? 'unscored'] = (byStatus[p.qualification_status ?? 'unscored'] ?? 0) + 1

console.log('\n══ INVENTORY ══')
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(4)}  ${k}`)
}

const ready = prospects.filter(p =>
  p.qualification_status === 'QUALIFIED' &&
  !['sent', 'replied', 'bounced', 'suppressed'].includes(p.status))
console.log(`\n  uncontacted and qualified: ${ready.length}`)
ready.sort((a, b) => (b.qualification_score ?? 0) - (a.qualification_score ?? 0))
  .slice(0, 10).forEach(p => console.log(`     ${String(p.company).padEnd(26)} ${p.qualification_score} ${p.qualification_tier}  ${p.segment}`))

const pending = await q('email_drafts?select=id&status=eq.pending_review')
const queued = await q('sends?select=id&status=eq.queued')
const supp = await q('suppression?select=email,reason')
console.log(`\n  drafts awaiting approval: ${pending.length}`)
console.log(`  approved and queued:      ${queued.length}`)
console.log(`  suppressed:               ${supp.length}${supp.length ? ` (${supp.map(s => s.reason).join(', ')})` : ''}`)
console.log()
