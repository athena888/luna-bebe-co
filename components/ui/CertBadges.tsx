'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { CERT_BY_KEY, type ProductCert } from '@/lib/certifications'

export function CertBadges({ certs }: { certs: ProductCert[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const active = certs.filter(c => CERT_BY_KEY[c.key])
  if (active.length === 0) return null

  const opened = openIdx !== null ? active[openIdx] : null
  const def = opened ? CERT_BY_KEY[opened.key] : null

  function prev() { setOpenIdx(i => (i !== null ? Math.max(0, i - 1) : 0)) }
  function next() { setOpenIdx(i => (i !== null ? Math.min(active.length - 1, i + 1) : 0)) }

  return (
    <>
      {/* Badge row */}
      <div className="flex items-center gap-2 flex-wrap">
        {active.map((cert, idx) => {
          const d = CERT_BY_KEY[cert.key]
          return (
            <button
              key={cert.key}
              onClick={() => setOpenIdx(idx)}
              className="flex items-center gap-1.5 border border-cream-300 bg-cream-50 hover:border-bark-400 hover:bg-cream-100 transition-colors px-2.5 py-1.5 rounded-full group"
            >
              <ShieldCheck size={11} className="text-gold-400 shrink-0" />
              <span className="font-sans text-[10px] tracking-[0.1em] uppercase text-bark-500 group-hover:text-bark-700 transition-colors">{d.label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setOpenIdx(0)}
          className="font-sans text-[10px] text-bark-400/70 hover:text-bark-500 transition-colors underline underline-offset-2"
        >
          What are these?
        </button>
      </div>

      {/* Modal */}
      {opened && def && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-bark-900/50 backdrop-blur-sm p-4"
          onClick={() => setOpenIdx(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
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
              <div className="flex gap-2 px-5 pt-4 overflow-x-auto scrollbar-hide">
                {active.map((c, idx) => {
                  const d = CERT_BY_KEY[c.key]
                  return (
                    <button
                      key={c.key}
                      onClick={() => setOpenIdx(idx)}
                      className={`shrink-0 font-sans text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        openIdx === idx
                          ? 'border-bark-600 bg-bark-600 text-white'
                          : 'border-cream-300 text-bark-500 hover:border-bark-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Content */}
            <div className="px-5 py-5">
              {/* Certificate image if uploaded */}
              {opened.certificateUrl && (
                <div className="mb-4 border border-cream-200 rounded-xl overflow-hidden bg-cream-50">
                  {opened.certificateUrl.endsWith('.pdf') ? (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 p-4 font-sans text-sm text-gold-500 hover:text-gold-600 transition-colors">
                      <ShieldCheck size={16} />
                      View certificate PDF →
                    </a>
                  ) : (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={opened.certificateUrl}
                        alt={`${def.label} certificate`}
                        className="w-full max-h-48 object-contain p-2"
                      />
                    </a>
                  )}
                </div>
              )}

              <h3 className="font-serif text-lg text-bark-600 mb-1">{def.full}</h3>
              <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-3">{def.region}</p>
              <p className="font-sans text-sm text-bark-600 leading-relaxed">{def.blurb}</p>

              {!opened.certificateUrl && (
                <p className="font-sans text-[10px] text-bark-400/60 mt-4">Certificate documentation available on request.</p>
              )}
            </div>

            {/* Prev / Next nav */}
            {active.length > 1 && (
              <div className="flex items-center justify-between px-5 pb-5">
                <button
                  onClick={prev}
                  disabled={openIdx === 0}
                  className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="font-sans text-[10px] text-bark-400">{(openIdx ?? 0) + 1} of {active.length}</span>
                <button
                  onClick={next}
                  disabled={openIdx === active.length - 1}
                  className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30"
                >
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
