'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader, Sparkles, Bell, Plus, ChevronDown, ChevronUp, Ban } from 'lucide-react'
import type { PressContact } from '@/lib/press-pitch'

// Manual press & gift-guide outreach — SEPARATE from the automated B2B
// pipeline. Emily completes per-contact personalization fields, generates
// Gmail DRAFTS (never sends), and tracks the pipeline by hand. 10/week cap.

const TIERS = ['national-parenting', 'shopping-editorial', 'spanish-market', 'regional'] as const
const STATUS_FLOW: Record<string, Array<{ to: string; label: string }>> = {
  drafted: [{ to: 'sent', label: 'Mark sent' }],
  sent: [{ to: 'replied', label: 'Replied' }, { to: 'sample_requested', label: 'Sample requested' }, { to: 'bumped', label: 'Mark bumped' }, { to: 'declined', label: 'Declined' }],
  bumped: [{ to: 'replied', label: 'Replied' }, { to: 'sample_requested', label: 'Sample requested' }, { to: 'declined', label: 'Declined' }],
  replied: [{ to: 'sample_requested', label: 'Sample requested' }, { to: 'published', label: 'Published' }, { to: 'declined', label: 'Declined' }],
  sample_requested: [{ to: 'published', label: 'Published' }, { to: 'declined', label: 'Declined' }],
}

function readyToDraft(c: PressContact): boolean {
  return c.status === 'new' && !c.suppressed
    && Boolean(c.email?.trim() && c.contact_name?.trim() && c.recent_article_title?.trim() && c.recent_article_url?.trim() && c.why_relevant_note?.trim())
}

export default function PressPage() {
  const [contacts, setContacts] = useState<PressContact[]>([])
  const [weekly, setWeekly] = useState({ used: 0, cap: 10 })
  const [reminders, setReminders] = useState<Array<{ id: string; label: string }>>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newOutlet, setNewOutlet] = useState('')
  const [newTier, setNewTier] = useState<string>('regional')

  const load = useCallback(async () => {
    const d = await fetch('/api/portal/press').then(r => r.json())
    setContacts(d.contacts ?? [])
    setWeekly({ used: d.weeklyDrafted ?? 0, cap: d.cap ?? 10 })
    setReminders(d.reminders ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  async function patch(id: string, fields: Partial<PressContact>) {
    const r = await fetch('/api/portal/press', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...fields }) }).then(x => x.json())
    if (r.error) setNotice(r.error)
    await load()
  }

  function editLocal(id: string, fields: Partial<PressContact>) {
    setContacts(list => list.map(c => c.id === id ? { ...c, ...fields } : c))
  }

  async function addContact() {
    if (!newOutlet.trim()) return
    await fetch('/api/portal/press', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outlet: newOutlet, outlet_tier: newTier }) })
    setNewOutlet('')
    await load()
  }

  async function generate() {
    const ids = [...selected].filter(id => readyToDraft(contacts.find(c => c.id === id)!))
    if (!ids.length) return
    setBusy(true); setNotice(null)
    try {
      const r = await fetch('/api/portal/press/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).then(x => x.json())
      if (r.error) { setNotice(r.error); return }
      const ok = (r.results ?? []).filter((x: { ok: boolean }) => x.ok).length
      const failed = (r.results ?? []).filter((x: { ok: boolean }) => !x.ok)
      setNotice(`${ok} draft${ok === 1 ? '' : 's'} created in Gmail — review and send from there.` +
        (failed.length ? ` Skipped: ${failed.map((f: { outlet: string; why: string }) => `${f.outlet} (${f.why})`).join('; ')}` : ''))
      setSelected(new Set())
      await load()
    } finally { setBusy(false) }
  }

  const counts: Record<string, number> = {}
  for (const c of contacts) counts[c.status] = (counts[c.status] ?? 0) + 1
  const selectable = contacts.filter(readyToDraft)
  const selectedReady = [...selected].filter(id => selectable.some(c => c.id === id))
  const capLeft = Math.max(0, weekly.cap - weekly.used)

  if (loading) return <div className="p-8 flex items-center gap-2 text-bark-400 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <h1 className="font-serif text-2xl text-bark-700 mb-1">Press &amp; Gift Guides</h1>
      <p className="font-sans text-xs text-bark-400 mb-4">Personalized pitches only — drafts land in Gmail for your review; nothing sends automatically. Hard cap {weekly.cap}/week.</p>

      {/* Weekly cap */}
      <div className="bg-white rounded-2xl border border-cream-300 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-sans text-xs text-bark-600">This week: <b>{weekly.used} / {weekly.cap}</b> pitches drafted</p>
          <p className="font-sans text-[10px] text-bark-400">{capLeft} left</p>
        </div>
        <div className="h-1.5 bg-cream-200 rounded-full"><div className="h-full bg-sage-500 rounded-full transition-all" style={{ width: `${Math.min(100, (weekly.used / weekly.cap) * 100)}%` }} /></div>
        <p className="font-sans text-[10px] text-bark-400 mt-3">
          Pipeline: {['new', 'drafted', 'sent', 'bumped', 'replied', 'sample_requested', 'declined', 'published'].map(s => `${s} ${counts[s] ?? 0}`).join(' · ')}
        </p>
      </div>

      {/* Follow-ups due */}
      {reminders.length > 0 && (
        <div className="bg-gold-50 border border-gold-200 rounded-2xl p-4 mb-4">
          <p className="font-sans text-xs text-bark-700 flex items-center gap-1.5 mb-2"><Bell size={13} /> Follow-ups due (manual — send the bump yourself, then mark it)</p>
          {reminders.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 font-sans text-xs text-bark-600 py-1">
              <span>{r.label}</span>
              <button onClick={() => patch(r.id, { status: 'bumped' })} className="shrink-0 border border-cream-300 hover:border-bark-400 rounded px-2.5 py-1 text-[11px] uppercase tracking-wide">Mark bumped</button>
            </div>
          ))}
        </div>
      )}

      {notice && <p className="font-sans text-xs text-bark-700 bg-sage-100 border border-sage-200 rounded-lg px-3 py-2 mb-4 whitespace-pre-wrap">{notice}</p>}

      {/* Contacts */}
      <div className="bg-white rounded-2xl border border-cream-300 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-serif text-lg text-bark-700">Contacts</h2>
          <div className="flex items-center gap-1.5">
            <input value={newOutlet} onChange={e => setNewOutlet(e.target.value)} placeholder="New outlet name"
              className="border border-cream-300 rounded px-2 py-1.5 font-sans text-xs bg-cream-50 focus:outline-none focus:border-gold-300" />
            <select value={newTier} onChange={e => setNewTier(e.target.value)} className="border border-cream-300 rounded px-1.5 py-1.5 font-sans text-xs bg-cream-50">
              {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={addContact} className="inline-flex items-center gap-1 bg-cream-200 hover:bg-cream-300 text-bark-600 rounded px-2.5 py-1.5 font-sans text-xs"><Plus size={12} /> Add</button>
          </div>
        </div>

        <div className="space-y-2">
          {contacts.map(c => {
            const open = expanded === c.id
            const ready = readyToDraft(c)
            const history = contacts.filter(x => x.outlet === c.outlet && x.id !== c.id)
            return (
              <div key={c.id} className={`border rounded-xl px-3 py-2.5 ${c.suppressed ? 'border-rose-300 bg-rose-200/20' : ready ? 'border-sage-200' : 'border-cream-200'}`}>
                <div className="flex items-center gap-2.5">
                  <input type="checkbox" disabled={!ready} checked={selected.has(c.id)}
                    onChange={e => setSelected(prev => { const n = new Set(prev); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-bark-700 truncate">
                      <b>{c.outlet}</b>
                      {c.contact_name ? ` · ${c.contact_name}` : <span className="text-bark-400"> · no contact yet</span>}
                      {c.suppressed && <span className="ml-2 inline-flex items-center gap-0.5 text-rose-500 text-[10px] uppercase"><Ban size={10} /> suppressed</span>}
                    </p>
                    <p className="font-sans text-[10px] text-bark-400">{c.outlet_tier} · {c.language} · <span className="uppercase tracking-wide">{c.status}</span>{ready && ' · READY ✓'}</p>
                  </div>
                  {(STATUS_FLOW[c.status] ?? []).map(a => (
                    <button key={a.to} onClick={() => patch(c.id, { status: a.to as PressContact['status'] })}
                      className="shrink-0 border border-cream-300 hover:border-bark-400 rounded px-2 py-1 font-sans text-[10px] uppercase tracking-wide text-bark-500">{a.label}</button>
                  ))}
                  <button onClick={() => setExpanded(open ? null : c.id)} className="shrink-0 text-bark-400 hover:text-bark-600">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                </div>

                {open && (
                  <div className="mt-3 pt-3 border-t border-cream-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      ['contact_name', 'Contact name'], ['email', 'Email'], ['role', 'Role'],
                      ['recent_article_title', 'Recent article title'], ['recent_article_url', 'Recent article URL'],
                    ] as const).map(([f, label]) => (
                      <label key={f} className="block">
                        <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">{label}</span>
                        <input value={(c[f] as string) ?? ''} onChange={e => editLocal(c.id, { [f]: e.target.value })} onBlur={e => patch(c.id, { [f]: e.target.value })}
                          className="mt-0.5 w-full border border-cream-300 rounded px-2 py-1 font-sans text-xs bg-cream-50 focus:outline-none focus:border-gold-300" />
                      </label>
                    ))}
                    <label className="block sm:col-span-2">
                      <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Why relevant (one line — becomes the personalization)</span>
                      <input value={c.why_relevant_note ?? ''} onChange={e => editLocal(c.id, { why_relevant_note: e.target.value })} onBlur={e => patch(c.id, { why_relevant_note: e.target.value })}
                        className="mt-0.5 w-full border border-cream-300 rounded px-2 py-1 font-sans text-xs bg-cream-50 focus:outline-none focus:border-gold-300" />
                    </label>
                    <label className="flex items-center gap-2 font-sans text-xs text-bark-500">
                      <input type="checkbox" checked={c.sample_sent} onChange={e => patch(c.id, { sample_sent: e.target.checked })} /> Sample sent
                    </label>
                    <label className="flex items-center gap-2 font-sans text-xs text-bark-500">
                      Language:
                      <select value={c.language} onChange={e => patch(c.id, { language: e.target.value as 'en' | 'es' })} className="border border-cream-300 rounded px-1.5 py-1 bg-cream-50 text-xs">
                        <option value="en">en</option><option value="es">es</option>
                      </select>
                    </label>
                    {c.draft_subject_a && (
                      <div className="sm:col-span-2 bg-cream-50 border border-cream-200 rounded-lg p-2.5">
                        <p className="font-sans text-[10px] uppercase tracking-wide text-bark-400 mb-1">Last generated draft (in Gmail with subject A — swap to B there if you prefer)</p>
                        <p className="font-sans text-xs text-bark-600">A: {c.draft_subject_a}</p>
                        {c.draft_subject_b && <p className="font-sans text-xs text-bark-600">B: {c.draft_subject_b}</p>}
                        <p className="font-sans text-[11px] text-bark-500 mt-1.5 whitespace-pre-wrap line-clamp-6">{c.draft_body}</p>
                      </div>
                    )}
                    <label className="block sm:col-span-2">
                      <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Notes</span>
                      <input value={c.notes ?? ''} onChange={e => editLocal(c.id, { notes: e.target.value })} onBlur={e => patch(c.id, { notes: e.target.value })}
                        className="mt-0.5 w-full border border-cream-300 rounded px-2 py-1 font-sans text-xs bg-cream-50 focus:outline-none focus:border-gold-300" />
                    </label>
                    {history.length > 0 && (
                      <p className="sm:col-span-2 font-sans text-[10px] text-bark-400">Outlet history: {history.map(h => `${h.contact_name || 'unnamed'} — ${h.status}`).join(' · ')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cream-200">
          <p className="font-sans text-xs text-bark-500">{selectedReady.length} selected &amp; complete{capLeft === 0 && <span className="text-rose-500"> — weekly cap reached</span>}</p>
          <button onClick={generate} disabled={busy || !selectedReady.length || capLeft === 0}
            className="inline-flex items-center gap-1.5 bg-bark-700 text-cream-50 hover:bg-bark-600 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl">
            {busy ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate drafts → Gmail
          </button>
        </div>
      </div>
    </div>
  )
}
