'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Loader, Check, Plus, Trash2, Sparkles, X, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import type { CertDef } from '@/lib/certifications'

const inputCls = "w-full px-3 py-2 border border-cream-300 bg-white font-sans text-sm text-bark-600 focus:outline-none focus:border-bark-400 transition-colors rounded"

function CertRow({
  cert,
  onDeleted,
  onIconUploaded,
}: {
  cert: CertDef
  onDeleted: (key: string) => void
  onIconUploaded: (key: string, url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [blurb, setBlurb] = useState(cert.blurb)
  const [saving, setSaving] = useState(false)

  async function handleIconUpload(file: File) {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/portal/cert-library/${cert.key}`, { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      onIconUploaded(cert.key, data.url)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${cert.name}" cert? This removes it from the library (existing product certs are unaffected).`)) return
    await fetch(`/api/portal/cert-library/${cert.key}`, { method: 'DELETE' })
    onDeleted(cert.key)
  }

  async function saveBlurb() {
    setSaving(true)
    await fetch(`/api/portal/cert-library/${cert.key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blurb }),
    })
    setSaving(false)
  }

  return (
    <div className="bg-white border border-cream-300 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-lg border border-cream-200 bg-cream-50 shrink-0 flex items-center justify-center overflow-hidden">
          {cert.icon_url
            ? <Image src={cert.icon_url + '?t=' + Date.now()} alt={cert.name} width={48} height={48} className="object-contain" unoptimized />
            : <span className="font-sans text-[9px] text-bark-400/50 text-center leading-tight px-1">No icon</span>}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm font-medium text-bark-600">{cert.name}</p>
          <p className="font-sans text-[10px] text-bark-400 mt-0.5">{cert.full_name}</p>
          <p className="font-sans text-[10px] text-bark-400/60">{cert.region}{cert.valid_until ? ` · expires ${cert.valid_until}` : ''}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <label className={`flex items-center gap-1.5 cursor-pointer border font-sans text-[10px] tracking-[0.1em] uppercase px-3 py-2 rounded transition-colors ${saved ? 'border-sage-400 text-sage-600' : 'border-bark-600 text-bark-600 hover:bg-bark-600 hover:text-white'}`}>
            {uploading ? <Loader size={11} className="animate-spin" /> : saved ? <Check size={11} /> : <Upload size={11} />}
            {saved ? 'Saved' : cert.icon_url ? 'Replace' : 'Icon'}
            <input type="file" accept="image/*,.svg" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = '' }} />
          </label>
          <button onClick={() => setExpanded(e => !e)} className="p-2 text-bark-400 hover:text-bark-600 transition-colors">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={handleDelete} className="p-2 text-bark-300 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-cream-200 px-4 py-4">
          <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Customer-facing description</label>
          <div className="flex gap-2">
            <input type="text" value={blurb} onChange={e => setBlurb(e.target.value)} className={inputCls} />
            <button onClick={saveBlurb} disabled={saving}
              className="flex items-center gap-1.5 border border-bark-600 text-bark-600 font-sans text-[10px] uppercase px-4 py-2 rounded hover:bg-bark-600 hover:text-white transition-colors shrink-0 disabled:opacity-40">
              {saving ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CertLibraryPage() {
  const [certs, setCerts] = useState<CertDef[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  // Add form state
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<Record<string, string> | null>(null)
  const [form, setForm] = useState({ key: '', name: '', full_name: '', blurb: '', region: '', valid_until: '' })
  const [logoHint, setLogoHint] = useState('')
  const [logoDesc, setLogoDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [parseFile, setParseFile] = useState<File | null>(null)
  const parseFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/portal/cert-library')
    const data = await res.json()
    setCerts(data.certs ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleParseFile(file: File) {
    setParseFile(file)
    setParsing(true)
    setParseResult(null)
    setLogoHint('')
    setLogoDesc('')
    const form2 = new FormData()
    form2.append('file', file)
    const res = await fetch('/api/portal/cert-library/parse', { method: 'POST', body: form2 })
    const data = await res.json()
    if (data.extracted) {
      const e = data.extracted
      setForm({ key: e.key, name: e.name, full_name: e.full_name, blurb: e.blurb, region: e.region, valid_until: e.valid_until ?? '' })
      setLogoDesc(e.logo_description)
      setLogoHint(e.logo_source_hint)
      setParseResult(e)
    }
    setParsing(false)
  }

  async function handleSaveCert() {
    if (!form.key || !form.name) return
    setSaving(true)
    const res = await fetch('/api/portal/cert-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.cert) {
      setCerts(prev => [...prev, data.cert])
      setShowAdd(false)
      setParseResult(null)
      setParseFile(null)
      setForm({ key: '', name: '', full_name: '', blurb: '', region: '', valid_until: '' })
    }
    setSaving(false)
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-bark-600">Certification Library</h1>
          <p className="font-sans text-sm text-bark-400 mt-1">
            Add any certification. Upload the paperwork — AI extracts the details for you.
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(s => !s); setParseResult(null); setParseFile(null); setForm({ key: '', name: '', full_name: '', blurb: '', region: '', valid_until: '' }) }}
          className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 rounded hover:bg-bark-700 transition-colors shrink-0"
        >
          <Plus size={13} /> Add Cert
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white border border-cream-300 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl text-bark-600">Add New Certification</h2>
            <button onClick={() => setShowAdd(false)} className="text-bark-400 hover:text-bark-600"><X size={18} /></button>
          </div>

          {/* Upload cert doc to auto-fill */}
          <div
            className="border-2 border-dashed border-cream-300 rounded-xl p-6 text-center cursor-pointer hover:border-gold-300 hover:bg-gold-50/20 transition-colors mb-5"
            onClick={() => parseFileRef.current?.click()}
          >
            <input ref={parseFileRef} type="file" accept="application/pdf,image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleParseFile(f); e.target.value = '' }} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <Sparkles size={24} className="text-gold-400 animate-spin" />
                <p className="font-sans text-sm text-bark-600">Reading your certificate…</p>
              </div>
            ) : parseFile ? (
              <div className="flex flex-col items-center gap-1">
                <Check size={20} className="text-sage-500" />
                <p className="font-sans text-sm text-bark-600 font-medium">Details extracted! Edit below if needed.</p>
                <p className="font-sans text-xs text-bark-400">{parseFile.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Sparkles size={24} className="text-gold-400/60" />
                <p className="font-sans text-sm text-bark-600 font-medium">Upload certificate PDF or image</p>
                <p className="font-sans text-xs text-bark-400">AI will read it and fill in all fields automatically</p>
              </div>
            )}
          </div>

          {/* AI logo hint */}
          {(logoDesc || logoHint) && (
            <div className="bg-gold-50/40 border border-gold-200 rounded-lg p-4 mb-5 space-y-2">
              <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold-500 font-medium flex items-center gap-1.5">
                <Sparkles size={11} /> Logo recommendation
              </p>
              {logoDesc && <p className="font-sans text-xs text-bark-600"><span className="font-medium">What it looks like:</span> {logoDesc}</p>}
              {logoHint && <p className="font-sans text-xs text-bark-500"><span className="font-medium">Where to get it:</span> {logoHint}</p>}
              <p className="font-sans text-[10px] text-bark-400/70">After saving, upload the logo via the icon button on the cert row.</p>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Badge Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0,40) }))} placeholder="GOTS" className={inputCls} />
              </div>
              <div>
                <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Region</label>
                <input type="text" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="International" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Full Name</label>
              <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Global Organic Textile Standard" className={inputCls} />
            </div>
            <div>
              <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Customer Description</label>
              <input type="text" value={form.blurb} onChange={e => setForm(f => ({ ...f, blurb: e.target.value }))} placeholder="What this means for the customer…" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Key (auto)</label>
                <input type="text" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} placeholder="gots" className={inputCls} />
              </div>
              <div>
                <label className="block font-sans text-[10px] tracking-[0.2em] uppercase text-bark-400 mb-1.5">Valid Until</label>
                <input type="text" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} placeholder="2027-01-30" className={inputCls} />
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveCert}
            disabled={saving || !form.name || !form.key}
            className="mt-5 w-full flex items-center justify-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase py-3 rounded hover:bg-bark-700 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? 'Saving…' : 'Add to Library'}
          </button>
        </div>
      )}

      {/* Library list */}
      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map(cert => (
            <CertRow
              key={cert.key}
              cert={cert}
              onDeleted={key => setCerts(prev => prev.filter(c => c.key !== key))}
              onIconUploaded={(key, url) => setCerts(prev => prev.map(c => c.key === key ? { ...c, icon_url: url } : c))}
            />
          ))}
          {certs.length === 0 && (
            <p className="font-sans text-sm text-bark-400 text-center py-12">No certifications yet. Click "Add Cert" to start.</p>
          )}
        </div>
      )}

      <div className="mt-8 bg-cream-50 border border-cream-200 rounded-xl p-5">
        <p className="font-sans text-xs text-bark-500 leading-relaxed">
          <strong className="text-bark-600">How to use:</strong> Add a cert type here (upload the PDF/image from your supplier — AI fills everything). Then go to <strong>Products → ⚙️</strong> and enable the cert on each product. Upload the actual certificate per product if you want customers to tap and view it.
        </p>
      </div>
    </div>
  )
}
