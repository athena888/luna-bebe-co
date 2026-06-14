'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, Flame, Building2, Mail, Eye, Upload } from 'lucide-react'
import type { Contact, NeedsAttentionItem, QuarantineRow } from '@/lib/outreach'

type Tab = 'needs' | 'corporate' | 'all' | 'send' | 'quarantine'

const TABS: { id: Tab; label: string }[] = [
  { id: 'needs', label: 'Needs Attention' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'all', label: 'All Contacts' },
  { id: 'send', label: 'Cold Send' },
  { id: 'quarantine', label: 'Quarantine' },
]

interface PreviewItem { to: string; subject: string; body: string; reason: string }
interface SkippedItem { to: string; why: string }

function isCorp(c?: Contact | null) { return !!c && (c.is_corporate || c.source === 'corporate_form') }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function CorpBadge() {
  return <span className="inline-flex items-center gap-1 bg-bark-700 text-cream-50 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded"><Building2 size={9} /> Corp</span>
}

export default function OutreachPage() {
  const [tab, setTab] = useState<Tab>('needs')
  const [needs, setNeeds] = useState<NeedsAttentionItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [quarantine, setQuarantine] = useState<QuarantineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  // Cold Send tab
  const [savingId, setSavingId] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<{ planned: PreviewItem[]; skipped: SkippedItem[]; cap: number } | null>(null)

  async function load(t: Tab) {
    setLoading(true)
    try {
      // The Cold Send tab works off the full contact list.
      const fetchTab = t === 'send' ? 'all' : t
      const res = await fetch(`/api/portal/outreach?tab=${fetchTab}`)
      const d = await res.json()
      if (t === 'needs') setNeeds(d.needs ?? [])
      else if (t === 'quarantine') setQuarantine(d.quarantine ?? [])
      else setContacts(d.contacts ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load(tab) }, [tab])

  // Optimistically patch a contact + persist (enroll toggle / first name / company).
  async function patchContact(id: string, patch: Partial<Contact>) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    setSavingId(id)
    try {
      await fetch('/api/portal/outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', contactId: id, ...patch }),
      })
    } finally { setSavingId(null) }
  }

  async function runPreview() {
    setPreviewing(true); setPreview(null)
    try {
      const res = await fetch('/api/portal/outreach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview' }),
      })
      const d = await res.json()
      setPreview({ planned: d.planned ?? [], skipped: d.skipped ?? [], cap: d.cap ?? 0 })
    } finally { setPreviewing(false) }
  }

  // Bulk CSV import — needs an `email` column; name/company/track optional.
  // Duplicates (by email) are ignored. Imported contacts are auto-enrolled.
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  async function importCsv(file: File) {
    setImporting(true); setImportMsg('')
    try {
      const csv = await file.text()
      const res = await fetch('/api/portal/outreach/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      })
      const d = await res.json()
      if (!res.ok) { setImportMsg(d.error || 'Import failed'); return }
      setImportMsg(`Imported ${d.inserted} new · ignored ${d.duplicates} duplicate${d.duplicates === 1 ? '' : 's'}${d.invalid ? ` · ${d.invalid} invalid` : ''}.`)
      load('send')
    } catch {
      setImportMsg('Import failed — check the file is a .csv with an email column.')
    } finally { setImporting(false) }
  }

  async function resolve(flagId: string) {
    setResolving(flagId)
    try {
      await fetch('/api/portal/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', flagId }) })
      setNeeds(prev => prev.filter(n => n.id !== flagId))
    } finally { setResolving(null) }
  }

  async function review(id: string) {
    setResolving(id)
    try {
      await fetch('/api/portal/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'review', id }) })
      setQuarantine(prev => prev.filter(q => q.id !== id))
    } finally { setResolving(null) }
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-espresso mb-1">Outreach</h1>
      <p className="font-sans text-sm text-bark-400 mb-6 max-w-2xl">Leads and replies that need a response. Corporate inquiries are flagged hot and sorted to the top.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-cream-300">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 font-sans text-sm transition-colors -mb-px border-b-2 ${tab === t.id ? 'border-bark-600 text-bark-700 font-medium' : 'border-transparent text-bark-400 hover:text-bark-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12"><Loader size={16} className="animate-spin" /> Loading…</div>
      ) : tab === 'needs' ? (
        needs.length === 0 ? (
          <p className="font-sans text-sm text-bark-400 py-10 text-center">Nothing needs attention. 🎉</p>
        ) : (
          <div className="space-y-3">
            {needs.map(n => (
              <div key={n.id} className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 ${n.priority === 'hot' ? 'border-terra-300' : 'border-cream-300'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {n.priority === 'hot' && <span className="inline-flex items-center gap-1 text-terra-500 font-sans text-[9px] tracking-[0.15em] uppercase"><Flame size={10} /> Hot</span>}
                    {isCorp(n.contact) && <CorpBadge />}
                    <span className="font-sans text-sm font-medium text-bark-700 truncate">{n.contact?.company || n.contact?.name || n.contact?.email}</span>
                  </div>
                  <p className="font-sans text-xs text-bark-500 mb-1">{n.reason}</p>
                  <p className="font-sans text-[11px] text-bark-400">
                    {n.contact?.name ? `${n.contact.name} · ` : ''}
                    <a href={`mailto:${n.contact?.email}`} className="underline hover:text-bark-600">{n.contact?.email}</a>
                    {n.contact?.company_size ? ` · ${n.contact.company_size}` : ''} · {fmtDate(n.created_at)}
                  </p>
                  {n.contact?.needs && <p className="font-sans text-xs text-bark-500 mt-2 line-clamp-2 bg-cream-50 border border-cream-200 rounded p-2">{n.contact.needs}</p>}
                </div>
                <button onClick={() => resolve(n.id)} disabled={resolving === n.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream-100 text-bark-600 font-sans text-xs font-semibold hover:bg-cream-200 transition-colors disabled:opacity-50">
                  {resolving === n.id ? <Loader size={12} className="animate-spin" /> : <Check size={12} />} Done
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === 'quarantine' ? (
        quarantine.length === 0 ? (
          <p className="font-sans text-sm text-bark-400 py-10 text-center">No quarantined emails. Unknown senders land here for review; non-freemail (likely corporate) sort to the top.</p>
        ) : (
          <div className="space-y-3">
            {quarantine.map(q => (
              <div key={q.id} className={`bg-white border rounded-xl p-4 flex items-start justify-between gap-4 ${q.likely_corporate ? 'border-bark-300' : 'border-cream-300'}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {q.likely_corporate && <CorpBadge />}
                    <a href={`mailto:${q.from_email}`} className="font-sans text-sm font-medium text-bark-700 underline truncate">{q.from_email}</a>
                  </div>
                  {q.subject && <p className="font-sans text-xs text-bark-600 mb-1">{q.subject}</p>}
                  {q.snippet && <p className="font-sans text-xs text-bark-400 line-clamp-2">{q.snippet}</p>}
                  <p className="font-sans text-[11px] text-bark-400 mt-1">{q.from_domain || '—'} · {fmtDate(q.created_at)}</p>
                </div>
                <button onClick={() => review(q.id)} disabled={resolving === q.id}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream-100 text-bark-600 font-sans text-xs font-semibold hover:bg-cream-200 transition-colors disabled:opacity-50">
                  {resolving === q.id ? <Loader size={12} className="animate-spin" /> : <Check size={12} />} Reviewed
                </button>
              </div>
            ))}
          </div>
        )
      ) : tab === 'send' ? (
        <div>
          {/* Intro + dry-run preview */}
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-4 mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <p className="font-sans text-xs text-bark-500 max-w-xl leading-relaxed">
                Only contacts you <strong>enroll</strong> here ever get cold emails. Each needs a <strong>first name</strong> and <strong>company</strong> (the template merge fields) — rows missing either are skipped. Every send carries a CAN-SPAM footer and honors STOP automatically. The weekday cron sends up to your daily cap.
              </p>
              <div className="shrink-0 flex items-center gap-2">
                <label className={`inline-flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 rounded hover:bg-bark-50 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  {importing ? <Loader size={13} className="animate-spin" /> : <Upload size={13} />} Import CSV
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = '' }} />
                </label>
                <button onClick={runPreview} disabled={previewing}
                  className="inline-flex items-center gap-2 bg-bark-600 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 disabled:opacity-50">
                  {previewing ? <Loader size={13} className="animate-spin" /> : <Eye size={13} />} Preview dry run
                </button>
              </div>
            </div>
            {importMsg && <p className="font-sans text-xs text-bark-600 mt-3 bg-white border border-cream-200 rounded p-2">{importMsg}</p>}
            <p className="font-sans text-[11px] text-bark-400 mt-2">
              CSV needs an <strong>email</strong> column; <strong>name</strong>, <strong>company</strong> &amp; <strong>track</strong> are used if present. Duplicate emails are ignored. Imported contacts are auto-enrolled.
            </p>
            {preview && (
              <div className="mt-4 border-t border-cream-200 pt-4">
                <p className="font-sans text-xs text-bark-500 mb-3">
                  <strong>{preview.planned.length}</strong> would send today (cap {preview.cap}) · {preview.skipped.length} skipped. <em>Nothing was sent.</em>
                </p>
                <div className="space-y-3">
                  {preview.planned.map((p, i) => (
                    <div key={i} className="bg-white border border-cream-200 rounded-lg p-3">
                      <p className="font-sans text-[11px] text-bark-400 mb-1">To <strong className="text-bark-600">{p.to}</strong> · <span className="capitalize">{p.reason}</span></p>
                      <p className="font-serif text-sm text-espresso mb-1">{p.subject}</p>
                      <pre className="font-sans text-[11px] text-bark-600 whitespace-pre-wrap leading-relaxed">{p.body}</pre>
                    </div>
                  ))}
                  {preview.planned.length === 0 && (
                    <p className="font-sans text-xs text-bark-400 italic">No one is due to send. Enroll a contact below with a first name + company, then preview again.</p>
                  )}
                </div>
                {preview.skipped.length > 0 && (
                  <div className="mt-3">
                    <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1">Skipped</p>
                    {preview.skipped.map((s, i) => (
                      <p key={i} className="font-sans text-[11px] text-bark-400">{s.to} — {s.why}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enrollment table */}
          {contacts.length === 0 ? (
            <p className="font-sans text-sm text-bark-400 py-10 text-center">No contacts yet.</p>
          ) : (
            <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cream-200 bg-cream-100">
                    {['Enroll', 'First name', 'Email', 'Company', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} className="border-b border-cream-200 last:border-0">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={!!c.outreach_enrolled} onChange={e => patchContact(c.id, { outreach_enrolled: e.target.checked })} className="w-5 h-5 accent-bark-600" />
                      </td>
                      <td className="px-4 py-3">
                        <input defaultValue={c.first_name ?? ''} onBlur={e => { if ((e.target.value.trim() || null) !== (c.first_name ?? null)) patchContact(c.id, { first_name: e.target.value }) }} placeholder="First name" className="w-28 px-2 py-1 border border-cream-300 rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400" />
                      </td>
                      <td className="px-4 py-3"><a href={`mailto:${c.email}`} className="font-sans text-[11px] text-bark-400 underline inline-flex items-center gap-1"><Mail size={9} /> {c.email}</a></td>
                      <td className="px-4 py-3">
                        <input defaultValue={c.company ?? ''} onBlur={e => { if ((e.target.value.trim() || null) !== (c.company ?? null)) patchContact(c.id, { company: e.target.value }) }} placeholder="Company" className="w-36 px-2 py-1 border border-cream-300 rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400" />
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-bark-400">{savingId === c.id ? <Loader size={12} className="animate-spin" /> : c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        contacts.length === 0 ? (
          <p className="font-sans text-sm text-bark-400 py-10 text-center">No {tab === 'corporate' ? 'corporate ' : ''}contacts yet.</p>
        ) : (
          <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-100">
                  {['', 'Contact', 'Company', 'Size', 'Status', 'Updated', 'Enroll'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-sans text-[10px] font-semibold uppercase tracking-wider text-bark-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} className="border-b border-cream-200 last:border-0">
                    <td className="px-3 py-3">{isCorp(c) && <CorpBadge />}</td>
                    <td className="px-4 py-3">
                      <p className="font-sans text-sm text-bark-700">{c.name || '—'}</p>
                      <a href={`mailto:${c.email}`} className="font-sans text-[11px] text-bark-400 underline inline-flex items-center gap-1"><Mail size={9} /> {c.email}</a>
                    </td>
                    <td className="px-4 py-3 font-sans text-sm text-bark-600">{c.company || '—'}</td>
                    <td className="px-4 py-3 font-sans text-xs text-bark-400">{c.company_size || '—'}</td>
                    <td className="px-4 py-3"><span className="font-sans text-[10px] tracking-[0.1em] uppercase bg-cream-200 text-bark-500 px-2 py-0.5 rounded-full capitalize">{c.status}</span></td>
                    <td className="px-4 py-3 font-sans text-xs text-bark-400">{fmtDate(c.updated_at)}</td>
                    <td className="px-4 py-3">
                      {savingId === c.id
                        ? <Loader size={12} className="animate-spin text-bark-400" />
                        : <input type="checkbox" checked={!!c.outreach_enrolled} onChange={e => patchContact(c.id, { outreach_enrolled: e.target.checked })} className="w-4 h-4 accent-bark-600" title="Enroll for cold outreach — set a first name + company in the Cold Send tab" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
