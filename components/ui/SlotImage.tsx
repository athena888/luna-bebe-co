'use client'

import { useState, useEffect } from 'react'

type Img = { public_url: string; alt_text: string }

// Renders an owner-managed image slot client-side (Build, Guide, Story…).
// Renders nothing until/unless set, so the default layout is unchanged when no
// image is uploaded. If a `${slotKey}.mobile` crop exists it shows on phones
// (< sm) while the main image shows on larger screens.
export function SlotImage({ slotKey, className = '', imgClassName = 'w-full h-full object-cover' }: {
  slotKey: string
  className?: string
  imgClassName?: string
}) {
  const [web, setWeb] = useState<Img | null>(null)
  const [mobile, setMobile] = useState<Img | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/api/site-images?keys=${encodeURIComponent(slotKey)},${encodeURIComponent(slotKey + '.mobile')}`)
      .then(r => r.json())
      .then(d => { if (alive) { setWeb(d.images?.[slotKey] ?? null); setMobile(d.images?.[`${slotKey}.mobile`] ?? null) } })
      .catch(() => {})
    return () => { alive = false }
  }, [slotKey])

  if (!web && !mobile) return null

  return (
    <div className={className}>
      {web && mobile ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mobile.public_url} alt={mobile.alt_text} className={`${imgClassName} sm:hidden`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={web.public_url} alt={web.alt_text} className={`${imgClassName} hidden sm:block`} />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={(web ?? mobile)!.public_url} alt={(web ?? mobile)!.alt_text} className={imgClassName} />
      )}
    </div>
  )
}
