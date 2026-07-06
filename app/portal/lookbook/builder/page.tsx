'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Loader, Sparkles, Eye, UploadCloud, Download, Check, AlertTriangle, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'

// Lookbook builder — guided 4-step flow (mobile-usable, desktop-optimized):
// 1 Content (tiers + corporate fields) · 2 Images (slot assignment, empties ok)
// · 3 AI copy assist (draft-only, everything editable) · 4 Preview & publish.
// Publish is the only action that creates a version, and it runs the server-side
// banned-phrase gate first. Draft state persists in localStorage.

interface Tier {
  id: string; name: string; price: number
  corporate_price_10: number | null; corporate_price_25: number | null; corporate_price_50: number | null
  description: string | null; sort: number
}
interface Corporate { logo_ribbon?: string; lead_time?: string; contact_line?: string; include_in_first_touch?: boolean }
interface BrandImage { id: string; kind: string | null; tier: string | null; tags: string[]; off_palette: boolean; url?: string }
interface Copy { tagline: string; brand_story: string; tier_descriptions: Record<string, string>; corporate_blurb: string }
interface ImageMap { cover?: string | null; detail?: string | null; tiers: Record<string, string | null> }
interface Version { id: string; version: number; is_current: boolean; published_at: string; downloadUrl?: string }
interface Violation { field: string; phrase: string; excerpt: string }

const EMPTY_COPY: Copy = { tagline: '', brand_story: '', tier_descriptions: {}, corporate_blurb: '' }
const DRAFT_KEY = 'pl-lookbook-draft-v1'
const STEPS = ['Content', 'Images', 'Copy', 'Publish'] as const

export default function LookbookBuilderPage() {
  const [step, setStep] = useState(0)
  const [tiers, setTiers] = useState<Tier[]>([])
  const [corporate, setCorporate] = useState<Corporate>({})
  const [images, setImages] = useState<BrandImage[]>([])
  const [copy, setCopy] = useState<Copy>(EMPTY_COPY)
  const [imageMap, setImageMap] = useState<ImageMap>({ tiers: {} })
  const [versions, setVersions] = useState<Version[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [violations, setViolations] = useState<Violation[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)   // active slot key

  const load = useCallback(async () => {
    const [t, i, v] = await Promise.all([
      fetch('/api/portal/lookbook/tiers').then(r => r.json()),
      fetch('/api/portal/lookbook/images').then(r => r.json()),
      fetch('/api/portal/lookbook/publish').then(r => r.json()),
    ])
    setTiers(t.tiers ?? []); setCorporate(t.corporate ?? {})
    setImages(i.images ?? []); setVersions(v.versions ?? [])
  }, [])
  useEffect(() => {
    void load()
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const d = JSON.parse(saved) as { copy?: Copy; imageMap?: ImageMap }
        if (d.copy) setCopy({ ...EMPTY_COPY, ...d.copy })
        if (d.imageMap) setImageMap({ ...d.imageMap, tiers: d.imageMap.tiers ?? {} })
      }
    } catch { /* ignore */ }
  }, [load])
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ copy, imageMap })) } catch { /* ignore */ }
  }, [copy, imageMap])

  async function saveTier(t: Tier) {
    await fetch('/api/portal/lookbook/tiers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) })
  }
  async function saveCorporate(patch: Corporate) {
    const next = { ...corporate, ...patch }
    setCorporate(next)
    await fetch('/api/portal/lookbook/tiers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }

  async function draftCopy() {
    setBusy('copy'); setNotice(null)
    try {
      const r = await fetch('/api/portal/lookbook/copy-assist', { method: 'POST' }).then(x => x.json())
      if (r.error) throw new Error(r.error)
      setCopy({ ...EMPTY_COPY, ...r.copy })
      setNotice('Draft copy generated — edit anything below before publishing.')
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Copy assist failed') }
    finally { setBusy(null) }
  }

  async function preview() {
    setBusy('preview'); setViolations([]); setNotice(null)
    try {
      const res = await fetch('/api/portal/lookbook/render', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, imageMap }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Render failed')
      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Preview failed') }
    finally { setBusy(null) }
  }

  async function publish() {
    if (!confirm('Publish this lookbook? It becomes the live /corporate/lookbook.pdf immediately.')) return
    setBusy('publish'); setViolations([]); setNotice(null)
    try {
      const res = await fetch('/api/portal/lookbook/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, imageMap }),
      })
      const r = await res.json()
      if (res.status === 422) { setViolations(r.violations ?? []); return }
      if (r.error) throw new Error(r.error)
      setNotice(`Published v${r.version} — live at /corporate/lookbook.pdf`)
      await load()
    } catch (e) { setNotice(e instanceof Error ? e.message : 'Publish failed') }
    finally { setBusy(null) }
  }

  const imgById = new Map(images.map(i => [i.id, i]))
  const slotKeys: { key: string; label: string; get: () => string | null | undefined; set: (id: string | null) => void }[] = [
    { key: 'cover', label: 'Cover hero', get: () => imageMap.cover, set: id => setImageMap(m => ({ ...m, cover: id })) },
    ...tiers.map(t => ({
      key: `tier:${t.name}`, label: t.name,
      get: () => imageMap.tiers[t.name],
      set: (id: string | null) => setImageMap(m => ({ ...m, tiers: { ...m.tiers, [t.name]: id } })),
    })),
    { key: 'detail', label: 'Detail shot', get: () => imageMap.detail, set: id => setImageMap(m => ({ ...m, detail: id })) },
  ]

  const num = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v) || 0)))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="font-serif text-2xl text-bark-700">Lookbook — Builder</h1>
        <Link href="/portal/lookbook/images" className="font-sans text-xs text-sage-600 underline">Image library</Link>
      </div>
      <p className="font-sans text-xs text-bark-400 mb-5">AI copy is draft-only. Nothing goes live without the publish click, and publish is blocked if banned phrasing slips in.</p>

      {/* Step chips */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto">
        {STEPS.map((label, i) => (
          <button key={label} onClick={() => setStep(i)}
            className={`shrink-0 font-sans text-xs px-3.5 py-2 rounded-xl transition-colors ${i === step ? 'bg-bark-700 text-cream-50' : 'bg-white border border-cream-300 text-bark-500 hover:bg-cream-200'}`}>
            {i + 1} · {label}
          </button>
        ))}
      </div>

      {notice && <p className="font-sans text-xs text-bark-700 bg-sage-100 border border-sage-200 rounded-lg px-3 py-2 mb-4">{notice}</p>}
      {violations.length > 0 && (
        <div className="bg-rose-200/70 border border-rose-300 rounded-xl px-4 py-3 mb-4">
          <p className="font-sans text-sm text-bark-700 flex items-center gap-1.5 mb-1"><AlertTriangle size={14} /> Publish blocked — banned phrasing found:</p>
          <ul className="font-sans text-xs text-bark-600 list-disc ml-5 space-y-0.5">
            {violations.map((v, i) => <li key={i}><b>{v.phrase}</b> in {v.field}: “…{v.excerpt}…”</li>)}
          </ul>
        </div>
      )}

      {/* ── Step 1: Content ── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-cream-300 p-4 overflow-x-auto">
            <h2 className="font-serif text-lg text-bark-700 mb-3">Tiers</h2>
            <table className="w-full min-w-[560px] font-sans text-xs text-bark-600">
              <thead><tr className="text-left text-[10px] uppercase tracking-wide text-bark-400">
                <th className="pb-2 pr-2">Name</th><th className="pb-2 pr-2 w-16">Price</th>
                <th className="pb-2 pr-2 w-16">10+</th><th className="pb-2 pr-2 w-16">25+</th><th className="pb-2 pr-2 w-16">50+</th>
                <th className="pb-2">One-liner (used if AI copy is empty)</th>
              </tr></thead>
              <tbody>
                {tiers.map((t, i) => (
                  <tr key={t.id} className="border-t border-cream-200">
                    {(['name', 'price', 'corporate_price_10', 'corporate_price_25', 'corporate_price_50', 'description'] as const).map(f => (
                      <td key={f} className="py-1.5 pr-2">
                        <input
                          value={t[f] ?? ''}
                          type={f === 'name' || f === 'description' ? 'text' : 'number'}
                          onChange={e => {
                            const v = f === 'name' || f === 'description' ? e.target.value : (num(e.target.value) as never)
                            setTiers(list => list.map((x, j) => (j === i ? { ...x, [f]: v } : x)))
                          }}
                          onBlur={() => saveTier(tiers[i])}
                          className="w-full border border-cream-300 rounded px-1.5 py-1 bg-cream-50 focus:outline-none focus:border-gold-300"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-2xl border border-cream-300 p-4 grid sm:grid-cols-3 gap-3">
            {([['logo_ribbon', 'Logo gift-tag option', 'e.g. printed gift tag with your logo on the ribbon, +$2/box'],
              ['lead_time', 'Lead time', 'e.g. 2–3 weeks for 25+'],
              ['contact_line', 'Contact line', 'hello@petitelavande.com · petitelavande.com/corporate']] as const).map(([k, label, ph]) => (
              <label key={k} className="block">
                <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">{label}</span>
                <input value={corporate[k] ?? ''} placeholder={ph}
                  onChange={e => setCorporate(c => ({ ...c, [k]: e.target.value }))}
                  onBlur={e => saveCorporate({ [k]: e.target.value })}
                  className="mt-1 w-full font-sans text-xs border border-cream-300 rounded px-2 py-1.5 bg-cream-50 focus:outline-none focus:border-gold-300" />
              </label>
            ))}
            <label className="sm:col-span-3 flex items-center gap-2 font-sans text-xs text-bark-500 mt-1">
              <input type="checkbox" checked={Boolean(corporate.include_in_first_touch)}
                onChange={e => saveCorporate({ include_in_first_touch: e.target.checked })} />
              Include the lookbook link directly in first-touch outreach emails once published (default off — current strategy is lookbook-on-reply)
            </label>
          </div>
        </div>
      )}

      {/* ── Step 2: Images ── */}
      {step === 1 && (
        <div className="space-y-3">
          {!images.length && <p className="font-sans text-sm text-bark-400">No images in the library yet — <Link className="underline text-sage-600" href="/portal/lookbook/images">upload some</Link>, or continue with empty slots (the layout adapts).</p>}
          {slotKeys.map(slot => {
            const chosen = slot.get() ? imgById.get(slot.get()!) : null
            return (
              <div key={slot.key} className="bg-white rounded-2xl border border-cream-300 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-cream-200 overflow-hidden flex items-center justify-center shrink-0">
                    {chosen?.url
                      // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                      ? <img src={chosen.url} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon size={18} className="text-bark-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-sans text-sm text-bark-700">{slot.label}</p>
                    <p className="font-sans text-[10px] text-bark-400">{chosen ? (chosen.tags.join(' · ') || chosen.kind) : 'Empty — fine, layout adapts'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setPicking(picking === slot.key ? null : slot.key)}
                      className="font-sans text-xs bg-cream-200 hover:bg-cream-300 text-bark-600 rounded-lg px-3 py-2">{chosen ? 'Change' : 'Choose'}</button>
                    {chosen && <button onClick={() => slot.set(null)} className="font-sans text-xs text-bark-400 hover:text-bark-700 px-1">clear</button>}
                  </div>
                </div>
                {picking === slot.key && images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {images.map(img => (
                      <button key={img.id} onClick={() => { slot.set(img.id); setPicking(null) }}
                        className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${slot.get() === img.id ? 'border-gold-400' : 'border-transparent hover:border-cream-300'}`}>
                        {img.url && (
                          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                        )}
                        {img.off_palette && <span className="absolute top-0.5 left-0.5 bg-gold-400/95 text-cream-50 rounded px-1 text-[8px] uppercase">palette</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Step 3: Copy ── */}
      {step === 2 && (
        <div className="space-y-3">
          <button onClick={draftCopy} disabled={busy !== null}
            className="inline-flex items-center gap-1.5 bg-bark-700 text-cream-50 hover:bg-bark-600 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl">
            {busy === 'copy' ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />} Draft all copy with AI
          </button>
          <div className="bg-white rounded-2xl border border-cream-300 p-4 space-y-3">
            <label className="block">
              <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Cover tagline</span>
              <input value={copy.tagline} onChange={e => setCopy(c => ({ ...c, tagline: e.target.value }))}
                className="mt-1 w-full font-sans text-sm border border-cream-300 rounded px-2 py-1.5 bg-cream-50 focus:outline-none focus:border-gold-300" />
            </label>
            <label className="block">
              <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Brand story (2 sentences)</span>
              <textarea value={copy.brand_story} rows={3} onChange={e => setCopy(c => ({ ...c, brand_story: e.target.value }))}
                className="mt-1 w-full font-sans text-sm border border-cream-300 rounded px-2 py-1.5 bg-cream-50 focus:outline-none focus:border-gold-300" />
            </label>
            {tiers.map(t => (
              <label key={t.id} className="block">
                <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">{t.name} — one line</span>
                <input value={copy.tier_descriptions[t.name] ?? ''}
                  onChange={e => setCopy(c => ({ ...c, tier_descriptions: { ...c.tier_descriptions, [t.name]: e.target.value } }))}
                  className="mt-1 w-full font-sans text-sm border border-cream-300 rounded px-2 py-1.5 bg-cream-50 focus:outline-none focus:border-gold-300" />
              </label>
            ))}
            <label className="block">
              <span className="font-sans text-[10px] uppercase tracking-wide text-bark-400">Corporate-program blurb</span>
              <textarea value={copy.corporate_blurb} rows={3} onChange={e => setCopy(c => ({ ...c, corporate_blurb: e.target.value }))}
                className="mt-1 w-full font-sans text-sm border border-cream-300 rounded px-2 py-1.5 bg-cream-50 focus:outline-none focus:border-gold-300" />
            </label>
          </div>
        </div>
      )}

      {/* ── Step 4: Preview & publish ── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={preview} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 bg-cream-200 hover:bg-cream-300 text-bark-700 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl">
              {busy === 'preview' ? <Loader size={13} className="animate-spin" /> : <Eye size={13} />} Preview PDF
            </button>
            <button onClick={publish} disabled={busy !== null}
              className="inline-flex items-center gap-1.5 bg-sage-500 hover:bg-sage-600 text-cream-50 disabled:opacity-40 font-sans text-xs px-4 py-2.5 rounded-xl">
              {busy === 'publish' ? <Loader size={13} className="animate-spin" /> : <UploadCloud size={13} />} Publish
            </button>
          </div>
          {previewUrl && (
            <iframe src={previewUrl} title="Lookbook preview" className="w-full h-[70vh] rounded-2xl border border-cream-300 bg-white" />
          )}
          <div className="bg-white rounded-2xl border border-cream-300 p-4">
            <h2 className="font-serif text-lg text-bark-700 mb-2">Versions</h2>
            {!versions.length ? (
              <p className="font-sans text-xs text-bark-400">Nothing published yet. Outreach replies get the “I'll send it this week” fallback until v1 goes live.</p>
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
          </div>
        </div>
      )}

      {/* Step nav */}
      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(x => Math.max(0, x - 1))} disabled={step === 0}
          className="inline-flex items-center gap-1 font-sans text-xs text-bark-500 disabled:opacity-30"><ChevronLeft size={13} /> Back</button>
        <button onClick={() => setStep(x => Math.min(STEPS.length - 1, x + 1))} disabled={step === STEPS.length - 1}
          className="inline-flex items-center gap-1 font-sans text-xs text-bark-500 disabled:opacity-30">Next <ChevronRight size={13} /></button>
      </div>
    </div>
  )
}
