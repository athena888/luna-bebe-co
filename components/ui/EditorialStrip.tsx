'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

type MediaItem = { id: string; url: string; type: 'image' | 'video' }

const HEADING_WORDS = 'Every detail, intentional.'.split(' ')

export function EditorialStrip() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reveal the caption (eyebrow → words → buttons) as the strip scrolls in.
  const captionRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    fetch('/api/editorial-gallery')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setRevealed(true); return }
    const el = captionRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRevealed(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Delay (ms) after which the buttons appear — just past the last word.
  const buttonsDelay = 250 + HEADING_WORDS.length * 150 + 150

  useEffect(() => {
    if (items.length <= 1) return
    timerRef.current = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setCurrent(i => (i + 1) % items.length)
        setVisible(true)
      }, 400)
    }, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [items.length])

  const item = items[current]

  function goTo(i: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setVisible(false)
    setTimeout(() => { setCurrent(i); setVisible(true) }, 400)
  }

  return (
    <section className="relative overflow-hidden bg-cream-100">
      <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
        {item ? (
          item.type === 'video' ? (
            <video
              key={item.id}
              autoPlay muted loop playsInline
              className="w-full h-auto block"
              style={{ maxHeight: '80vh', objectFit: 'cover', width: '100%' }}
            >
              <source src={item.url} type="video/mp4" />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.id}
              src={item.url}
              alt="Petite Lavande — handcrafted with care"
              className="w-full h-auto block"
            />
          )
        ) : (
          <div className="w-full aspect-[21/9] bg-cream-100" />
        )}
      </div>

      <div className="absolute inset-0 bg-bark-800/40 flex items-center justify-center">
        <div ref={captionRef} className="text-center px-6">
          <p
            className="font-sans text-[11px] tracking-[0.5em] uppercase text-cream-200/90 mb-2.5 sm:mb-4"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)', opacity: revealed ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >Handcrafted With Love</p>
          <h2 className="font-serif text-[1.75rem] sm:text-5xl text-cream-50 leading-tight" style={{ textShadow: '0 1px 14px rgba(0,0,0,0.4)' }}>
            {HEADING_WORDS.map((word, i) => (
              <span key={i}>
                <span
                  className="inline-block"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'translateY(0)' : 'translateY(0.45em)',
                    transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                    transitionDelay: `${250 + i * 150}ms`,
                  }}
                >
                  {word}
                </span>
                {i < HEADING_WORDS.length - 1 ? ' ' : ''}
              </span>
            ))}
          </h2>
          <div
            className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center items-center mt-5 sm:mt-8"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
              transitionDelay: `${buttonsDelay}ms`,
            }}
          >
            <Link href="/build" className="w-auto bg-cream-50 text-bark-600 font-sans text-[11px] tracking-[0.2em] uppercase px-7 py-3 sm:px-8 sm:py-3.5 hover:bg-cream-100 transition-colors">Build Your Own Box</Link>
            <Link href="/boxes" className="w-auto border border-cream-50/70 text-cream-50 font-sans text-[11px] tracking-[0.2em] uppercase px-7 py-3 sm:px-8 sm:py-3.5 hover:bg-cream-50/10 transition-colors">Shop Gift Ideas</Link>
          </div>
        </div>
      </div>

      {items.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
              className={`transition-all duration-300 rounded-full ${i === current ? 'w-5 h-1.5 bg-cream-50' : 'w-1.5 h-1.5 bg-cream-50/40 hover:bg-cream-50/70'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
