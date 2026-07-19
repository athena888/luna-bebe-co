'use client'

import { useState } from 'react'

// Inline editor for the weekly one-sentence note. Saves on blur / Enter.
export function ScorecardNote({ weekOf, initial }: { weekOf: string; initial: string | null }) {
  const [value, setValue] = useState(initial ?? '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    if (value === (initial ?? '') && state !== 'error') return
    setState('saving')
    try {
      const res = await fetch('/api/portal/scorecard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_of: weekOf, note: value }),
      })
      setState(res.ok ? 'saved' : 'error')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={e => { setValue(e.target.value); setState('idle') }}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        placeholder="Next week I will change…"
        className="w-full px-2 py-1 bg-transparent border-b border-cream-300 font-sans text-xs text-bark-600 placeholder:text-bark-400/40 focus:outline-none focus:border-gold-400 transition-colors"
      />
      {state === 'saving' && <span className="font-sans text-[10px] text-bark-400 shrink-0">…</span>}
      {state === 'saved' && <span className="font-sans text-[10px] text-sage-400 shrink-0">✓</span>}
      {state === 'error' && <span className="font-sans text-[10px] text-rose-400 shrink-0">retry</span>}
    </div>
  )
}
