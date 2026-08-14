'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useIsEs } from '@/lib/use-is-es'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { ArrowRight, Check, ChevronDown, ChevronRight } from 'lucide-react'
import type { CardStyle } from '@/lib/card-styles'

type Align = 'left' | 'center' | 'right'
type Zone = { x: number; y: number; w: number; align: Align }

// Centered fallback zone, defined locally so this client page never imports the
// server-only lib/card-styles module (which pulls in the Supabase admin client).
const FALLBACK_ZONE: Zone = { x: 15, y: 42, w: 70, align: 'center' }

// Customers write their own message — no AI drafting (removed 2026-08-14, Emily:
// let people say it in their own words). Short by design: the note is written on
// the physical card, and 70 characters stays legible at pen-written size.
const CHAR_LIMIT = 70

export default function CardPage() {
  const isEs = useIsEs()
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')

  const [styles, setStyles] = useState<CardStyle[]>([])
  const [styleId, setStyleId] = useState<string | null>(null)
  // Where the printed note sits on the card. Starts from the card's default and
  // the customer can nudge it. Saved with the order so it prints where they place it.
  const [zone, setZone] = useState<Zone>(FALLBACK_ZONE)

  useEffect(() => {
    fetch('/api/card-styles')
      .then(r => r.json())
      .then(d => {
        const s: CardStyle[] = d.styles ?? []
        setStyles(s)
        if (s.length) setStyleId(s[0].id)
      })
      .catch(() => {})
  }, [])

  const selectedStyle = styles.find(s => s.id === styleId) ?? null

  // Reset placement to the chosen card's default whenever the card changes.
  useEffect(() => {
    const z = selectedStyle?.meta?.textZone
    setZone(z ? { x: z.x, y: z.y, w: z.w, align: (z.align ?? 'center') as Align } : FALLBACK_ZONE)
  }, [styleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const chars = message.length
  const overLimit = chars > CHAR_LIMIT

  function persist(content: string) {
    sessionStorage.setItem('pl_letter', content)
    sessionStorage.removeItem('pl_letter_version') // no AI versions anymore
    sessionStorage.setItem('pl_sender_name', senderName)
    sessionStorage.setItem('pl_recipient_name', recipientName)
    sessionStorage.setItem('pl_card_style', selectedStyle?.name ?? '')
    // Only store a placement when the customer used a card design.
    if (content && selectedStyle) sessionStorage.setItem('pl_letter_zone', JSON.stringify(zone))
    else sessionStorage.removeItem('pl_letter_zone')
  }

  function handleContinue() {
    if (overLimit) return
    persist(message)
    router.push(isEs ? '/es/checkout' : '/checkout')
  }

  function skipCard() {
    persist('')
    sessionStorage.setItem('pl_letter', '')
    router.push(isEs ? '/es/checkout' : '/checkout')
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors'

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-2">{isEs ? 'Tu tarjeta' : 'Your Card'}</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-espresso mb-2">{isEs ? 'Personaliza tu tarjeta' : 'Customize Your Card'}</h1>
            <p className="font-sans text-sm text-bark-400">{isEs ? 'Elige un diseño y escribe tu mensaje — lo escribimos y lo guardamos dentro de la canastilla.' : <>Pick a card design and write your message — we&rsquo;ll print it and tuck it into the box.</>}</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 md:items-start">
            {/* Left — vertical carousel of whole (portrait) cards */}
            {styles.length > 0 && (
              <div className="md:w-48 lg:w-56 shrink-0 md:sticky md:top-6">
                <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-bark-400 mb-3">{isEs ? 'Elige un diseño — desliza para verlos todos' : 'Choose a card design — scroll to see them all'}</p>
                <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:max-h-[78vh] scrollbar-hide snap-x md:snap-y snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:pr-1 pb-2 md:pb-0">
                  {styles.map(s => {
                    const active = s.id === styleId
                    return (
                      <button key={s.id} type="button" onClick={() => setStyleId(s.id)} className="snap-start shrink-0 w-32 md:w-full text-left">
                        {/* A6 portrait — whole card, no crop. Selected frame = French herbal green. */}
                        <div className={`relative bg-cream-100 border transition-all ${active ? 'border-[#7b876a] ring-2 ring-[#7b876a]' : 'border-cream-300 hover:border-bark-400'}`} style={{ aspectRatio: '41 / 58' }}>
                          <img src={s.image_url} alt={s.alt_text || s.name} className="absolute inset-0 w-full h-full object-contain" />
                          {active && <span className="absolute top-2 right-2 bg-[#7b876a] text-white rounded-full p-1 z-10"><Check size={11} /></span>}
                        </div>
                        <div className="pt-1.5">
                          <p className="font-sans text-xs font-medium text-bark-600 truncate">{s.name}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Carousel affordance — small & elegant */}
                {styles.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-bark-400/70">
                    <span className="font-sans text-[11px] tracking-[0.25em] uppercase">{styles.length} designs</span>
                    <ChevronRight size={11} className="md:hidden animate-pulse" />
                    <ChevronDown size={11} className="hidden md:block animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {/* Right — write the message */}
            <div className="flex-1 min-w-0">

          {/* Names */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">{isEs ? 'Nombre de quien lo recibe' : 'Recipient Name'}</label>
                <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder={isEs ? 'p. ej. Sarah' : 'e.g. Sarah'} className={inputClass} />
              </div>
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">{isEs ? 'Tu nombre' : 'Your Name'}</label>
                <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder={isEs ? 'p. ej. Emily' : 'e.g. Emily'} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Message — the customer's own words */}
          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-bark-600">{isEs ? 'Tu mensaje' : 'Your Message'}</h2>
              <span className={`font-sans text-xs ${overLimit ? 'text-red-500 font-semibold' : 'text-bark-400'}`}>{chars} / {CHAR_LIMIT}</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, CHAR_LIMIT))}
              maxLength={CHAR_LIMIT}
              rows={3}
              placeholder={isEs ? 'p. ej. Bienvenida al mundo, pequeña — con todo nuestro amor.' : 'e.g. Welcome to the world, little one — with all our love.'}
              className={`w-full px-4 py-3 rounded-xl border bg-cream-100 font-sans text-sm text-bark-600 focus:outline-none transition-colors resize-none leading-relaxed ${overLimit ? 'border-red-300 focus:border-red-400' : 'border-cream-300 focus:border-gold-400'}`}
            />
            <p className="font-sans text-xs text-bark-400 mt-3">{selectedStyle
              ? <>We&rsquo;ll print exactly what you see here on the {selectedStyle.name} card{selectedStyle.size_label ? ` (${selectedStyle.size_label})` : ''}.</>
              : (isEs ? <>Tus palabras se escribirán a pluma, en letra fluida, en la tarjeta dentro de la canastilla.</> : <>Your words will be written in pen, in a flowing script, on the card inside the box.</>)}</p>
          </div>

          {/* Live preview — the message set on the chosen card, positioned
              and styled to match it. The customer can nudge the placement. */}
          {selectedStyle && message.trim() && (() => {
            const isScript = (selectedStyle.meta?.font ?? 'serif') === 'script'
            const setZ = (patch: Partial<Zone>) => setZone(z => ({ ...z, ...patch }))
            return (
              <div className="mb-6">
                <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-bark-400 mb-3 text-center">{isEs ? 'Vista previa en tu tarjeta' : 'Preview on your card'}</p>
                <div className="relative mx-auto w-full max-w-sm border border-cream-300 shadow-sm bg-white overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selectedStyle.image_url} alt={selectedStyle.name} className="w-full h-auto block" />
                  <div
                    className="absolute"
                    style={{
                      left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`,
                      textAlign: zone.align,
                      fontFamily: 'var(--font-cormorant)',
                      fontStyle: isScript ? 'italic' : 'normal',
                      color: '#5a5147',
                      lineHeight: 1.45,
                      fontSize: 'clamp(7px, 2.3vw, 14px)',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {message}
                  </div>
                </div>

                {/* Placement control — move the note over the card's empty area */}
                <div className="mx-auto w-full max-w-sm mt-3 bg-cream-50 border border-cream-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-bark-400">{isEs ? 'Ubicación del mensaje' : 'Message placement'}</p>
                    <button
                      type="button"
                      onClick={() => { const z = selectedStyle.meta?.textZone; setZone(z ? { x: z.x, y: z.y, w: z.w, align: (z.align ?? 'center') as Align } : FALLBACK_ZONE) }}
                      className="font-sans text-[11px] tracking-[0.15em] uppercase text-bark-400 hover:text-bark-600 underline underline-offset-2"
                    >
                      Reset
                    </button>
                  </div>
                  {([
                    { label: 'Left', key: 'x' as const, min: 0, max: 80 },
                    { label: 'Top', key: 'y' as const, min: 0, max: 85 },
                    { label: 'Width', key: 'w' as const, min: 30, max: 95 },
                  ]).map(s => (
                    <div key={s.key} className="flex items-center gap-3 mb-2">
                      <span className="font-sans text-[11px] text-bark-500 w-12 shrink-0">{s.label}</span>
                      <input
                        type="range" min={s.min} max={s.max} value={zone[s.key]}
                        onChange={e => setZ({ [s.key]: Number(e.target.value) } as Partial<Zone>)}
                        className="flex-1 accent-[#7b876a]"
                      />
                      <span className="font-sans text-[11px] text-bark-400 w-9 text-right tabular-nums">{zone[s.key]}%</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="font-sans text-[11px] text-bark-500 w-12 shrink-0">{isEs ? 'Alinear' : 'Align'}</span>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as Align[]).map(a => (
                        <button
                          key={a} type="button" onClick={() => setZ({ align: a })}
                          className={`font-sans text-[11px] tracking-[0.1em] uppercase px-3 py-1.5 rounded border transition-colors ${zone.align === a ? 'bg-[#7b876a] text-white border-[#7b876a]' : 'bg-white text-bark-500 border-cream-300 hover:border-bark-400'}`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="font-sans text-[11px] text-bark-400 text-center mt-2">{isEs ? 'Mueve el área punteada sobre el espacio libre de la tarjeta — ahí se escribe tu nota.' : <>Move the dashed area over the card&rsquo;s empty space — that&rsquo;s where your note prints.</>}</p>
              </div>
            )
          })()}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" size="md" onClick={() => router.back()}>{isEs ? '← Volver a la canastilla' : '← Back to Box'}</Button>
            <Button variant="gold" size="lg" onClick={handleContinue} disabled={!message.trim() || overLimit}>
              {isEs ? 'Continuar al pago' : 'Continue to Checkout'} <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button onClick={skipCard} className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2">
              {isEs ? 'Omitir la tarjeta y continuar al pago' : 'Skip the card and continue to checkout'}
            </button>
          </div>
            </div>{/* right column */}
          </div>{/* two-column flex */}
        </div>
      </main>
      <Footer />
    </>
  )
}
