'use client'

import { useState, useEffect } from 'react'

type ScrimVal = { hex: string; opacity: number }

// Module-level cache: one fetch of the public scrim map per page load, shared
// by every overlay on the page.
let cache: Promise<Record<string, ScrimVal>> | null = null
function loadScrims(): Promise<Record<string, ScrimVal>> {
  if (!cache) {
    cache = fetch('/api/site-images?scrims=1')
      .then(r => r.json())
      .then(d => (d.scrims ?? {}) as Record<string, ScrimVal>)
      .catch(() => ({}))
  }
  return cache
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

// A translucent colour overlay laid over a background image, tunable from the
// admin (Portal). Reads the saved value for `scrimKey`, falling back to the
// passed default so the page looks right before anything is saved.
//   variant="flat"        — even tint across the whole image (section backgrounds)
//   variant="gradient-top" — colour at the bottom fading up to clear (hero text)
export function ScrimOverlay({ scrimKey, defaultHex, defaultOpacity, variant = 'flat', className = '' }: {
  scrimKey: string
  defaultHex: string
  defaultOpacity: number
  variant?: 'flat' | 'gradient-top'
  className?: string
}) {
  const [scrim, setScrim] = useState<ScrimVal>({ hex: defaultHex, opacity: defaultOpacity })

  useEffect(() => {
    let alive = true
    loadScrims().then(map => {
      const v = map[scrimKey]
      if (alive && v?.hex && v?.opacity != null) setScrim(v)
    })
    return () => { alive = false }
  }, [scrimKey])

  const style: React.CSSProperties =
    variant === 'gradient-top'
      ? { backgroundImage: `linear-gradient(to top, ${hexToRgba(scrim.hex, scrim.opacity)}, transparent 60%)` }
      : { backgroundColor: hexToRgba(scrim.hex, scrim.opacity) }

  return <div className={`absolute inset-0 pointer-events-none ${className}`} style={style} aria-hidden="true" />
}
