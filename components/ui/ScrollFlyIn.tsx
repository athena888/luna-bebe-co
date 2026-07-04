'use client'

import { useEffect, useRef, useState } from 'react'

// Wraps content so it flies in when it scrolls into view and flies back out
// when it leaves — mirrors the homepage EditorialFeature behaviour. Pass the
// panel's own classes via `className`; this element IS the panel.
export function ScrollFlyIn({ children, from = 'left', className = '', delay = 0 }: {
  children: React.ReactNode
  from?: 'left' | 'right' | 'up' | 'down'
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setShown(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const hidden =
    from === 'left' ? '-translate-x-16 opacity-0'
    : from === 'right' ? 'translate-x-16 opacity-0'
    : from === 'down' ? '-translate-y-12 opacity-0'
    : 'translate-y-12 opacity-0'

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={`transition-all duration-[800ms] ease-out ${shown ? 'translate-x-0 translate-y-0 opacity-100' : hidden} ${className}`}
    >
      {children}
    </div>
  )
}
