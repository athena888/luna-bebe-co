'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader, Check } from 'lucide-react'

// Phase 7 reviewer view — built for Emily's Spanish-speaking friend: every
// machine translation side-by-side with its English source, edit in place,
// one click marks it reviewed (goes live on /es). Unreviewed stays "auto"
// and /es keeps showing English for that field.

interface Row { entity_type: string; entity_id: string; field: string; es: string; en: string | null; approved: boolean }

export function TranslationsReview() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'auto' | 'reviewed'>('auto')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    fetch('/api/portal/translations').then(r => r.json())
      .then(d => setRows(d.rows ?? [])).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const keyOf = (r: Row) => `${r.entity_type}:${r.entity_id}:${r.field}`
  const shown = rows.filter(r => (tab === 'auto' ? !r.approved : r.approved))

  async function approve(r: Row) {
    const value = drafts[keyOf(r)] ?? r.es
    await fetch('/api/portal/translations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: r.entity_type, entity_id: r.entity_id, field: r.field, value }),
    })
    load()
  }

  if (loading) return <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12 p-8"><Loader size={16} className="animate-spin" /> Loading…</div>

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-bark-600">Spanish Review</h1>
      <p className="font-sans text-sm text-bark-400 mt-1 mb-6">
        Machine drafts wait here — nothing shows on /es until it&apos;s marked reviewed. Edit the Spanish, then approve.
      </p>
      <div className="flex gap-2 mb-6">
        {(['auto', 'reviewed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`font-sans text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-lg border transition-colors ${tab === t ? 'bg-[#7A8E7C] border-[#7A8E7C] text-white' : 'border-cream-300 text-bark-500 hover:border-bark-400'}`}>
            {t === 'auto' ? `Needs review (${rows.filter(r => !r.approved).length})` : `Reviewed (${rows.filter(r => r.approved).length})`}
          </button>
        ))}
      </div>

      {shown.length === 0 && <p className="font-sans text-sm text-bark-400">Nothing here.</p>}
      <div className="space-y-4">
        {shown.map(r => (
          <div key={keyOf(r)} className="bg-white border border-cream-300 rounded-xl p-4">
            <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-2">{r.entity_type} · {r.entity_id} · {r.field}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-bark-400 mb-1">English</p>
                <p className="font-sans text-sm text-bark-600 leading-relaxed">{r.en ?? '—'}</p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.15em] text-bark-400 mb-1">Español</p>
                <textarea
                  defaultValue={r.es}
                  rows={Math.max(2, Math.ceil(r.es.length / 70))}
                  onChange={e => setDrafts(d => ({ ...d, [keyOf(r)]: e.target.value }))}
                  className="w-full px-3 py-2 border border-cream-300 bg-cream-50 rounded-lg font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400"
                />
              </div>
            </div>
            {tab === 'auto' && (
              <button onClick={() => approve(r)} className="mt-3 flex items-center gap-2 font-sans text-[10px] tracking-[0.15em] uppercase bg-[#7A8E7C] hover:bg-[#6d8070] text-white rounded-lg px-4 py-2">
                <Check size={12} /> Mark reviewed — goes live on /es
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
