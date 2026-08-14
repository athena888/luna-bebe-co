'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Loader, UploadCloud, Download, Check } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'

// Lookbook — corporate price calculator + PDF upload. The AI builder
// (generated copy, image slots, PDF renderer, preview) was removed 2026-08-14:
// Emily designs the lookbook herself and uploads the finished PDF here. The
// stable public link /corporate/lookbook.pdf always serves the current upload.

interface Tier {
  id: string; name: string; price: number
  corporate_price_10: number | null; corporate_price_25: number | null; corporate_price_50: number | null
  description: string | null; sort: number
}
interface Version { id: string; version: number; is_current: boolean; published_at: string; downloadUrl?: string }

export default function LookbookPage() {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [includeFirstTouch, setIncludeFirstTouch] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [t, v] = await Promise.all([
      fetch('/api/portal/lookbook/tiers').then(r => r.json()),
      fetch('/api/portal/lookbook/publish').then(r => r.json()),
    ])
    setTiers(t.tiers ?? [])
    setIncludeFirstTouch(Boolean(t.corporate?.include_in_first_touch))
    setVersions(v.versions ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function saveTier(t: Tier) {
    await fetch('/api/portal/lookbook/tiers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
  }

  async function saveFirstTouch(checked: boolean) {
    setIncludeFirstTouch(checked)
    await fetch('/api/portal/lookbook/tiers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ include_in_first_touch: checked }) })
  }

  async function uploadPdf(file: File) {
    setNotice(null)
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setNotice('Please choose a PDF file.'); return }
    if (file.size > 40 * 1024 * 1024) { setNotice('PDF is over the 40MB limit.'); return }
    setUploading(true)
    try {
      const signed = await fetch('/api/portal/lookbook/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign' }),
      }).then(r => r.json())
      if (signed.error) throw new Error(signed.error)
      const up = await supabaseBrowser.storage.from('brand-assets')
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: 'application/pdf', upsert: true })
      if (up.error) throw new Error(up.error.message)
      const fin = await fetch('/api/portal/lookbook/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize', path: signed.path, version: signed.version }),
      }).then(r => r.json())
      if (fin.error) throw new Error(fin.error)
      setNotice(`v${fin.version} is live at /corporate/lookbook.pdf`)
      await load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const num = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v) || 0)))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-bark-700">Lookbook</h1>
        <Link href="/portal/lookbook/images" className="font-sans text-xs text-sage-600 underline">Image library</Link>
      </div>
      <p className="font-sans text-xs text-bark-400 mb-5">Corporate pricing per box, and the lookbook PDF you upload. The public link <span className="text-bark-600">/corporate/lookbook.pdf</span> always serves the newest upload.</p>

      {notice && <p className="font-sans text-xs text-bark-700 bg-sage-100 border border-sage-200 rounded-lg px-3 py-2 mb-4">{notice}</p>}

      {/* ── Corporate price calculator ── */}
      <div className="bg-white rounded-2xl border border-cream-300 p-4 overflow-x-auto mb-4">
        <h2 className="font-serif text-lg text-bark-700 mb-1">Pricing per box</h2>
        <p className="font-sans text-[10px] text-bark-400 mb-3">One row per live catalog variant — names &amp; retail prices mirror the store (edit those in the catalog). The 10+/25+/50+ prices and one-liners are corporate-only; unedited volume prices default to ~5/10/15% off retail.</p>
        <table className="w-full min-w-[560px] font-sans text-xs text-bark-600">
          <thead><tr className="text-left text-[10px] uppercase tracking-wide text-bark-400">
            <th className="pb-2 pr-2">Name</th><th className="pb-2 pr-2 w-16">Price</th>
            <th className="pb-2 pr-2 w-16">10+</th><th className="pb-2 pr-2 w-16">25+</th><th className="pb-2 pr-2 w-16">50+</th>
            <th className="pb-2">One-liner</th>
          </tr></thead>
          <tbody>
            {tiers.map((t, i) => {
              const catalogOwned = t.id.includes(':')
              return (
                <tr key={t.id} className="border-t border-cream-200">
                  {(['name', 'price', 'corporate_price_10', 'corporate_price_25', 'corporate_price_50', 'description'] as const).map(f => {
                    const locked = catalogOwned && (f === 'name' || f === 'price')
                    return (
                      <td key={f} className="py-1.5 pr-2">
                        <input
                          value={t[f] ?? ''}
                          type={f === 'name' || f === 'description' ? 'text' : 'number'}
                          disabled={locked}
                          title={locked ? 'From the live catalog — edit there' : undefined}
                          onChange={e => {
                            const v = f === 'name' || f === 'description' ? e.target.value : (num(e.target.value) as never)
                            setTiers(list => list.map((x, j) => (j === i ? { ...x, [f]: v } : x)))
                          }}
                          onBlur={() => saveTier(tiers[i])}
                          className={locked
                            ? 'w-full border border-transparent rounded px-1.5 py-1 bg-transparent text-bark-500'
                            : 'w-full border border-cream-300 rounded px-1.5 py-1 bg-cream-50 focus:outline-none focus:border-gold-300'}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Lookbook PDF upload + versions ── */}
      <div className="bg-white rounded-2xl border border-cream-300 p-4">
        <h2 className="font-serif text-lg text-bark-700 mb-1">Lookbook PDF</h2>
        <p className="font-sans text-[10px] text-bark-400 mb-3">Upload the finished PDF (up to 40MB). It immediately becomes the live /corporate/lookbook.pdf; older versions stay downloadable below.</p>
        <input
          ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) void uploadPdf(f) }}
        />
        <button
          onClick={() => fileRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 text-cream-50 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl mb-4"
        >
          {uploading ? <Loader size={13} className="animate-spin" /> : <UploadCloud size={13} />}
          {uploading ? 'Uploading…' : 'Upload new lookbook PDF'}
        </button>

        {!versions.length ? (
          <p className="font-sans text-xs text-bark-400">Nothing uploaded yet. Outreach replies get the &ldquo;I&rsquo;ll send it this week&rdquo; fallback until v1 is up.</p>
        ) : (
          <div className="space-y-1.5">
            {versions.map(v => (
              <div key={v.id} className="flex items-center gap-2 font-sans text-xs text-bark-600 border-t border-cream-200 pt-1.5 first:border-0 first:pt-0">
                <b className="font-serif text-sm">v{v.version}</b>
                {v.is_current && <span className="inline-flex items-center gap-0.5 bg-sage-100 text-sage-600 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide"><Check size={9} /> current</span>}
                <span className="text-bark-400">{new Date(v.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {v.downloadUrl && <a href={v.downloadUrl} className="ml-auto inline-flex items-center gap-1 text-sage-600 underline" target="_blank" rel="noopener noreferrer"><Download size={11} /> download</a>}
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 font-sans text-xs text-bark-500 mt-4">
          <input type="checkbox" checked={includeFirstTouch} onChange={e => saveFirstTouch(e.target.checked)} />
          Include the lookbook link directly in first-touch outreach emails (default off — current strategy is lookbook-on-reply)
        </label>
      </div>
    </div>
  )
}
