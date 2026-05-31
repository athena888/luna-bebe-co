'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Sparkles, RefreshCw, ArrowRight, Check } from 'lucide-react'
import type { BoxSelection } from '@/types'

type Phase = 'form' | 'generating' | 'pick' | 'edit'

export default function LetterPage() {
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [letters, setLetters] = useState<string[]>([])
  const [chosen, setChosen] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('pl_box_selection')
    if (stored) {
      try { setBoxSelection(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  async function generate() {
    if (!recipientName.trim() || !senderName.trim()) return
    setPhase('generating')
    try {
      const res = await fetch('/api/ai/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, senderName, boxSelection }),
      })
      const data = await res.json()
      if (data.letters?.length) {
        setLetters(data.letters)
        setPhase('pick')
      } else {
        setPhase('form')
      }
    } catch {
      setPhase('form')
    }
  }

  function pick(letter: string) {
    setChosen(letter)
    setPhase('edit')
  }

  function handleContinue() {
    sessionStorage.setItem('pl_letter', chosen)
    router.push('/checkout')
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors"

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-2">Letter Studio</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Your Handwritten Letter</h1>
            <p className="font-sans text-sm text-bark-400">Our AI writes two versions — pick the one that feels right, then edit freely.</p>
          </div>

          {/* Step 1 — Names */}
          {(phase === 'form' || phase === 'generating') && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Recipient Name</label>
                  <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Sarah" className={inputClass} />
                </div>
                <div>
                  <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Your Name</label>
                  <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g. Emily" className={inputClass} />
                </div>
              </div>
              <Button variant="gold" size="md" onClick={generate} disabled={phase === 'generating' || !recipientName.trim() || !senderName.trim()} className="w-full sm:w-auto">
                {phase === 'generating'
                  ? <><RefreshCw size={16} className="animate-spin mr-2" />Writing two letters…</>
                  : <><Sparkles size={16} className="mr-2" />Generate 2 Versions</>}
              </Button>
            </div>
          )}

          {/* Step 2 — Pick */}
          {phase === 'pick' && (
            <div className="space-y-4 mb-6">
              <p className="font-sans text-sm text-bark-500 text-center mb-6">Choose the version that feels right for your gift:</p>
              {letters.map((letter, i) => (
                <div key={i} className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-sans text-xs font-semibold uppercase tracking-widest text-gold-400">Version {i + 1}</span>
                    <Button variant="gold" size="sm" onClick={() => pick(letter)}>
                      <Check size={14} className="mr-1.5" /> Use this one
                    </Button>
                  </div>
                  <p className="font-sans text-sm text-bark-600 leading-relaxed whitespace-pre-wrap" style={{ fontStyle: 'italic' }}>{letter}</p>
                </div>
              ))}
              <div className="text-center mt-2">
                <button onClick={() => setPhase('form')} className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2">
                  Try again with different names
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Edit */}
          {phase === 'edit' && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-bark-600">Edit Your Letter</h2>
                <button onClick={() => setPhase('pick')} className="font-sans text-xs text-gold-500 hover:text-gold-600 transition-colors underline underline-offset-2">
                  ← Choose different version
                </button>
              </div>
              <textarea
                value={chosen}
                onChange={e => setChosen(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 focus:outline-none focus:border-gold-400 transition-colors resize-none leading-relaxed"
              />
              <p className="font-sans text-xs text-bark-400 mt-3">We&apos;ll hand-write exactly what you see here on premium linen card stock.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" size="md" onClick={() => router.back()}>← Back to Box</Button>
            {phase === 'edit' && (
              <Button variant="gold" size="lg" onClick={handleContinue} disabled={!chosen.trim()}>
                Continue to Checkout <ArrowRight size={16} className="ml-1" />
              </Button>
            )}
          </div>

          <div className="mt-6 text-center">
            <button onClick={() => { sessionStorage.setItem('pl_letter', ''); router.push('/checkout') }} className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2">
              Skip letter and continue to checkout
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
