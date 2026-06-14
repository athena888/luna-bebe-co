'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader, Check, RefreshCw, Copy, Clock, Flame, TrendingUp, TrendingDown,
  Mail, Upload, ChevronDown, ChevronRight, X, Download, Plus, Sparkles,
} from 'lucide-react'
import type { Task, TaskStatus, DailyPlan, ContentQueueItem, ContentAsset, SalesTrend } from '@/lib/cockpit'
import type { FollowupDue, TriageItem } from '@/lib/outreach'

const TYPE_LABELS: Record<string, string> = { sell: 'Sell', market: 'Market', ops: 'Ops' }
const TYPE_ORDER = ['sell', 'market', 'ops'] as const

function pct(n: number | null): string {
  return n == null ? '—' : `${Math.round(n * 100)}%`
}
function money(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}
function costLabel(cents: number | null): string {
  if (cents == null) return ''
  return cents <= 0 ? 'Free' : `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`
}
function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

// ── Small UI bits ────────────────────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  if (!data.length) return null
  const w = 96, h = 24, gap = 2
  const bw = (w - gap * (data.length - 1)) / data.length
  return (
    <svg width={w} height={h} className="overflow-visible">
      {data.map((v, i) => {
        const bh = Math.max(2, v * h)
        return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={1}
          className={v >= 0.7 ? 'fill-sage-400' : v > 0 ? 'fill-gold-300' : 'fill-cream-300'} />
      })}
    </svg>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-4">
      <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">{label}</p>
      <div className="font-serif text-2xl text-bark-700 leading-none">{value}</div>
      {sub && <div className="mt-1.5">{sub}</div>}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function Cockpit(props: {
  date: string
  plan: DailyPlan | null
  initialTasks: Task[]
  rolling: number | null
  streak: number
  series: number[]
  sales: SalesTrend
  initialContent: ContentQueueItem[]
  initialFollowups: FollowupDue[]
  triage: TriageItem[]
  initialAssets: ContentAsset[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState(props.initialTasks)
  const [content, setContent] = useState(props.initialContent)
  const [followups, setFollowups] = useState(props.initialFollowups)
  const [assets, setAssets] = useState(props.initialAssets)
  const [regenerating, setRegenerating] = useState(false)
  const [showRecap, setShowRecap] = useState(false)

  const done = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const todayRate = total ? done / (done + tasks.filter(t => t.status === 'open').length + tasks.filter(t => t.status === 'skipped').length) : null

  async function regenerate() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/portal/cockpit/regenerate', { method: 'POST' })
      if (res.ok) router.refresh()
    } finally { setRegenerating(false) }
  }

  async function toggleTask(t: Task) {
    const next: TaskStatus = t.status === 'done' ? 'open' : 'done'
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: next } : x))
    await fetch('/api/portal/cockpit/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: next }) })
  }
  async function skipTask(t: Task) {
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: 'skipped' } : x))
    await fetch('/api/portal/cockpit/tasks', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: 'skipped' }) })
  }
  function addTask(t: Task) { setTasks(ts => [...ts, t]) }

  const openTasks = tasks.filter(t => t.status !== 'skipped')
  const totalMinutes = openTasks.reduce((s, t) => s + (t.est_minutes ?? 0), 0)
  const totalCostCents = openTasks.reduce((s, t) => s + (t.est_cost_cents ?? 0), 0)

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Today</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">{prettyDate(props.date)} · what to do today to sell &amp; market Petite Lavande.</p>
        </div>
        <button onClick={regenerate} disabled={regenerating}
          className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded-lg hover:bg-bark-700 transition-colors disabled:opacity-50">
          {regenerating ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {props.plan ? 'Regenerate' : "Build today's plan"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Stat label="Execution rate" value={pct(props.rolling)} sub={<Sparkline data={props.series} />} />
        <Stat label="Streak" value={`${props.streak}d`} sub={<span className="font-sans text-[11px] text-bark-400 flex items-center gap-1"><Flame size={12} className={props.streak > 0 ? 'text-gold-400' : 'text-cream-300'} /> ≥70% days</span>} />
        <Stat label="Today" value={total ? `${done}/${total}` : '—'} sub={<span className="font-sans text-[11px] text-bark-400">{pct(todayRate)} done</span>} />
        <Stat label="Boxes sold · 7d" value={String(props.sales.thisWeekCount)} sub={
          <span className="font-sans text-[11px] flex items-center gap-1 text-bark-400">
            {props.sales.deltaPct == null ? <span className="text-bark-300">{money(props.sales.thisWeekCents)}</span> : (
              <>{props.sales.deltaPct >= 0 ? <TrendingUp size={12} className="text-sage-500" /> : <TrendingDown size={12} className="text-rose-400" />}
                <span className={props.sales.deltaPct >= 0 ? 'text-sage-600' : 'text-rose-500'}>{props.sales.deltaPct >= 0 ? '+' : ''}{props.sales.deltaPct}% wk</span></>
            )}
          </span>
        } />
      </div>

      {/* Strategy note */}
      {props.plan?.strategy_note ? (
        <div className="bg-gradient-to-br from-cream-50 to-cream-100 rounded-2xl border border-cream-200 p-5 sm:p-6 mb-8">
          <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-gold-400 mb-2">Today&rsquo;s focus</p>
          <p className="font-serif text-lg sm:text-xl text-bark-700 leading-relaxed">{props.plan.strategy_note}</p>
          {props.plan.recap && (
            <div className="mt-4">
              <button onClick={() => setShowRecap(s => !s)} className="inline-flex items-center gap-1 font-sans text-[11px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
                {showRecap ? <ChevronDown size={13} /> : <ChevronRight size={13} />} Yesterday
              </button>
              {showRecap && <p className="font-sans text-sm text-bark-500 leading-relaxed mt-2">{props.plan.recap}</p>}
            </div>
          )}
          {props.plan.flags && props.plan.flags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {props.plan.flags.map((f, i) => (
                <span key={i} className="font-sans text-[11px] text-bark-600 bg-gold-100/50 border border-gold-200 rounded-full px-3 py-1">{f}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-cream-50 rounded-2xl border border-dashed border-cream-300 p-8 text-center mb-8">
          <p className="font-serif text-lg text-bark-600 mb-2">No plan yet for today</p>
          <p className="font-sans text-sm text-bark-400 mb-4">Generate a checklist from yesterday&rsquo;s results and this week&rsquo;s sales.</p>
          <button onClick={regenerate} disabled={regenerating} className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-6 py-3 rounded-lg hover:bg-bark-700 transition-colors disabled:opacity-50">
            {regenerating ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />} Build today&rsquo;s plan
          </button>
        </div>
      )}

      {/* Checklist — the hero: today's marketing to-do list */}
      {total > 0 && (
        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 mb-1 flex-wrap">
            <h2 className="font-serif text-xl text-bark-600">Today&rsquo;s to-do list</h2>
            <div className="flex items-center gap-3">
              <span className="font-sans text-[11px] text-bark-400 flex items-center gap-1"><Clock size={12} />{totalMinutes}m · {costLabel(totalCostCents) || '$0'}</span>
              <a href="/api/portal/cockpit/export" className="inline-flex items-center gap-1.5 font-sans text-[10px] tracking-[0.15em] uppercase text-bark-500 hover:text-bark-700 border border-cream-300 hover:border-bark-400 rounded px-3 py-1.5 transition-colors">
                <Download size={12} /> Export
              </a>
            </div>
          </div>
          <p className="font-sans text-[11px] text-bark-400 mb-4 leading-relaxed">
            Auto-generated each morning from your sales &amp; outreach data. <strong>Tick each one off as you do it</strong> — that feeds your execution rate. (The Inbox section below fills in automatically from your email.)
          </p>
          <div className="space-y-6">
            {TYPE_ORDER.map(type => {
              const group = tasks.filter(t => (t.task_type ?? 'ops') === type)
              if (!group.length) return null
              return (
                <div key={type}>
                  <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-2">{TYPE_LABELS[type]}</p>
                  <div className="space-y-2">
                    {group.map(t => (
                      <div key={t.id} className={`group flex items-start gap-3 bg-white border rounded-xl p-3.5 transition-colors ${t.status === 'done' ? 'border-sage-200 bg-sage-50/30' : t.status === 'skipped' ? 'border-cream-200 opacity-50' : 'border-cream-200'}`}>
                        <button onClick={() => toggleTask(t)} className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${t.status === 'done' ? 'bg-sage-400 border-sage-400 text-white' : 'border-cream-300 hover:border-bark-400'}`}>
                          {t.status === 'done' && <Check size={13} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-sans text-sm text-bark-700 ${t.status === 'done' ? 'line-through text-bark-400' : ''} ${t.status === 'skipped' ? 'line-through' : ''}`}>{t.title}</p>
                          {t.why && <p className="font-sans text-xs text-bark-400 mt-0.5 leading-relaxed">{t.why}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {t.channel && <span className="font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 bg-cream-100 rounded px-2 py-0.5">{t.channel}</span>}
                            {t.est_minutes != null && <span className="font-sans text-[10px] text-bark-300 flex items-center gap-1"><Clock size={10} />{t.est_minutes}m</span>}
                            {t.est_cost_cents != null && <span className={`font-sans text-[10px] ${t.est_cost_cents > 0 ? 'text-gold-500' : 'text-sage-500'}`}>{costLabel(t.est_cost_cents)}</span>}
                          </div>
                        </div>
                        {t.status !== 'done' && t.status !== 'skipped' && (
                          <button onClick={() => skipTask(t)} title="Skip" className="opacity-0 group-hover:opacity-100 text-bark-300 hover:text-bark-500 transition-all"><X size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Ask the cockpit — free-form add-on ideas */}
      <AskPanel onAdd={addTask} />

      {/* Content plan */}
      <ContentPlan items={content} setItems={setContent} assets={assets} setAssets={setAssets} />

      {/* Follow-ups */}
      {followups.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-xl text-bark-600 mb-4">Follow-ups due</h2>
          <div className="space-y-2">
            {followups.map(f => (
              <Followup key={f.id} f={f} onDone={(id) => setFollowups(fs => fs.filter(x => x.id !== id))} />
            ))}
          </div>
        </section>
      )}

      {/* Inbox triage */}
      {props.triage.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-xl text-bark-600 mb-4">Inbox</h2>
          <div className="space-y-2">
            {props.triage.map(t => <TriageRow key={t.id} t={t} />)}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Ask the cockpit — free-form "what else can I do?" ────────────────────────
interface Suggestion { title: string; channel?: string; task_type?: string; why?: string; est_minutes?: number; est_cost?: number }

function AskPanel({ onAdd }: { onAdd: (t: Task) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [err, setErr] = useState('')

  async function ask() {
    if (!q.trim() || busy) return
    setBusy(true); setErr(''); setReply(''); setSuggestions([]); setAdded(new Set())
    try {
      const res = await fetch('/api/portal/cockpit/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error || 'Could not get ideas'); return }
      setReply(d.reply ?? ''); setSuggestions(d.tasks ?? [])
    } catch { setErr('Failed — try again') } finally { setBusy(false) }
  }

  async function add(s: Suggestion, i: number) {
    setAdded(prev => new Set(prev).add(i))
    const res = await fetch('/api/portal/cockpit/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s),
    })
    const d = await res.json()
    if (d.task) onAdd(d.task)
  }

  return (
    <section className="mb-10">
      <h2 className="font-serif text-xl text-bark-600 mb-1">Ask the cockpit</h2>
      <p className="font-sans text-[11px] text-bark-400 mb-3">Ask anything — &ldquo;what can I do to reach doulas?&rdquo;, &ldquo;ideas for a slow week&rdquo; — and add the ideas straight to today&rsquo;s list.</p>
      <div className="flex gap-2">
        <input
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder="What marketing can I do today?"
          className="flex-1 px-4 py-2.5 border border-cream-300 bg-white rounded-lg font-sans text-sm text-bark-700 focus:outline-none focus:border-bark-400"
        />
        <button onClick={ask} disabled={busy || !q.trim()}
          className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded-lg hover:bg-bark-700 disabled:opacity-50">
          {busy ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />} Ask
        </button>
      </div>
      {err && <p className="font-sans text-xs text-red-500 mt-2">{err}</p>}
      {reply && <p className="font-sans text-sm text-bark-600 leading-relaxed mt-4 bg-cream-50 border border-cream-200 rounded-xl p-4">{reply}</p>}
      {suggestions.length > 0 && (
        <div className="space-y-2 mt-3">
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-3 bg-white border border-cream-200 rounded-xl p-3.5">
              <div className="flex-1 min-w-0">
                <p className="font-sans text-sm text-bark-700">{s.title}</p>
                {s.why && <p className="font-sans text-xs text-bark-400 mt-0.5">{s.why}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  {s.channel && <span className="font-sans text-[9px] tracking-[0.15em] uppercase text-bark-400 bg-cream-100 rounded px-2 py-0.5">{s.channel}</span>}
                  {s.est_minutes != null && <span className="font-sans text-[10px] text-bark-300 flex items-center gap-1"><Clock size={10} />{s.est_minutes}m</span>}
                  {s.est_cost != null && <span className={`font-sans text-[10px] ${s.est_cost > 0 ? 'text-gold-500' : 'text-sage-500'}`}>{s.est_cost > 0 ? `$${s.est_cost}` : 'Free'}</span>}
                </div>
              </div>
              <button onClick={() => add(s, i)} disabled={added.has(i)}
                className="shrink-0 inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.15em] uppercase rounded px-3 py-1.5 transition-colors disabled:opacity-60 bg-cream-100 text-bark-600 hover:bg-cream-200">
                {added.has(i) ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Content plan + image scorer ──────────────────────────────────────────────
function ContentPlan({ items, setItems, assets, setAssets }: {
  items: ContentQueueItem[]; setItems: (f: (i: ContentQueueItem[]) => ContentQueueItem[]) => void
  assets: ContentAsset[]; setAssets: (f: (a: ContentAsset[]) => ContentAsset[]) => void
}) {
  const [copied, setCopied] = useState<string | null>(null)

  async function mark(id: string, status: 'posted' | 'skipped') {
    const postUrl = status === 'posted' ? (window.prompt('Post URL (optional):') ?? '') : ''
    setItems(is => is.map(x => x.id === id ? { ...x, status } : x))
    await fetch('/api/portal/cockpit/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, postUrl }) })
  }
  function copy(text: string, id: string) {
    navigator.clipboard?.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 1500)
  }

  return (
    <section className="mb-10">
      <h2 className="font-serif text-xl text-bark-600 mb-4">Content plan</h2>
      {items.length === 0 && <p className="font-sans text-sm text-bark-400 mb-4">No posts suggested today.</p>}
      <div className="space-y-3 mb-6">
        {items.map(c => (
          <div key={c.id} className={`bg-white border rounded-xl p-4 ${c.status === 'posted' ? 'border-sage-200 bg-sage-50/30' : c.status === 'skipped' ? 'border-cream-200 opacity-50' : 'border-cream-200'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-600 bg-cream-100 rounded px-2 py-0.5">{c.platform}</span>
                {c.suggested_time && <span className="font-sans text-[11px] text-bark-400 flex items-center gap-1"><Clock size={11} />{c.suggested_time}</span>}
              </div>
              {c.status === 'posted' ? <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-sage-600">Posted</span> : (
                <div className="flex items-center gap-2">
                  <button onClick={() => mark(c.id, 'skipped')} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600">Skip</button>
                  <button onClick={() => mark(c.id, 'posted')} className="font-sans text-[10px] tracking-[0.15em] uppercase text-cream-50 bg-bark-600 hover:bg-bark-700 rounded px-3 py-1.5 transition-colors">Mark posted</button>
                </div>
              )}
            </div>
            {c.caption_draft && (
              <div className="relative bg-cream-50 border border-cream-200 rounded-lg p-3 mb-2">
                <p className="font-sans text-sm text-bark-600 leading-relaxed whitespace-pre-wrap pr-8">{c.caption_draft}</p>
                <button onClick={() => copy(c.caption_draft!, c.id)} title="Copy caption" className="absolute top-2 right-2 text-bark-300 hover:text-bark-600 transition-colors">
                  {copied === c.id ? <Check size={14} className="text-sage-500" /> : <Copy size={14} />}
                </button>
              </div>
            )}
            {c.image_brief && <p className="font-sans text-xs text-bark-400 leading-relaxed"><span className="uppercase tracking-[0.15em] text-bark-300">Shoot:</span> {c.image_brief}</p>}
          </div>
        ))}
      </div>

      <ImageScorer onScored={(a) => setAssets(as => [a, ...as])} />

      {assets.length > 0 && (
        <div className="mt-6">
          <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3">Recently scored</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {assets.map(a => <AssetCard key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </section>
  )
}

function ImageScorer({ onScored }: { onScored: (a: ContentAsset) => void }) {
  const [busy, setBusy] = useState(false)
  const [platform, setPlatform] = useState('Instagram')
  const [product, setProduct] = useState('')
  const [result, setResult] = useState<ContentAsset | null>(null)
  const [err, setErr] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setErr(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file); fd.append('platform', platform); fd.append('product', product)
      const res = await fetch('/api/portal/cockpit/score-image', { method: 'POST', body: fd })
      const d = await res.json()
      if (res.ok && d.asset) { setResult(d.asset); onScored(d.asset) }
      else setErr(d.error || 'Could not score')
    } catch { setErr('Upload failed') } finally { setBusy(false); e.target.value = '' }
  }

  return (
    <div className="bg-white border border-cream-200 rounded-xl p-4">
      <p className="font-sans text-sm font-medium text-bark-600 mb-1">Score an image for brand fit</p>
      <p className="font-sans text-[11px] text-bark-400 mb-3 leading-relaxed">Upload a photo before posting — get a brand-fit + craft score with specific fixes. Grades fit &amp; craft, not predicted reach.</p>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <label className="block">
          <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">Platform</span>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="mt-1 block w-36 px-2 py-2 border border-cream-300 rounded text-sm text-bark-700 bg-white">
            <option>Instagram</option><option>Pinterest</option><option>Facebook</option><option>TikTok</option><option>Website</option>
          </select>
        </label>
        <label className="block flex-1 min-w-[140px]">
          <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">Product (optional)</span>
          <input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Sauge box" className="mt-1 block w-full px-2 py-2 border border-cream-300 rounded text-sm text-bark-700" />
        </label>
        <label className={`inline-flex items-center gap-2 font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${busy ? 'bg-cream-200 text-bark-400' : 'bg-bark-600 text-cream-50 hover:bg-bark-700'}`}>
          {busy ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />} {busy ? 'Scoring…' : 'Upload'}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} disabled={busy} className="hidden" />
        </label>
      </div>
      {err && <p className="font-sans text-xs text-red-500">{err}</p>}
      {result && <AssetVerdict a={result} />}
    </div>
  )
}

function scoreColor(n: number | null): string {
  if (n == null) return 'text-bark-400'
  return n >= 75 ? 'text-sage-600' : n >= 55 ? 'text-gold-500' : 'text-rose-500'
}

function AssetVerdict({ a }: { a: ContentAsset }) {
  return (
    <div className="mt-3 flex gap-4 bg-cream-50 border border-cream-200 rounded-lg p-3">
      {a.public_url && <img src={a.public_url} alt="" className="w-20 h-20 object-cover rounded-lg shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-4 mb-1">
          <span className={`font-serif text-2xl ${scoreColor(a.composite)}`}>{a.composite ?? '—'}</span>
          <span className="font-sans text-[11px] text-bark-400">fit {a.brand_fit ?? '—'} · craft {a.craft ?? '—'} · {a.recommended_use}</span>
        </div>
        {a.verdict && <p className="font-sans text-xs text-bark-600 leading-relaxed mb-1">{a.verdict}</p>}
        {a.fixes && a.fixes.length > 0 && (
          <ul className="space-y-0.5">
            {a.fixes.map((f, i) => <li key={i} className="font-sans text-[11px] text-bark-400 leading-snug">· {f}</li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

function AssetCard({ a }: { a: ContentAsset }) {
  return (
    <div className="bg-white border border-cream-200 rounded-lg overflow-hidden">
      <div className="relative aspect-square bg-cream-100">
        {a.public_url && <img src={a.public_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <span className={`absolute top-1.5 left-1.5 font-serif text-sm bg-cream-50/90 rounded px-1.5 ${scoreColor(a.composite)}`}>{a.composite ?? '—'}</span>
      </div>
      <div className="p-2">
        <p className="font-sans text-[10px] tracking-[0.1em] uppercase text-bark-400 truncate">{a.recommended_use ?? '—'}</p>
      </div>
    </div>
  )
}

// ── Follow-up + triage rows ──────────────────────────────────────────────────
function Followup({ f, onDone }: { f: FollowupDue; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false)
  async function act(action: 'sent' | 'close') {
    setBusy(true)
    await fetch('/api/portal/cockpit/followups', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f.id, action }) })
    onDone(f.id)
  }
  const who = f.contact?.name || f.contact?.company || f.contact?.email || 'Contact'
  return (
    <div className="flex items-start gap-3 bg-white border border-cream-200 rounded-xl p-3.5">
      <Mail size={15} className="text-bark-300 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm text-bark-700">{who}</p>
        {f.subject && <p className="font-sans text-xs text-bark-400 truncate">{f.subject}</p>}
        <p className="font-sans text-[10px] tracking-[0.1em] uppercase text-rose-400 mt-0.5">Due {f.followup_due}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => act('sent')} disabled={busy} className="font-sans text-[10px] tracking-[0.15em] uppercase text-cream-50 bg-bark-600 hover:bg-bark-700 rounded px-3 py-1.5 transition-colors disabled:opacity-50">Sent again</button>
        <button onClick={() => act('close')} disabled={busy} className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600">Close</button>
      </div>
    </div>
  )
}

const CAT_LABELS: Record<string, string> = {
  b2b_reply: 'B2B reply', partnership_invite: 'Partnership', customer_inquiry: 'Customer',
  inbound_pitch: 'Pitch', vendor_supplier: 'Vendor', spam_newsletter: 'Spam', other: 'Other',
}
function catStyle(cat: string | null): string {
  if (cat === 'b2b_reply' || cat === 'partnership_invite') return 'bg-gold-100 text-gold-600 border-gold-200'
  if (cat === 'customer_inquiry') return 'bg-sage-100 text-sage-600 border-sage-200'
  if (cat === 'spam_newsletter' || cat === 'inbound_pitch') return 'bg-cream-100 text-bark-400 border-cream-200'
  return 'bg-cream-100 text-bark-500 border-cream-200'
}

function TriageRow({ t }: { t: TriageItem }) {
  const who = t.contact?.name || t.contact?.company || t.contact?.email || 'Unknown'
  const muted = t.category === 'spam_newsletter' || t.category === 'inbound_pitch'
  return (
    <div className={`flex items-start gap-3 bg-white border border-cream-200 rounded-xl p-3.5 ${muted ? 'opacity-60' : ''}`}>
      <span className={`font-sans text-[9px] tracking-[0.12em] uppercase border rounded-full px-2 py-1 shrink-0 ${catStyle(t.category)}`}>{CAT_LABELS[t.category ?? 'other'] ?? 'Other'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm text-bark-700">{who}</p>
        <p className="font-sans text-xs text-bark-400 truncate">{t.intent || t.subject || '—'}</p>
      </div>
      {t.sentiment && <span className={`font-sans text-[10px] shrink-0 ${t.sentiment === 'positive' ? 'text-sage-500' : t.sentiment === 'negative' ? 'text-rose-400' : 'text-bark-300'}`}>{t.sentiment}</span>}
    </div>
  )
}
