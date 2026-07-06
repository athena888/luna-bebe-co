'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader, Check, RotateCcw } from 'lucide-react'

export interface ScrimVal { hex: string; opacity: number }

// Module-level cache so many controls on one page share a single fetch.
let scrimCache: Promise<Record<string, ScrimVal>> | null = null
function loadScrims(): Promise<Record<string, ScrimVal>> {
  if (!scrimCache) {
    scrimCache = fetch('/api/portal/site-scrims')
      .then(r => r.json())
      .then(d => (d.scrims ?? {}) as Record<string, ScrimVal>)
      .catch(() => ({}))
  }
  return scrimCache
}
function invalidate() { scrimCache = null }

// A colour + opacity control for the translucent tint laid over a background
// image. Self-loads its current value (deduped across the page) and writes to
// /api/portal/site-scrims. Drop it next to any image whose front gets a colour
// overlay — Site Images, Home Content, Story, etc.
export function ScrimControl({ scrimKey, defaultScrim, label = 'Colour overlay', note = 'tint over the image' }: {
  scrimKey: string
  defaultScrim: ScrimVal
  label?: string
  note?: string
}) {
  const [stored, setStored] = useState<ScrimVal | null>(null)  // saved DB value, null = default
  const [hex, setHex] = useState(defaultScrim.hex)
  const [pct, setPct] = useState(Math.round(defaultScrim.opacity * 100))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    loadScrims().then(map => {
      if (!alive) return
      const v = map[scrimKey]
      if (v) { setStored(v); setHex(v.hex); setPct(Math.round(v.opacity * 100)) }
    })
    return () => { alive = false }
  }, [scrimKey])

  function schedule(newHex: string, newPct: number) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => persist(newHex, newPct), 600)
  }

  async function persist(h: string, p: number) {
    setSaving(true)
    try {
      await fetch('/api/portal/site-scrims', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotKey: scrimKey, hex: h, opacity: p / 100 }),
      })
      setStored({ hex: h, opacity: p / 100 })
      invalidate()
      setSaved(true); setTimeout(() => setSaved(false), 1500)
    } finally { setSaving(false) }
  }

  async function reset() {
    if (timer.current) clearTimeout(timer.current)
    setHex(defaultScrim.hex)
    setPct(Math.round(defaultScrim.opacity * 100))
    setStored(null)
    invalidate()
    await fetch(`/api/portal/site-scrims?slotKey=${encodeURIComponent(scrimKey)}`, { method: 'DELETE' })
  }

  return (
    <div className="mt-4 pt-4 border-t border-cream-200">
      <div className="flex items-center justify-between mb-2">
        <p className="font-sans text-[10px] tracking-[0.12em] uppercase text-bark-500">
          {label} <span className="normal-case tracking-normal text-bark-400">— {note}</span>
        </p>
        <div className="flex items-center gap-2">
          {saving && <Loader size={11} className="animate-spin text-bark-400" />}
          {saved && !saving && <span className="inline-flex items-center gap-1 font-sans text-[10px] text-sage-600"><Check size={10} /> Saved</span>}
          {stored && (
            <button onClick={reset} title="Reset to default" className="inline-flex items-center gap-1 font-sans text-[9px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600 transition-colors">
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Colour swatch / picker */}
        <label className="relative cursor-pointer shrink-0" title="Pick colour">
          <div className="w-8 h-8 rounded border border-cream-300 overflow-hidden">
            <div className="w-full h-full" style={{ backgroundColor: hex }} />
          </div>
          <input
            type="color"
            value={hex}
            onChange={e => { setHex(e.target.value); schedule(e.target.value, pct) }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </label>
        {/* Hex input */}
        <input
          value={hex}
          onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) { setHex(e.target.value); if (e.target.value.length === 7) schedule(e.target.value, pct) } }}
          className="w-24 px-2 py-1.5 border border-cream-300 rounded font-mono text-xs text-bark-600 focus:outline-none focus:border-bark-400"
          placeholder={defaultScrim.hex}
        />
      </div>
      {/* Opacity slider — its own row under the swatch so it never gets cramped */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="range" min={0} max={100} value={pct}
          onChange={e => { setPct(+e.target.value); schedule(hex, +e.target.value) }}
          className="flex-1 accent-bark-600"
        />
        <span className="font-sans text-[11px] text-bark-500 w-9 text-right shrink-0">{pct}%</span>
      </div>
      {/* Live preview over a checkerboard so transparency is visible */}
      <div className="mt-2 h-6 rounded overflow-hidden border border-cream-200 relative bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVQYlWNgYGCQwoKxgqGgcJA5h5yTAAAI4AApTKdiVgAAAABJRU5ErkJggg==')] bg-repeat">
        <div className="absolute inset-0" style={{ backgroundColor: hex, opacity: pct / 100 }} />
      </div>
    </div>
  )
}
