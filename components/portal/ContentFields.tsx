'use client'

import { useState } from 'react'
import { Loader, Sparkles } from 'lucide-react'

// Shared editable-copy field bits used by the Homepage and Story editors. The
// ✨ "Ideas" button sits inline next to each field and asks Claude (brand voice)
// for a few on-brand options via /api/portal/home-content/ai-suggest.

export type AiKind = 'eyebrow' | 'title' | 'tagline' | 'body' | 'bullet' | 'text'
export type AiOpt = { kind: AiKind; context?: string }

export function AiSuggest({ fieldLabel, kind, current, context, onPick }: {
  fieldLabel: string
  kind: AiKind
  current?: string
  context?: string
  onPick: (v: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [opts, setOpts] = useState<string[] | null>(null)
  const [err, setErr] = useState('')

  async function go() {
    setBusy(true); setErr(''); setOpts(null)
    try {
      const res = await fetch('/api/portal/home-content/ai-suggest', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldLabel, kind, current, context }),
      })
      const d = await res.json()
      if (d.options?.length) setOpts(d.options)
      else setErr(d.error || 'No ideas')
    } catch { setErr('Failed') } finally { setBusy(false) }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        title="Suggest a few on-brand options"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-gold-300 bg-gold-50/40 text-bark-500 hover:border-gold-400 hover:text-bark-700 transition-colors disabled:opacity-40"
      >
        {busy ? <Loader size={11} className="animate-spin" /> : <Sparkles size={11} className="text-gold-400" />}
        <span className="font-sans text-[9px] tracking-[0.15em] uppercase">Ideas</span>
      </button>
      {(opts || err) && (
        <div className="absolute right-0 z-40 mt-1 w-72 bg-white border border-cream-300 rounded-lg shadow-xl p-1">
          {err ? (
            <p className="px-2 py-1.5 font-sans text-[11px] text-red-500">{err}</p>
          ) : (
            opts!.map((o, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onPick(o); setOpts(null) }}
                className="block w-full text-left px-2.5 py-2 font-sans text-xs text-bark-600 leading-snug hover:bg-cream-100 rounded transition-colors"
              >
                {o}
              </button>
            ))
          )}
          <button type="button" onClick={() => { setOpts(null); setErr('') }} className="block w-full text-center px-2 py-1 font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600">Close</button>
        </div>
      )}
    </div>
  )
}

export function Field({ label, value, onChange, placeholder, ai }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; ai?: AiOpt }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 min-h-[18px]">
        <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
        {ai && <AiSuggest fieldLabel={label} kind={ai.kind} current={value} context={ai.context} onPick={onChange} />}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 focus:outline-none focus:border-bark-400"
      />
    </label>
  )
}

export function Area({ label, value, onChange, rows = 3, ai }: { label: string; value: string; onChange: (v: string) => void; rows?: number; ai?: AiOpt }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 min-h-[18px]">
        <span className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400">{label}</span>
        {ai && <AiSuggest fieldLabel={label} kind={ai.kind} current={value} context={ai.context} onPick={onChange} />}
      </span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full px-3 py-2 border border-cream-300 bg-white rounded text-sm text-bark-700 leading-relaxed focus:outline-none focus:border-bark-400"
      />
    </label>
  )
}
