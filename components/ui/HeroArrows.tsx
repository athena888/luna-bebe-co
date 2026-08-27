'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Round prev/next buttons pinned to the hero's edges at 50% height. They
// dispatch a CustomEvent consumed by RotatingImage (`navEvent`) — the image
// layer sits under the scrim/content stack, so buttons inside it couldn't
// take clicks. Visibility mirrors RotatingImage's breakpoint rule: phones
// count the mobile list (when present), desktop the web list — so the arrows
// only appear when THIS viewport actually has a second photo to swap to.
const MOBILE_MEDIA = '(max-width: 639px)'

export function HeroArrows({ webCount, mobileCount, event = 'pl:hero-nav' }: {
  webCount: number
  mobileCount: number
  event?: string
}) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA)
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const count = isMobile && mobileCount > 0 ? mobileCount : webCount > 0 ? webCount : mobileCount
  if (count <= 1) return null

  const fire = (dir: -1 | 1) => window.dispatchEvent(new CustomEvent(event, { detail: dir }))
  const cls = 'absolute top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-cream-50/90 text-espresso flex items-center justify-center shadow-sm hover:bg-cream-50 transition-colors'
  return (
    <>
      <button type="button" aria-label="Previous photo" onClick={() => fire(-1)} className={`${cls} left-3`}><ChevronLeft size={18} /></button>
      <button type="button" aria-label="Next photo" onClick={() => fire(1)} className={`${cls} right-3`}><ChevronRight size={18} /></button>
    </>
  )
}
