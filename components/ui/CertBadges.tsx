'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, ShieldCheck, Leaf } from 'lucide-react'
import Image from 'next/image'
import type { ProductCert, CertDef } from '@/lib/certifications'

// Certs passed here are already resolved (ProductCert merged with CertDef from the API)
type ResolvedCert = ProductCert & Partial<CertDef>

// We don't display the official GOTS logo (we're not GOTS-certified ourselves).
// A GOTS cert is shown as our own "Organic" leaf badge — still clickable so the
// customer can view the manufacturer's scope certificate.
export function isGots(c: ResolvedCert): boolean {
  return /gots|global organic textile/i.test(`${c.key ?? ''} ${c.name ?? ''}`)
}
function label(c: ResolvedCert): string {
  if (isGots(c)) return 'Organic'
  return (c.name ?? c.key).replace(/\s+100\b/, '') // "OEKO-TEX 100" → "OEKO-TEX"
}

function CertIcon({ c, size }: { c: ResolvedCert; size: number }) {
  if (isGots(c)) {
    return (
      <span className="rounded-full pl-round-full bg-sage-500 flex items-center justify-center shrink-0" style={{ width: size + 8, height: size + 8 }}>
        <Leaf size={size} className="text-white" />
      </span>
    )
  }
  return c.iconUrl
    ? <Image src={c.iconUrl} alt={label(c)} width={size + 6} height={size + 6} className="object-contain shrink-0" unoptimized />
    : <ShieldCheck size={size + 2} className="text-gold-400 shrink-0" />
}

export function CertBadges({ certs, organic }: { certs: ResolvedCert[]; organic?: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [docRevealed, setDocRevealed] = useState(false)

  const active = certs.filter(c => c.name)
  // Organic flagged but no GOTS cert attached → show a plain (non-clickable) badge.
  const organicOnly = !!organic && !active.some(isGots)
  if (active.length === 0 && !organicOnly) return null

  const opened = openIdx !== null ? active[openIdx] : null
  const hasTabs = active.length > 1
  const showDoc = !hasTabs || docRevealed
  const openedGots = !!opened && isGots(opened)

  function openModal(idx: number) { setDocRevealed(false); setOpenIdx(idx) }
  function selectTab(idx: number) { setDocRevealed(true); setOpenIdx(idx) }
  function prev() { setDocRevealed(true); setOpenIdx(i => (i !== null ? Math.max(0, i - 1) : 0)) }
  function next() { setDocRevealed(true); setOpenIdx(i => (i !== null ? Math.min(active.length - 1, i + 1) : 0)) }

  return (
    <>
      {/* Badge row — plain icon + text links, no frames or backgrounds */}
      <div className="flex items-center gap-4 flex-nowrap overflow-x-auto scrollbar-hide">
        {organicOnly && (
          <span className="shrink-0 flex items-center gap-1.5" title="Made with organic cotton">
            <span className="w-4 h-4 rounded-full pl-round-full bg-sage-500 flex items-center justify-center shrink-0"><Leaf size={10} className="text-white" /></span>
            <span className="font-sans text-[9px] tracking-[0.06em] uppercase text-sage-700 whitespace-nowrap">Organic</span>
          </span>
        )}
        {active.map((cert, idx) => (
          <button
            key={cert.key}
            onClick={() => openModal(idx)}
            className="shrink-0 flex items-center gap-1.5 group"
          >
            <CertIcon c={cert} size={10} />
            <span className="font-sans text-[9px] tracking-[0.06em] uppercase whitespace-nowrap text-bark-600 group-hover:text-gold-500 underline-offset-2 group-hover:underline transition-colors">{label(cert)}</span>
          </button>
        ))}
      </div>
      {active.length > 0 && (
        <button
          onClick={() => openModal(0)}
          className="font-sans text-[9px] text-bark-400/70 hover:text-bark-500 transition-colors underline underline-offset-2 mt-1.5"
        >
          What do these mean?
        </button>
      )}

      {/* Modal */}
      {opened && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-bark-900/50 backdrop-blur-sm p-4"
          onClick={() => setOpenIdx(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                {openedGots ? <Leaf size={16} className="text-sage-500" /> : <ShieldCheck size={16} className="text-gold-400" />}
                <span className="font-sans text-sm font-medium text-bark-600">{openedGots ? 'Organic Cotton' : 'Verified Certifications'}</span>
              </div>
              <button onClick={() => setOpenIdx(null)} className="text-bark-400 hover:text-bark-600 transition-colors"><X size={18} /></button>
            </div>

            {hasTabs && (
              <div className="flex gap-1.5 px-4 pt-2.5 pb-1.5 overflow-x-auto scrollbar-hide">
                {active.map((c, idx) => (
                  <button
                    key={c.key}
                    onClick={() => selectTab(idx)}
                    title={label(c)}
                    className={`shrink-0 flex items-center gap-1 font-sans text-xs px-2 py-1 rounded-full border transition-colors ${openIdx === idx ? 'border-bark-600 bg-bark-600 text-white' : 'border-cream-300 text-bark-500 hover:border-bark-400'}`}
                  >
                    <CertIcon c={c} size={12} />
                    <span className="truncate max-w-24">{label(c)}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="px-5 py-4">
              {showDoc && opened.certificateUrl && (
                <div className="mb-3 border border-cream-200 overflow-hidden bg-cream-50">
                  {opened.certificateUrl.endsWith('.pdf') ? (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-4 font-sans text-sm text-gold-500 hover:text-gold-600 transition-colors">
                      <ShieldCheck size={16} /> View {openedGots ? 'scope certificate' : 'certificate'} PDF →
                    </a>
                  ) : (
                    <a href={opened.certificateUrl} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={opened.certificateUrl} alt="certificate" className="w-full max-h-48 object-contain p-2" />
                    </a>
                  )}
                </div>
              )}

              {hasTabs && !docRevealed && opened.certificateUrl && (
                <p className="mb-3 font-sans text-[10px] text-gold-500/80">Tap a tab above to view its paperwork.</p>
              )}

              <div className="flex items-center gap-3 mb-2">
                <CertIcon c={opened} size={22} />
                <h3 className="font-serif text-lg text-bark-600">{openedGots ? 'Made with GOTS-certified organic cotton' : (opened.full_name || opened.name)}</h3>
              </div>
              {openedGots && <p className="font-sans text-xs text-bark-500 mb-2">From a GOTS-certified manufacturer. Their scope certificate is shown above.</p>}
              {opened.region && <p className="font-sans text-[10px] tracking-[0.15em] uppercase text-bark-400 mb-3">{opened.region}</p>}
              {opened.blurb && <p className="font-sans text-sm text-bark-600 leading-relaxed">{opened.blurb}</p>}
              {opened.valid_until && <p className="font-sans text-[10px] text-bark-400/70 mt-3">Valid until {opened.valid_until}</p>}
              {!opened.certificateUrl && <p className="font-sans text-[10px] text-bark-400/60 mt-4">Certificate available on request.</p>}
            </div>

            {active.length > 1 && (
              <div className="flex items-center justify-between px-5 py-3">
                <button onClick={prev} disabled={openIdx === 0} className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>
                <span className="font-sans text-[10px] text-bark-400">{(openIdx ?? 0) + 1} of {active.length}</span>
                <button onClick={next} disabled={openIdx === active.length - 1} className="flex items-center gap-1 font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors disabled:opacity-30">Next <ChevronRight size={14} /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
