'use client'

import { useEffect, useState } from 'react'
import { useIsEs } from '@/lib/use-is-es'
import {
  estimateDelivery, estimateWithTransit, formatDeliveryWindow, formatDeliveryDate,
  isValidZip, type DeliveryEstimate as Estimate,
} from '@/lib/delivery'

// Quiet delivery-date line for product pages, the bag drawer and checkout.
// The ZIP the shopper types is kept in localStorage under `pl:zip` and
// broadcast on `pl:zip`, so entering it once on a product page refines the
// estimate in the drawer and at checkout too.
// Everything renders client-side after mount: the estimate depends on "now" in
// Pacific time, and server-rendering it would bake a stale date into the HTML
// cache and trip hydration.

const ZIP_KEY = 'pl:zip'
const ZIP_EVENT = 'pl:zip'

export function readStoredZip(): string {
  if (typeof window === 'undefined') return ''
  try { return window.localStorage.getItem(ZIP_KEY) ?? '' } catch { return '' }
}

export function storeZip(zip: string) {
  try { window.localStorage.setItem(ZIP_KEY, zip) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(ZIP_EVENT, { detail: zip }))
}

export function DeliveryEstimate({
  variant = 'full',
  zip: zipOverride,
  transit,
  className = '',
}: {
  /** 'full' — product pages: window + ZIP control. 'compact' — one quiet line.
   *  'arrives-by' — the pessimistic single date, for checkout. */
  variant?: 'full' | 'compact' | 'arrives-by'
  /** Use this ZIP instead of the stored one (checkout passes the typed one). */
  zip?: string | null
  /** Fixed transit band, e.g. the paid rush option's 1–2 business days. */
  transit?: [number, number]
  className?: string
}) {
  const isEs = useIsEs()
  const locale = isEs ? 'es' : 'en'
  const [zip, setZip] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [est, setEst] = useState<Estimate | null>(null)

  // Stored ZIP + cross-component sync (only when the caller isn't supplying one).
  useEffect(() => {
    if (zipOverride !== undefined) return
    setZip(readStoredZip())
    const onZip = (e: Event) => setZip((e as CustomEvent<string>).detail ?? '')
    const onStorage = (e: StorageEvent) => { if (e.key === ZIP_KEY) setZip(e.newValue ?? '') }
    window.addEventListener(ZIP_EVENT, onZip)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ZIP_EVENT, onZip)
      window.removeEventListener('storage', onStorage)
    }
  }, [zipOverride])

  const activeZip = zipOverride !== undefined ? (zipOverride ?? '') : zip

  // Recompute on mount and whenever the ZIP changes. Also refresh hourly so a
  // long-open tab can't sit on a stale date across the 1 PM cutoff.
  useEffect(() => {
    const compute = () => setEst(transit ? estimateWithTransit(transit) : estimateDelivery(activeZip || null))
    compute()
    const t = setInterval(compute, 60 * 60 * 1000)
    return () => clearInterval(t)
  }, [activeZip, transit])

  function save(value: string) {
    const clean = value.trim()
    if (!isValidZip(clean)) return
    const five = clean.slice(0, 5)
    storeZip(five)
    setZip(five)
    setEditing(false)
  }

  // Reserve the line's height before the estimate lands so nothing jumps.
  if (!est) return <p className={`font-sans text-[12px] text-bark-400 h-4 ${className}`} aria-hidden="true" />

  const window_ = formatDeliveryWindow(est, locale)
  const known = isValidZip(activeZip)

  // NO arrival date without a destination (Emily 2026-08-17). Previously an
  // unknown ZIP still printed a "national estimate", which promised a date we
  // had no basis for. Quiet variants render nothing; the product-page variant
  // keeps only its ZIP prompt, so the shopper can still ask for a date.
  if (!known) {
    if (variant !== 'full') return null
    return (
      <div className={`font-sans text-[12px] text-bark-500 ${className}`}>
        {editing ? null : (
          <button
            type="button"
            onClick={() => { setDraft(''); setEditing(true) }}
            className="underline underline-offset-2 decoration-dotted text-bark-400 hover:text-bark-600 transition-colors"
          >
            {isEs ? 'Ingresa tu código postal para la fecha de entrega' : 'Enter ZIP for delivery date'}
          </button>
        )}
        {editing && (
          <form onSubmit={e => { e.preventDefault(); save(draft) }} className="flex items-center gap-2 mt-1.5">
            <input
              autoFocus
              inputMode="numeric"
              maxLength={5}
              value={draft}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 5)
                setDraft(v)
                if (v.length === 5) save(v)
              }}
              placeholder={isEs ? 'Código postal' : 'ZIP code'}
              aria-label={isEs ? 'Código postal de entrega' : 'Delivery ZIP code'}
              className="w-24 px-2 py-1 border border-cream-300 bg-white font-sans text-[12px] text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-bark-400"
            />
            <button type="button" onClick={() => setEditing(false)}
              className="font-sans text-[11px] text-bark-400 hover:text-bark-600 transition-colors">
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
          </form>
        )}
      </div>
    )
  }

  if (variant === 'arrives-by') {
    return (
      <p className={`font-sans text-[12px] text-bark-500 ${className}`}>
        {isEs ? 'Llega antes del ' : 'Arrives by '}
        <span className="text-bark-600">{formatDeliveryDate(est.latest, locale)}</span>
      </p>
    )
  }

  const line = isEs
    ? `Llega ${window_} al ${activeZip.slice(0, 5)}`
    : `Arrives ${window_} to ${activeZip.slice(0, 5)}`

  if (variant === 'compact') {
    return <p className={`font-sans text-[12px] text-bark-500 ${className}`}>{line}</p>
  }

  return (
    <div className={`font-sans text-[12px] text-bark-500 ${className}`}>
      <p>
        {line}
        {' '}
        {editing ? null : (
          <button
            type="button"
            onClick={() => { setDraft(activeZip); setEditing(true) }}
            className="underline underline-offset-2 decoration-dotted text-bark-400 hover:text-bark-600 transition-colors"
          >
            {isEs ? 'Cambiar' : 'Change'}
          </button>
        )}
      </p>

      {editing && (
        <form
          onSubmit={e => { e.preventDefault(); save(draft) }}
          className="flex items-center gap-2 mt-1.5"
        >
          <input
            autoFocus
            inputMode="numeric"
            maxLength={5}
            value={draft}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 5)
              setDraft(v)
              if (v.length === 5) save(v)   // refines inline, no button press needed
            }}
            placeholder={isEs ? 'Código postal' : 'ZIP code'}
            aria-label={isEs ? 'Código postal de entrega' : 'Delivery ZIP code'}
            className="w-24 px-2 py-1 border border-cream-300 bg-white font-sans text-[12px] text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-bark-400"
          />
          <button type="button" onClick={() => setEditing(false)}
            className="font-sans text-[11px] text-bark-400 hover:text-bark-600 transition-colors">
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
        </form>
      )}

      <p className="text-bark-400/80 mt-0.5">
        {est.shipsToday
          ? (isEs ? 'Se envía hoy si ordenas antes de la 1 PM PT' : 'Ships today if ordered by 1 PM PT')
          : (isEs ? 'Se envía el siguiente día hábil' : 'Ships the next business day')}
      </p>
    </div>
  )
}
