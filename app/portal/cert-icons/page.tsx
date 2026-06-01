'use client'

import { useState, useEffect, useRef } from 'react'
import { CERTIFICATIONS } from '@/lib/certifications'
import { Upload, Loader, Check } from 'lucide-react'
import Image from 'next/image'

export default function CertIconsPage() {
  const [icons, setIcons] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/portal/cert-icons').then(r => r.json()).then(d => {
      setIcons(d.icons ?? {})
      setLoading(false)
    })
  }, [])

  async function handleUpload(certKey: string, file: File) {
    setUploading(certKey)
    const form = new FormData()
    form.append('file', file)
    form.append('certKey', certKey)
    const res = await fetch('/api/portal/cert-icons', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) {
      setIcons(prev => ({ ...prev, [certKey]: data.url + `?t=${Date.now()}` }))
      setSaved(certKey)
      setTimeout(() => setSaved(null), 2000)
    }
    setUploading(null)
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Certification Icons</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          Upload the logo for each certification once — it appears on every product that has it enabled. PNG, JPG, WebP, or SVG. Ideal size: 64×64px or similar square.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 font-sans text-sm text-bark-400 py-12">
          <Loader size={16} className="animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {CERTIFICATIONS.map(cert => {
            const iconUrl = icons[cert.key]
            const isUploading = uploading === cert.key
            const isSaved = saved === cert.key
            return (
              <div key={cert.key} className="bg-white border border-cream-300 rounded-xl p-5 flex items-center gap-5">
                {/* Current icon preview */}
                <div className="w-16 h-16 rounded-lg border border-cream-200 bg-cream-50 shrink-0 flex items-center justify-center overflow-hidden">
                  {iconUrl
                    ? <Image src={iconUrl} alt={cert.label} width={56} height={56} className="object-contain" unoptimized />
                    : <span className="font-sans text-[10px] text-bark-400/50 text-center leading-tight px-1">No icon</span>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-bark-600">{cert.label}</p>
                  <p className="font-sans text-[10px] text-bark-400 mt-0.5">{cert.full}</p>
                  <p className="font-sans text-[10px] text-bark-400/60 mt-1">{cert.region}</p>
                </div>

                {/* Upload button */}
                <label className={`shrink-0 flex items-center gap-2 border font-sans text-[11px] tracking-[0.15em] uppercase px-4 py-2.5 rounded cursor-pointer transition-colors ${
                  isSaved ? 'border-sage-400 text-sage-600 bg-sage-50' : 'border-bark-600 text-bark-600 hover:bg-bark-600 hover:text-white'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {isUploading
                    ? <Loader size={13} className="animate-spin" />
                    : isSaved
                      ? <Check size={13} />
                      : <Upload size={13} />}
                  {isSaved ? 'Saved!' : iconUrl ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/png,image/jpg,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    ref={el => { inputRefs.current[cert.key] = el }}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(cert.key, f)
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 bg-cream-50 border border-cream-200 rounded-xl p-5">
        <p className="font-sans text-xs text-bark-500 leading-relaxed">
          <strong className="text-bark-600">Where to get these icons:</strong> Crop them from your supplier&apos;s product photo (like the one you shared with GOTS, OEKO-TEX, CE logos visible). Save each as a clean PNG with a transparent or white background, ideally 100×100px. Upload here and they appear on every product you enable them on.
        </p>
      </div>
    </div>
  )
}
