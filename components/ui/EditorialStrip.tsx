'use client'

import { useState, useEffect, useRef } from 'react'

type MediaItem = { id: string; url: string; type: 'image' | 'video' }

export function EditorialStrip() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [current, setCurrent] = useState(0)
  const [visible, setVisible] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/editorial-gallery')
      .then(r => r.json())
      .then(d => setItems(d.items ?? []))
      .catch(() => {})
  }, [])

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
        <div className="text-center px-6">
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-cream-200/90 mb-4" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>Handcrafted With Love</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-cream-50 leading-tight" style={{ textShadow: '0 1px 14px rgba(0,0,0,0.4)' }}>Every detail, intentional.</h2>
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
