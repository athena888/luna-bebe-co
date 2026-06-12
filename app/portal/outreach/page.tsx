'use client'

import { useState, useEffect } from 'react'
import { Loader, Check, Flame, Building2, Mail } from 'lucide-react'
import type { Contact, NeedsAttentionItem } from '@/lib/outreach'

type Tab = 'needs' | 'corporate' | 'all'

const TABS: { id: Tab; label: string }[] = [
  { id: 'needs', label: 'Needs Attention' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'all', label: 'All Contacts' },
]

function isCorp(c?: Contact | null) { return !!c && (c.is_corporate || c.source === 'corporate_form') }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

function CorpBadge() {
  return <span className="inline-flex items-center gap-1 bg-bark-700 text-cream-50 font-sans text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 rounded"><Building2 size={9} /> Corp</span>
}

export default function OutreachPage() {
  const [tab, setTab] = useState<Tab>('needs')
  const [needs, setNeeds] = useState<NeedsAttentionItem[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)

  async function load(t: Tab) {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/outreach?tab=${t}`)
      const d = await res.json()
      if (t === 'needs') setNeeds(d.needs ?? [])
      else setContacts(d.contacts ?? [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load(tab) }, [tab])

  async function resolve(flagId: string) {
    setResolving(flagId)
    try {
      await fetch('/api/portal/outreach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', flagId }) })
      setNeeds(prev => prev.filter(n => n.id !== flagId))
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
      ) : (
        contacts.length === 0 ? (
          <p className="font-sans text-sm text-bark-400 py-10 text-center">No {tab === 'corporate' ? 'corporate ' : ''}contacts yet.</p>
        ) : (
          <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-100">
                  {['', 'Contact', 'Company', 'Size', 'Status', 'Updated'].map(h => (
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
