'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import type { ProductCert, CertDef } from '@/lib/certifications'

// Certs passed here are already resolved (ProductCert merged with CertDef from the API)
type ResolvedCert = ProductCert & Partial<CertDef>

export function CertBadges({ certs }: { certs: ResolvedCert[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const active = certs.filter(c => c.name)
  if (active.length === 0) return null

  const opened = openIdx !== null ? active[openIdx] : null

  function prev() { setOpenIdx(i => (i !== null ? Math.max(0, i - 1) : 0)) }
  function next() { setOpenIdx(i => (i !== null ? Math.min(active.length - 1, i + 1) : 0)) }

  return (
    <>
      {/* Badge row */}
      <div className="flex items-center gap-3 flex-wrap">
        {active.map((cert, idx) => (
          <button
            key={cert.key}
            onClick={() => setOpenIdx(idx)}
            className="flex flex-col items-center gap-1.5 border border-cream-300 bg-cream-50 hover:border-bark-400 hover:bg-cream-100 transition-colors px-4 py-3 rounded-lg group min-w-20"
          >
            {cert.iconUrl
              ? <Image src={cert.iconUrl} alt={cert.name ?? cert.key} width={24} height={24} className="object-contain shrink-0 mix-blend-mode-screen" style={{ mixBlendMode: 'screen' }} unoptimized />
              : <ShieldCheck size={20} className="text-gold-400 shrink-0" />}
            <span className="font-sans text-[11px] tracking-[0.08em] uppercase text-bark-500 group-hover:text-bark-700 transition-colors text-center line-clamp-2">
              {cert.name ?? cert.key}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={() => setOpenIdx(0)}
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

            {/* Cert tabs */}
            {active.length > 1 && (
              <div className="flex gap-2 px-5 pt-3 pb-2 overflow-x-auto scrollbar-hide">
                {active.map((c, idx) => (
                  <button
                    key={c.key}
                    onClick={() => setOpenIdx(idx)}
                    className={`shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      openIdx === idx
                        ? 'border-bark-600 bg-bark-600 text-white'
                        : 'border-cream-300 text-bark-500 hover:border-bark-400'
                    }`}
                  >
                    {c.name ?? c.key}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-4">
              {/* Certificate doc */}
              {opened.certificateUrl && (
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
