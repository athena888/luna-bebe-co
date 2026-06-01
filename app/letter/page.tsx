'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react'

type Phase = 'form' | 'generating' | 'edit'

export default function LetterPage() {
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [letters, setLetters] = useState<string[]>([])
  const [chosenIndex, setChosenIndex] = useState(0)
  const [editedContent, setEditedContent] = useState('')

  // Auto-generate when user enters both names
  useEffect(() => {
    if (!recipientName.trim() || !senderName.trim() || phase !== 'form') return

    const timer = setTimeout(async () => {
      setPhase('generating')
      try {
        const res = await fetch('/api/ai/letter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientName, senderName }),
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

  function handleContinue() {
    sessionStorage.setItem('pl_letter', editedContent)
    sessionStorage.setItem('pl_letter_version', String((chosenIndex + 1) as 1 | 2))
    sessionStorage.setItem('pl_sender_name', senderName)
    sessionStorage.setItem('pl_recipient_name', recipientName)
    router.push('/checkout')
  }

  function skipLetter() {
    sessionStorage.setItem('pl_letter', '')
    sessionStorage.setItem('pl_sender_name', senderName)
    sessionStorage.setItem('pl_recipient_name', recipientName)
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
            <p className="font-sans text-sm text-bark-400">We'll generate two versions, you pick one and edit it however you like.</p>
          </div>

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
              <p className="font-sans text-xs text-bark-400 mt-4">We'll generate two versions automatically as you type.</p>
            </div>
          )}

          {/* Step 2 — Generating */}
          {phase === 'generating' && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-12 text-center">
              <RefreshCw size={32} className="animate-spin text-gold-400 mx-auto mb-4" />
              <p className="font-sans text-sm text-bark-600">Crafting two heartfelt versions just for you…</p>
            </div>
          )}

          {/* Step 3 — Edit with version picker */}
          {phase === 'edit' && (
            <>
              {/* Version picker */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => switchVersion(0)}
                  className={`py-3 px-4 rounded-xl border-2 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${
                    chosenIndex === 0
                      ? 'border-gold-400 bg-gold-50 text-gold-600'
                      : 'border-cream-200 bg-cream-50 text-bark-400 hover:border-cream-300'
                  }`}
                >
                  Warm & Casual
                </button>
                <button
                  onClick={() => switchVersion(1)}
                  className={`py-3 px-4 rounded-xl border-2 font-sans text-sm font-semibold uppercase tracking-wide transition-colors ${
                    chosenIndex === 1
                      ? 'border-gold-400 bg-gold-50 text-gold-600'
                      : 'border-cream-200 bg-cream-50 text-bark-400 hover:border-cream-300'
                  }`}
                >
                  Elegant & Formal
                </button>
              </div>

              {/* Edit area */}
              <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
                <h2 className="font-serif text-xl text-bark-600 mb-4">Edit Your Letter</h2>
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  rows={14}
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 focus:outline-none focus:border-gold-400 transition-colors resize-none leading-relaxed"
                />
                <p className="font-sans text-xs text-bark-400 mt-3">We&apos;ll hand-write exactly what you see here on premium linen card stock.</p>
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" size="md" onClick={() => router.back()}>← Back to Box</Button>
            {phase === 'edit' && (
              <Button variant="gold" size="lg" onClick={handleContinue} disabled={!editedContent.trim()}>
                Continue to Checkout <ArrowRight size={16} className="ml-1" />
              </Button>
            )}
          </div>

          {phase === 'edit' && (
            <div className="mt-6 text-center">
              <button onClick={skipLetter} className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2">
                Skip letter and continue to checkout
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
