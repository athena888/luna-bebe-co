'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader, Check, CheckCheck, SkipForward, Ban, ExternalLink, RefreshCw, BookOpen, AlertTriangle, Gauge, Newspaper, ChevronDown, ChevronRight, Trash2, Trophy } from 'lucide-react'

// Morning review — one page, review pre-drafted cold emails over coffee.
// Approve & queue / Edit (saves on approve) / Skip (recycle) / Reject (suppress).
// Corporate cards first; press pitches in their own collapsible section with a
// lavender PRESS chip. Nothing sends without a click here; the 9-10am PT drain
// only picks up approved drafts.

interface Prospect {
  id: string; company: string; domain: string | null; person_name: string | null; title: string | null
  metro: string | null; category: string | null; linkedin_url: string | null
  email: string | null; email_grade: string | null; verifier_score: number | null; fit_reason: string | null; status: string
  channel?: string | null; outlet?: string | null; tier?: number | null
  guide_title?: string | null; guide_url?: string | null; freelancer?: boolean
}
interface Draft {
  id: string; subject: string; body: string; is_followup: boolean; draft_kind: string
  status: string; created_at: string; prospect: Prospect | null
}
interface Stats {
  cap: number; queued: number; sentToday: number; capRemaining: number
  yesterdayReplies: number; yesterdayBounces: number; needsManualCheck: number
}
interface Quota {
  providers: { name: string; configured: boolean; quota: number; used: number; remaining: number }[]
  totalRemaining: number; paceWarning: boolean
}
interface Run { run_date: string; stats: Record<string, number> }
interface Reply {
  id: string; company: string; person_name: string | null; title: string | null; email: string | null
  metro: string | null; category: string | null; updated_at: string
  channel?: string | null; outlet?: string | null; guide_title?: string | null; placement_url?: string | null
}
interface ParkedPress {
  id: string; outlet: string | null; tier: number | null; person_name: string | null; title: string | null
  email: string | null; email_grade: string | null; guide_url: string | null; guide_title: string | null; freelancer: boolean
}
interface Payload {
  queue: Draft[]; stats: Stats; quota: Quota; runs: Run[]; replies: Reply[]
  lookbook: { published: { url: string; version: number } | null; waiting: number }
  press?: { kit: { url: string; imageCount: number } | null; needsPersonalization: ParkedPress[]; awaitingKit: number }
  pipelineEnabled?: boolean
}

const LAVENDER = '#C6B2DC'

function PressChip() {
  return <span className="inline-flex items-center gap-1 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded text-bark-700" style={{ backgroundColor: LAVENDER }}><Newspaper size={9} /> Press</span>
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (grade === 'A') return <span className="inline-flex bg-sage-500 text-cream-50 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">A · published</span>
  if (grade === 'B') return <span className="inline-flex bg-sage-200 text-sage-600 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">B · verified</span>
  return <span className="inline-flex bg-cream-200 text-bark-400 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">{grade ?? '—'}</span>
}

function KindBadge({ d }: { d: Draft }) {
  if (d.draft_kind === 'reply_assist') return <span className="inline-flex bg-gold-400 text-cream-50 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">reply</span>
  if (d.is_followup) return <span className="inline-flex bg-gold-100 text-gold-600 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">follow-up</span>
  return null
}

// 7-day sparkline: found / drafted / sent per night, as tiny stacked bars.
function Sparkline({ runs }: { runs: Run[] }) {
  if (!runs.length) return null
  const vals = runs.map(r => ({
    d: r.run_date.slice(5),
    found: Number(r.stats.found) || 0,
    drafted: Number(r.stats.drafted) || 0,
    sent: Number(r.stats.sent) || 0,
    press: Number(r.stats.press_sent) || 0,
  }))
  const max = Math.max(1, ...vals.map(v => v.found))
  return (
    <div className="flex items-end gap-1.5 h-10" title="last 7 nights: found (cream) / drafted (gold) / sent (sage) / press sent (lavender)">
      {vals.map(v => (
        <div key={v.d} className="flex flex-col items-center gap-0.5">
          <div className="flex items-end gap-px h-7">
            <div className="w-1.5 bg-cream-300 rounded-t" style={{ height: `${Math.max(4, (v.found / max) * 100)}%` }} />
            <div className="w-1.5 bg-gold-400 rounded-t" style={{ height: `${Math.max(2, (v.drafted / max) * 100)}%` }} />
            <div className="w-1.5 bg-sage-400 rounded-t" style={{ height: `${Math.max(2, (v.sent / max) * 100)}%` }} />
            <div className="w-1.5 rounded-t" style={{ height: `${Math.max(2, (v.press / max) * 100)}%`, backgroundColor: LAVENDER }} />
          </div>
          <div className="font-sans text-[8px] text-bark-300">{v.d}</div>
        </div>
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)   // draftId / prospectId / 'all'
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({})
  const [personalizations, setPersonalizations] = useState<Record<string, string>>({})
  const [running, setRunning] = useState<string | null>(null)
  const [pressOpen, setPressOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/outreach-pipeline/review')
      setData(await res.json())
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  async function act(action: string, ids?: { draftId?: string; prospectId?: string; url?: string }) {
    setBusy(ids?.draftId ?? ids?.prospectId ?? 'all')
    setError(null)
    try {
      const edit = ids?.draftId ? edits[ids.draftId] : undefined
      const res = await fetch('/api/portal/outreach-pipeline/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action, ...ids,
          ...(edit ? { subject: edit.subject, bodyText: edit.body } : {}),
          ...(ids?.prospectId && action === 'finish_personalization' ? { guideReference: personalizations[ids.prospectId] ?? '' } : {}),
        }),
      })
      const d = await res.json()
      if (d.error) setError(d.error)
      await load()
    } finally { setBusy(null) }
  }

  async function run(kind: 'prospect' | 'draft') {
    setRunning(kind)
    try {
      await fetch(`/api/portal/outreach-pipeline/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      await load()
    } finally { setRunning(null) }
  }

  function markPlacement(prospectId: string) {
    const url = window.prompt('Placement URL (the published guide):')
    if (url) void act('mark_placement', { prospectId, url })
  }

  async function togglePipeline() {
    const enabled = data?.pipelineEnabled !== false
    if (enabled && !confirm('Pause ALL outreach? Prospecting, drafting, and sending stop — even already-approved drafts hold until you resume.')) return
    setBusy('pipeline')
    try {
      await fetch('/api/portal/outreach-pipeline/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_pipeline_enabled', enabled: !enabled }),
      })
      await load()
    } finally { setBusy(null) }
  }

  const q = data?.queue ?? []
  const corporate = q.filter(d => d.prospect?.channel !== 'press')
  const pressQ = q.filter(d => d.prospect?.channel === 'press')
  const s = data?.stats
  const lb = data?.lookbook
  const press = data?.press

  const DraftCard = ({ d }: { d: Draft }) => {
    const p = d.prospect
    const isPress = p?.channel === 'press'
    const edit = edits[d.id] ?? { subject: d.subject, body: d.body }
    return (
      <div className="bg-white rounded-2xl border border-cream-300 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <b className="font-serif text-bark-700">{p?.person_name ?? '—'}</b>
          <span className="font-sans text-xs text-bark-400">{p?.title}</span>
          {isPress && <PressChip />}
          {isPress && p?.freelancer && <span className="inline-flex bg-cream-200 text-bark-500 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded">freelancer</span>}
          <KindBadge d={d} />
          <span className="ml-auto"><GradeBadge grade={p?.email_grade ?? null} /></span>
        </div>
        <div className="font-sans text-xs text-bark-500 mb-1">
          {isPress
            ? <>{p?.outlet}{p?.tier ? ` · Tier ${p.tier}` : ''} · <span className="text-bark-700">{p?.email}</span></>
            : <>{p?.company} · {p?.metro} · {p?.category?.replace(/_/g, ' ')} · <span className="text-bark-700">{p?.email}</span></>}
          {p?.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 ml-2 text-sage-600 underline">LinkedIn <ExternalLink size={10} /></a>}
        </div>
        {isPress && p?.guide_title && (
          <p className="font-sans text-xs text-bark-400 mb-1">
            Their guide: {p.guide_url
              ? <a href={p.guide_url} target="_blank" rel="noopener noreferrer" className="underline text-sage-600">“{p.guide_title}”</a>
              : <>“{p.guide_title}”</>}
          </p>
        )}
        {!isPress && p?.fit_reason && <p className="font-sans text-xs italic text-bark-400 mb-3">“{p.fit_reason}”</p>}

        <input
          value={edit.subject}
          onChange={e => setEdits(prev => ({ ...prev, [d.id]: { ...edit, subject: e.target.value } }))}
          className="w-full font-sans text-sm text-bark-700 border border-cream-300 rounded-lg px-3 py-2 mb-2 bg-cream-50 focus:outline-none focus:border-gold-300"
        />
        <textarea
          value={edit.body}
          onChange={e => setEdits(prev => ({ ...prev, [d.id]: { ...edit, body: e.target.value } }))}
          rows={Math.min(14, edit.body.split('\n').length + 1)}
          className="w-full font-sans text-sm text-bark-700 border border-cream-300 rounded-lg px-3 py-2 bg-cream-50 focus:outline-none focus:border-gold-300 leading-relaxed"
        />

        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => act('approve', { draftId: d.id })} disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-sage-500 text-cream-50 hover:bg-sage-600 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl transition-colors">
            {busy === d.id ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Approve &amp; queue
          </button>
          <button onClick={() => act('skip', { draftId: d.id })} disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-cream-200 text-bark-600 hover:bg-cream-300 disabled:opacity-40 font-sans text-xs px-3 py-2.5 rounded-xl transition-colors">
            <SkipForward size={13} /> Skip
          </button>
          <button onClick={() => act('reject', { draftId: d.id })} disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-cream-200 text-bark-400 hover:bg-rose-200 hover:text-bark-700 disabled:opacity-40 font-sans text-xs px-3 py-2.5 rounded-xl transition-colors"
            title="Adds to suppression — never contact again">
            <Ban size={13} /> Reject
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-bark-700">Morning Review</h1>
        <div className="flex items-center gap-2">
          {data && (
            <button onClick={togglePipeline} disabled={busy !== null}
              title={data.pipelineEnabled !== false ? 'Click to pause all outreach (prospecting, drafting, sending)' : 'Click to resume outreach'}
              className={`inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-lg transition-colors ${data.pipelineEnabled !== false ? 'bg-sage-500 text-cream-50 hover:bg-sage-600' : 'bg-bark-700 text-cream-100 hover:bg-bark-600'}`}>
              {busy === 'pipeline' ? <Loader size={11} className="animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full ${data.pipelineEnabled !== false ? 'bg-cream-50' : 'bg-rose-300'}`} />}
              {data.pipelineEnabled !== false ? 'Outreach on' : 'Paused — resume'}
            </button>
          )}
          {lb && (lb.published
            ? <span className="inline-flex items-center gap-1 bg-sage-100 text-sage-600 font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded-lg"><BookOpen size={11} /> Lookbook v{lb.published.version}</span>
            : <span className="inline-flex items-center gap-1 bg-rose-100 text-bark-600 font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded-lg"><BookOpen size={11} /> Not published{lb.waiting > 0 ? ` — ${lb.waiting} waiting` : ''}</span>)}
          {press && (press.kit
            ? <span className="inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded-lg text-bark-700" style={{ backgroundColor: LAVENDER }}><Newspaper size={11} /> Press kit · {press.kit.imageCount}</span>
            : <span className="inline-flex items-center gap-1 bg-cream-200 text-bark-500 font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded-lg"><Newspaper size={11} /> No press kit{press.awaitingKit > 0 ? ` — ${press.awaitingKit} waiting` : ''}</span>)}
          {data?.quota && (
            <span className={`inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.1em] uppercase px-2 py-1 rounded-lg ${data.quota.paceWarning ? 'bg-gold-100 text-gold-600' : 'bg-cream-200 text-bark-500'}`}
              title={data.quota.providers.map(p => `${p.name}: ${p.configured ? `${p.remaining}/${p.quota}` : 'no key'}`).join(' · ')}>
              <Gauge size={11} /> verify {data.quota.totalRemaining} left{data.quota.paceWarning ? ' · low' : ''}
            </span>
          )}
        </div>
      </div>
      <p className="font-sans text-xs text-bark-400 mb-4">Approved drafts send at 9–10am PT. Nothing sends without your click.</p>

      {error && (
        <div className="flex items-center gap-2 bg-rose-200/70 border border-rose-300 text-bark-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm">
          <AlertTriangle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {data?.pipelineEnabled === false && (
        <div className="flex items-center gap-2 bg-bark-700 text-cream-100 rounded-xl px-4 py-3 mb-4 font-sans text-sm">
          <AlertTriangle size={16} className="shrink-0 text-rose-300" />
          Outreach is paused — no prospecting, drafting, or sending (approved drafts stay queued). Hit “Paused — resume” above to restart.
        </div>
      )}

      {/* Red banner: interested replies waiting on an unpublished lookbook */}
      {lb && !lb.published && lb.waiting > 0 && (
        <div className="flex items-center gap-2 bg-rose-200/70 border border-rose-300 text-bark-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          Lookbook requested — {lb.waiting} interested {lb.waiting === 1 ? 'reply is' : 'replies are'} waiting. <Link href="/portal/lookbook/builder" className="underline">Publish the lookbook</Link>
        </div>
      )}

      {/* Press prospects waiting on the press kit */}
      {press && !press.kit && press.awaitingKit > 0 && (
        <div className="flex items-center gap-2 border text-bark-700 rounded-xl px-4 py-3 mb-4 font-sans text-sm" style={{ backgroundColor: `${LAVENDER}55`, borderColor: LAVENDER }}>
          <AlertTriangle size={16} className="shrink-0" />
          {press.awaitingKit} press {press.awaitingKit === 1 ? 'pitch is' : 'pitches are'} waiting on the press kit. <Link href="/portal/lookbook/images" className="underline">Tag images “press”</Link> to release them.
        </div>
      )}

      {/* Top bar: stats + sparkline + approve all */}
      {s && (
        <div className="bg-white rounded-2xl border border-cream-300 p-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex gap-5 font-sans text-xs text-bark-500">
            <span><b className="text-bark-700 text-base font-serif">{q.length}</b> to review</span>
            <span><b className="text-bark-700 text-base font-serif">{s.queued}</b> queued</span>
            <span><b className="text-bark-700 text-base font-serif">{s.sentToday}</b>/{s.cap} sent today</span>
            <span title="yesterday"><b className="text-sage-600 text-base font-serif">{s.yesterdayReplies}</b> replies · <b className="text-bark-700 text-base font-serif">{s.yesterdayBounces}</b> bounces</span>
          </div>
          <Sparkline runs={data?.runs ?? []} />
          <button
            onClick={() => act('approve_all')}
            disabled={!q.length || busy !== null}
            className="ml-auto inline-flex items-center gap-1.5 bg-bark-700 text-cream-50 hover:bg-bark-600 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            {busy === 'all' ? <Loader size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Approve all remaining ({q.length})
          </button>
        </div>
      )}

      {/* Replies — respond today */}
      {(data?.replies?.length ?? 0) > 0 && (
        <div className="mb-6">
          <h2 className="font-serif text-lg text-bark-700 mb-2">Replies — respond today</h2>
          <div className="space-y-2">
            {data!.replies.map(r => (
              <div key={r.id} className="bg-sage-100/60 border border-sage-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-2 font-sans text-sm text-bark-700">
                <b>{r.person_name ?? r.company}</b>
                {r.channel === 'press' && <PressChip />}
                <span className="text-bark-400 text-xs">{r.title ? `${r.title} · ` : ''}{r.channel === 'press' ? r.outlet ?? r.company : r.company} · {r.email}</span>
                {r.channel === 'press' && r.placement_url && (
                  <a href={r.placement_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans text-[10px] uppercase tracking-wide bg-gold-100 text-gold-600 rounded px-1.5 py-0.5"><Trophy size={10} /> placed</a>
                )}
                <span className="ml-auto flex items-center gap-2">
                  {r.channel === 'press' && !r.placement_url && (
                    <button onClick={() => markPlacement(r.id)} disabled={busy !== null}
                      className="inline-flex items-center gap-1 text-xs underline text-bark-500 hover:text-bark-700"><Trophy size={11} /> mark placement</button>
                  )}
                  {r.email && <a className="text-sage-600 underline text-xs" href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(r.email)}`} target="_blank" rel="noopener noreferrer">open thread</a>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Press pitches that need Emily's personalization line */}
      {(press?.needsPersonalization?.length ?? 0) > 0 && (
        <div className="mb-6">
          <h2 className="font-serif text-lg text-bark-700 mb-1">Needs your personalization</h2>
          <p className="font-sans text-xs text-bark-400 mb-2">No guide could be captured for these writers — a press pitch never goes out with a generic opener. Write the one-sentence reference yourself (name their actual work), or discard.</p>
          <div className="space-y-2">
            {press!.needsPersonalization.map(p => (
              <div key={p.id} className="bg-white border rounded-xl px-4 py-3" style={{ borderColor: LAVENDER }}>
                <div className="flex flex-wrap items-center gap-2 font-sans text-sm text-bark-700 mb-2">
                  <b className="font-serif">{p.person_name ?? '—'}</b>
                  <PressChip />
                  <span className="text-bark-400 text-xs">{p.outlet}{p.tier ? ` · Tier ${p.tier}` : ''} · {p.email}</span>
                  {p.guide_url && <a href={p.guide_url} target="_blank" rel="noopener noreferrer" className="text-sage-600 underline text-xs">found guide</a>}
                  <span className="ml-auto"><GradeBadge grade={p.email_grade} /></span>
                </div>
                <textarea
                  value={personalizations[p.id] ?? ''}
                  onChange={e => setPersonalizations(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={`One sentence referencing ${p.person_name?.split(' ')[0] ?? 'their'}'s actual guide or beat — e.g. Your "…" roundup for ${p.outlet ?? 'the outlet'}…`}
                  rows={2}
                  className="w-full font-sans text-sm text-bark-700 border border-cream-300 rounded-lg px-3 py-2 bg-cream-50 focus:outline-none focus:border-gold-300"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => act('finish_personalization', { prospectId: p.id })} disabled={busy !== null || !(personalizations[p.id] ?? '').trim()}
                    className="inline-flex items-center gap-1.5 bg-sage-500 text-cream-50 hover:bg-sage-600 disabled:opacity-40 font-sans text-xs px-4 py-2 rounded-xl transition-colors">
                    {busy === p.id ? <Loader size={13} className="animate-spin" /> : <Check size={13} />} Create draft
                  </button>
                  <button onClick={() => act('discard_personalization', { prospectId: p.id })} disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 bg-cream-200 text-bark-400 hover:text-bark-700 font-sans text-xs px-3 py-2 rounded-xl transition-colors">
                    <Trash2 size={13} /> Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue */}
      {loading ? (
        <div className="flex justify-center py-16 text-bark-400"><Loader className="animate-spin" /></div>
      ) : !q.length ? (
        <div className="bg-white rounded-2xl border border-cream-300 p-10 text-center">
          <p className="font-serif text-lg text-bark-500 mb-1">Queue is clear ✨</p>
          <p className="font-sans text-xs text-bark-400">The prospector runs ~2am PT, the drafter ~4am PT. New drafts will be here in the morning.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {corporate.map(d => <DraftCard key={d.id} d={d} />)}

          {pressQ.length > 0 && (
            <div>
              <button onClick={() => setPressOpen(o => !o)}
                className="w-full flex items-center gap-2 font-serif text-lg text-bark-700 py-2">
                {pressOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Press pitches
                <span className="inline-flex items-center font-sans text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded text-bark-700" style={{ backgroundColor: LAVENDER }}>{pressQ.length}</span>
              </button>
              {pressOpen && <div className="space-y-4">{pressQ.map(d => <DraftCard key={d.id} d={d} />)}</div>}
            </div>
          )}
        </div>
      )}

      {/* Manual triggers for testing */}
      <div className="mt-8 flex flex-wrap items-center gap-2 font-sans text-xs text-bark-400">
        {s && s.needsManualCheck > 0 && <span className="mr-auto">{s.needsManualCheck} risky (grade C) prospects need a manual check.</span>}
        <button onClick={() => run('prospect')} disabled={running !== null}
          className="inline-flex items-center gap-1 border border-cream-300 rounded-lg px-3 py-1.5 hover:bg-cream-200 disabled:opacity-40">
          {running === 'prospect' ? <Loader size={11} className="animate-spin" /> : <RefreshCw size={11} />} Run prospector now
        </button>
        <button onClick={() => run('draft')} disabled={running !== null}
          className="inline-flex items-center gap-1 border border-cream-300 rounded-lg px-3 py-1.5 hover:bg-cream-200 disabled:opacity-40">
          {running === 'draft' ? <Loader size={11} className="animate-spin" /> : <RefreshCw size={11} />} Run drafter now
        </button>
      </div>
    </div>
  )
}
