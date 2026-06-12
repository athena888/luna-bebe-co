'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { RefreshCw, ArrowRight, Check } from 'lucide-react'
import { DEFAULT_CARD_META, type CardStyle } from '@/lib/card-styles'

type Phase = 'form' | 'generating' | 'edit'

function countWords(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0 }

export default function CardPage() {
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [letters, setLetters] = useState<string[]>([])
  const [chosenIndex, setChosenIndex] = useState(0)
  const [editedContent, setEditedContent] = useState('')

  const [styles, setStyles] = useState<CardStyle[]>([])
  const [styleId, setStyleId] = useState<string | null>(null)

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
  const wordLimit = selectedStyle?.word_limit ?? 100
  const words = countWords(editedContent)
  const overLimit = words > wordLimit

  // Auto-generate when user enters both names
  useEffect(() => {
    if (!recipientName.trim() || !senderName.trim() || phase !== 'form') return
    const timer = setTimeout(async () => {
      setPhase('generating')
      try {
        const res = await fetch('/api/ai/letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientName, senderName, cardName: selectedStyle?.name, cardTheme: selectedStyle?.meta?.theme }),
        })
        const data = await res.json()
        if (data.letters?.length === 2) {
          setLetters(data.letters)
          setChosenIndex(0)
          setEditedContent(data.letters[0])
          setPhase('edit')
        } else {
          setPhase('form')
        }
      } catch (e) {
        console.error('Generation error:', e)
        setPhase('form')
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [recipientName, senderName, phase])

  function switchVersion(index: 0 | 1) {
    setChosenIndex(index)
    setEditedContent(letters[index])
  }

  function persist(content: string) {
    sessionStorage.setItem('pl_letter', content)
    sessionStorage.setItem('pl_letter_version', String((chosenIndex + 1) as 1 | 2))
    sessionStorage.setItem('pl_sender_name', senderName)
    sessionStorage.setItem('pl_recipient_name', recipientName)
    sessionStorage.setItem('pl_card_style', selectedStyle?.name ?? '')
  }

  function handleContinue() {
    if (overLimit) return
    persist(editedContent)
    router.push('/checkout')
  }

  function skipCard() {
    persist('')
    sessionStorage.setItem('pl_letter', '')
    router.push('/checkout')
  }

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors'

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-2">Your Card</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Customize Your Card</h1>
            <p className="font-sans text-sm text-bark-400">Pick a card design and write your message — we&rsquo;ll print it and tuck it into the box.</p>
          </div>

          {/* Card style picker */}
          {styles.length > 0 && (
            <div className="mb-8">
              <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3">Choose a card design</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {styles.map(s => {
                  const active = s.id === styleId
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyleId(s.id)}
                      className={`text-left overflow-hidden border transition-all ${active ? 'border-bark-600 ring-1 ring-bark-600' : 'border-cream-300 hover:border-bark-400'}`}
                    >
                      <div className="relative aspect-[3/2] bg-cream-100">
                        <img src={s.image_url} alt={s.alt_text || s.name} className="w-full h-full object-cover" />
                        {active && <span className="absolute top-2 right-2 bg-bark-600 text-white rounded-full p-1"><Check size={11} /></span>}
                      </div>
                      <div className="p-2.5">
                        <p className="font-sans text-xs font-medium text-bark-600 truncate">{s.name}</p>
                        <p className="font-sans text-[10px] text-bark-400">{s.size_label || ''}{s.size_label ? ' · ' : ''}{s.word_limit} words max</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 1 — Names */}
          {phase === 'form' && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Recipient Name</label>
                  <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah" className={inputClass} />
                </div>
                <div>
                  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Your Name</label>
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g. Emily" className={inputClass} />
                </div>
              </div>
              <p className="font-sans text-xs text-bark-400 mt-4">We&rsquo;ll draft two versions automatically as you type — you can edit or rewrite them.</p>
            </div>
          )}

          {/* Step 2 — Generating */}
          {phase === 'generating' && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center">
              <RefreshCw size={32} className="animate-spin text-gold-400 mx-auto mb-4" />
              <p className="font-sans text-sm text-bark-600">Drafting two heartfelt versions just for you…</p>
            </div>
          )}

          {/* Step 3 — Edit with version picker */}
          {phase === 'edit' && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => switchVersion(0)} className={`py-3 px-4 rounded-xl border-2 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${chosenIndex === 0 ? 'border-gold-400 bg-gold-50 text-gold-600' : 'border-cream-200 bg-cream-50 text-bark-400 hover:border-cream-300'}`}>Warm &amp; Casual</button>
                <button onClick={() => switchVersion(1)} className={`py-3 px-4 rounded-xl border-2 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${chosenIndex === 1 ? 'border-gold-400 bg-gold-50 text-gold-600' : 'border-cream-200 bg-cream-50 text-bark-400 hover:border-cream-300'}`}>Elegant &amp; Formal</button>
              </div>

              <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-bark-600">Your Message</h2>
                  <span className={`font-sans text-xs ${overLimit ? 'text-red-500 font-semibold' : 'text-bark-400'}`}>{words} / {wordLimit} words</span>
                </div>
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  rows={12}
                  className={`w-full px-4 py-3 rounded-xl border bg-cream-100 font-sans text-sm text-bark-600 focus:outline-none transition-colors resize-none leading-relaxed ${overLimit ? 'border-red-300 focus:border-red-400' : 'border-cream-300 focus:border-gold-400'}`}
                />
                {overLimit
                  ? <p className="font-sans text-xs text-red-500 mt-3">Your message is {words - wordLimit} word{words - wordLimit === 1 ? '' : 's'} over the limit for this card. Please shorten it.</p>
                  : <p className="font-sans text-xs text-bark-400 mt-3">We&rsquo;ll print exactly what you see here{selectedStyle ? ` on the ${selectedStyle.name} card${selectedStyle.size_label ? ` (${selectedStyle.size_label})` : ''}` : ''}.</p>}
              </div>

              {/* Live preview — the message set on the chosen card, positioned
                  and styled to match it. */}
              {selectedStyle && (() => {
                const zone = selectedStyle.meta?.textZone ?? DEFAULT_CARD_META.textZone!
                const isScript = (selectedStyle.meta?.font ?? 'serif') === 'script'
                return (
                  <div className="mb-6">
                    <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-bark-400 mb-3 text-center">Preview on your card</p>
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
                        {editedContent}
                      </div>
                    </div>
                    <p className="font-sans text-[10px] text-bark-400 text-center mt-2">A close approximation of the printed card.</p>
                  </div>
                )
              })()}
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" size="md" onClick={() => router.back()}>← Back to Box</Button>
            {phase === 'edit' && (
              <Button variant="gold" size="lg" onClick={handleContinue} disabled={!editedContent.trim() || overLimit}>
                Continue to Checkout <ArrowRight size={16} className="ml-1" />
              </Button>
            )}
          </div>

          {phase === 'edit' && (
            <div className="mt-6 text-center">
              <button onClick={skipCard} className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2">
                Skip the card and continue to checkout
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
