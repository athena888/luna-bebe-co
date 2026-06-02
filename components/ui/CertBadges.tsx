'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import type { ProductCert, CertDef } from '@/lib/certifications'

// Certs passed here are already resolved (ProductCert merged with CertDef from the API)
type ResolvedCert = ProductCert & Partial<CertDef>

export function CertBadges({ certs }: { certs: ResolvedCert[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  // When multiple cert tabs exist, the paperwork stays hidden until a tab is clicked
  const [docRevealed, setDocRevealed] = useState(false)

  const active = certs.filter(c => c.name)
  if (active.length === 0) return null

  const opened = openIdx !== null ? active[openIdx] : null
  const hasTabs = active.length > 1
  // Single cert: show paperwork as before. Multiple: only after a tab is clicked.
  const showDoc = !hasTabs || docRevealed

  function openModal(idx: number) { setDocRevealed(false); setOpenIdx(idx) }
  function selectTab(idx: number) { setDocRevealed(true); setOpenIdx(idx) }
  function prev() { setDocRevealed(true); setOpenIdx(i => (i !== null ? Math.max(0, i - 1) : 0)) }
  function next() { setDocRevealed(true); setOpenIdx(i => (i !== null ? Math.min(active.length - 1, i + 1) : 0)) }

  return (
    <>
      {/* Badge row — icon next to text */}
      <div className="flex items-center gap-2 flex-wrap">
        {active.map((cert, idx) => (
          <button
            key={cert.key}
            onClick={() => openModal(idx)}
            className="flex items-center gap-2 border border-cream-300 bg-cream-50 hover:border-bark-400 hover:bg-cream-100 transition-colors px-3 py-2 rounded-lg group"
          >
            {cert.iconUrl
              ? <Image src={cert.iconUrl} alt={cert.name ?? cert.key} width={22} height={22} className="object-contain shrink-0" unoptimized />
              : <ShieldCheck size={18} className="text-gold-400 shrink-0" />}
            <span className="font-sans text-[11px] tracking-[0.08em] uppercase text-bark-500 group-hover:text-bark-700 transition-colors whitespace-nowrap">
              {cert.name ?? cert.key}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => openModal(0)}
        className="font-sans text-[9px] text-bark-400/70 hover:text-bark-500 transition-colors underline underline-offset-2 mt-1.5"
      >
        What are these certifications?
      </button>

      {/* Modal */}
      {opened && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark-900/50 backdrop-blur-sm p-4"
          onClick={() => setOpenIdx(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-gold-400" />
                <span className="font-sans text-sm font-medium text-bark-600">Verified Certifications</span>
              </div>
              <button onClick={() => setOpenIdx(null)} className="text-bark-400 hover:text-bark-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Cert tabs — show the cert icon */}
            {hasTabs && (
              <div className="flex gap-1.5 px-4 pt-2.5 pb-1.5 overflow-x-auto scrollbar-hide">
                {active.map((c, idx) => (
                  <button
                    key={c.key}
                    onClick={() => selectTab(idx)}
                    title={c.name ?? c.key}
                    className={`shrink-0 flex items-center gap-1 font-sans text-xs px-2 py-1 rounded-full border transition-colors ${
                      openIdx === idx
                        ? 'border-bark-600 bg-bark-600 text-white'
                        : 'border-cream-300 text-bark-500 hover:border-bark-400'
                    }`}
                  >
                    {c.iconUrl
                      ? <Image src={c.iconUrl} alt={c.name ?? c.key} width={16} height={16} className="object-contain shrink-0" unoptimized />
                      : <ShieldCheck size={13} className="shrink-0" />}
                    <span className="truncate max-w-24">{c.name ?? c.key}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4">
              {/* Certificate doc — only after a tab is clicked when tabs exist */}
              {showDoc && opened.certificateUrl && (
                <div className="mb-3 border border-cream-200 rounded-xl overflow-hidden bg-cream-50">
                  {opened.certificateUrl.endsWith('.pdf') ? (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-4 font-sans text-sm text-gold-500 hover:text-gold-600 transition-colors">
                      <ShieldCheck size={16} /> View certificate PDF →
                    </a>
                  ) : (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={opened.certificateUrl} alt="certificate" className="w-full max-h-48 object-contain p-2" />
                    </a>
                  )}
                </div>
              )}

              {/* Hint to view paperwork when it exists but is hidden */}
              {hasTabs && !docRevealed && opened.certificateUrl && (
                <p className="mb-3 font-sans text-[10px] text-gold-500/80">Tap a certification tab above to view its paperwork.</p>
              )}

              <div className="flex items-center gap-3 mb-3">
                {opened.iconUrl && (
                  <Image src={opened.iconUrl} alt={opened.name ?? opened.key} width={40} height={40} className="object-contain shrink-0" unoptimized />
                )}
                <h3 className="font-serif text-lg text-bark-600">{opened.full_name || opened.name}</h3>
              </div>
              {opened.region && <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-3">{opened.region}</p>}
              {opened.blurb && <p className="font-sans text-sm text-bark-600 leading-relaxed">{opened.blurb}</p>}
              {opened.valid_until && <p className="font-sans text-[10px] text-bark-400/70 mt-3">Valid until {opened.valid_until}</p>}
              {!opened.certificateUrl && (
                <p className="font-sans text-[10px] text-bark-400/60 mt-4">Certificate documentation available on request.</p>
              )}
            </div>

            {/* Prev / Next */}
            {active.length > 1 && (
              <div className="flex items-center justify-between px-5 py-3">
                <button onClick={prev} disabled={openIdx === 0}
                  className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30">
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="font-sans text-[10px] text-bark-400">{(openIdx ?? 0) + 1} of {active.length}</span>
                <button onClick={next} disabled={openIdx === active.length - 1}
                  className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
