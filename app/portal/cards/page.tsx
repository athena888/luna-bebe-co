'use client'

import { useEffect, useState } from 'react'
import { Loader, Download, CheckCheck, PenLine } from 'lucide-react'

// Pen-written gift cards — every order still needing one, in the exact
// mat/slot order the Cricut files use. Download a mat, write it, then
// "Mark batch done" so the next batch starts fresh.

interface PendingCard {
  id: string
  recipient: string
  message: string
  created_at: string
  handwrite: boolean
  mat: number | null
  slot: number | null
  row: number | null
  col: number | null
}

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

export default function CardsPage() {
  const [cards, setCards] = useState<PendingCard[] | null>(null)
  const [flagMissing, setFlagMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  function load() {
    fetch('/api/portal/cards')
      .then(r => r.json())
      .then(d => { setCards(d.cards ?? []); setFlagMissing(!!d.flagColumnMissing) })
      .catch(() => setNotice('Failed to load — refresh to retry.'))
  }
  useEffect(load, [])

  async function markDone() {
    if (!confirm('Mark every card below as written? They will disappear from this queue.')) return
    setBusy(true)
    setNotice('')
    try {
      const res = await fetch('/api/portal/cards', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setNotice(d.error || 'Failed')
      else { setNotice(`Marked ${d.marked} card(s) as written.`); load() }
    } finally {
      setBusy(false)
    }
  }

  const writable = (cards ?? []).filter(c => !c.handwrite)
  const handwrite = (cards ?? []).filter(c => c.handwrite)
  const mats = writable.length ? Math.max(...writable.map(c => c.mat ?? 1)) : 0

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-3xl text-bark-600">Gift Cards to Write</h1>
        <div className="flex items-center gap-2">
          {Array.from({ length: mats }, (_, i) => (
            <a
              key={i}
              href={`/api/portal/cards/mat?n=${i + 1}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bark-600 text-cream-50 font-sans text-xs font-semibold hover:bg-bark-700 transition-colors"
            >
              <Download size={13} /> Mat {i + 1}
            </a>
          ))}
          {writable.length > 0 && !flagMissing && (
            <button
              onClick={markDone}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sage-100 text-sage-600 font-sans text-xs font-semibold hover:bg-sage-200 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader size={13} className="animate-spin" /> : <CheckCheck size={13} />} Mark batch done
            </button>
          )}
        </div>
      </div>
      <p className="font-sans text-sm text-bark-400 mb-2">
        Cards clear automatically when their order ships, or when you mark a batch done. Each preview is exactly what the pen will write. Download a mat file, upload to Design Space, set the
        <span className="font-mono text-[11px]"> write </span> layer to Pen, place cards on the guides, go.
      </p>
      {flagMissing && (
        <p className="font-sans text-xs text-rose-400 mb-4">
          Run §36 of _RUN_ALL_PENDING.sql to enable &ldquo;Mark batch done&rdquo; — until then this lists every order with a message.
        </p>
      )}
      {notice && <p className="font-sans text-xs text-bark-500 mb-4">{notice}</p>}

      {cards === null ? (
        <p className="font-sans text-sm text-bark-400 mt-6">Loading…</p>
      ) : writable.length === 0 && handwrite.length === 0 ? (
        <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center mt-4">
          <PenLine size={20} className="mx-auto text-bark-300 mb-3" />
          <p className="font-sans text-sm text-bark-400">No cards waiting — orders in processing with a gift message appear here, and clear when they ship.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
            {writable.map(c => (
              <div key={c.id} className="bg-cream-50 rounded-2xl border border-cream-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[10px] tracking-[0.15em] uppercase px-2 py-0.5 rounded bg-gold-100 text-gold-600 font-semibold">
                    Mat {c.mat} · Slot {c.slot} (r{c.row}c{c.col})
                  </span>
                  <span className="font-sans text-[11px] text-bark-400">{c.recipient ? `Dear ${c.recipient}` : '(no name)'} · {fmtDate(c.created_at)}</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/portal/cards/svg?order=${c.id}`} alt={`Card for order ${c.id.slice(0, 8)}`} className="w-full rounded-lg border border-cream-200 bg-white" />
                <p className="font-sans text-[11px] text-bark-400 mt-2 line-clamp-2">{c.message}</p>
                <p className="font-mono text-[10px] text-bark-300 mt-1">#{c.id.slice(0, 8)}</p>
              </div>
            ))}
          </div>

          {handwrite.length > 0 && (
            <section className="mt-8">
              <h2 className="font-sans text-[11px] tracking-[0.2em] uppercase text-bark-400 mb-3">
                Handwrite these ({handwrite.length}) — the pen font can&rsquo;t render them
              </h2>
              <div className="space-y-2">
                {handwrite.map(c => (
                  <div key={c.id} className="bg-cream-50 rounded-xl border border-cream-200 p-4">
                    <p className="font-sans text-xs font-semibold text-bark-600 mb-1">{c.recipient ? `Dear ${c.recipient}` : '(no name)'} · <span className="font-mono text-[10px] text-bark-400">#{c.id.slice(0, 8)}</span></p>
                    <p className="font-sans text-sm text-bark-500 whitespace-pre-wrap">{c.message}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
