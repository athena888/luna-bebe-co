'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Sparkles, RefreshCw, ArrowRight, Pen } from 'lucide-react'
import type { BoxSelection } from '@/types'

const TONES = [
  { id: 'heartfelt', label: 'Heartfelt', emoji: '💜' },
  { id: 'playful', label: 'Playful', emoji: '🎉' },
  { id: 'elegant', label: 'Elegant', emoji: '✨' },
  { id: 'funny', label: 'Funny', emoji: '😄' },
  { id: 'spiritual', label: 'Spiritual', emoji: '🙏' },
]

export default function LetterPage() {
  const router = useRouter()
  const [recipientName, setRecipientName] = useState('')
  const [senderName, setSenderName] = useState('')
  const [tone, setTone] = useState('heartfelt')
  const [letterContent, setLetterContent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [boxSelection, setBoxSelection] = useState<BoxSelection | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('lal_box_selection')
    if (stored) {
      try { setBoxSelection(JSON.parse(stored)) } catch { /* ignore */ }
    }
  }, [])

  async function generateLetter() {
    if (!recipientName.trim() || !senderName.trim()) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, senderName, tone, boxSelection }),
      })
      const data = await res.json()
      setLetterContent(data.letter || '')
    } catch {
      setLetterContent('We had trouble generating your letter. Please write your own message below.')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleContinue() {
    sessionStorage.setItem('lal_letter', letterContent)
    router.push('/checkout')
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-2">Letter Studio</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Craft Your Letter</h1>
            <p className="font-sans text-sm text-bark-400">Our AI will write a heartfelt letter — then we hand-write it on premium linen card stock.</p>
          </div>

          <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
            <h2 className="font-serif text-xl text-bark-600 mb-4">About Your Gift</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>
              <div>
                <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Emily"
                  className="w-full px-4 py-2.5 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-gold-400 transition-colors"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block font-sans text-xs font-semibold uppercase tracking-wider text-bark-400 mb-2">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => setTone(id)}
                    className={`px-4 py-2 rounded-full border font-sans text-sm transition-all ${tone === id ? 'border-gold-400 bg-gold-100/60 text-gold-600 font-medium' : 'border-cream-300 bg-cream-100 text-bark-400 hover:border-gold-300'}`}
                  >
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="gold"
              size="md"
              onClick={generateLetter}
              disabled={isGenerating || !recipientName.trim() || !senderName.trim()}
              className="w-full sm:w-auto"
            >
              {isGenerating ? <><RefreshCw size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate Letter</>}
            </Button>
          </div>

          {letterContent && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-6 sm:p-8 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl text-bark-600">Your Letter</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="font-sans text-xs text-gold-500 hover:text-gold-600 transition-colors flex items-center gap-1"
                  >
                    <Pen size={12} /> {showPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
              </div>

              {showPreview ? (
                <div className="bg-cream-100 rounded-xl p-6 border border-cream-200">
                  <p className="font-script text-bark-600 text-lg leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    {letterContent}
                  </p>
                </div>
              ) : (
                <textarea
                  value={letterContent}
                  onChange={(e) => setLetterContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-100 font-sans text-sm text-bark-600 focus:outline-none focus:border-gold-400 transition-colors resize-none leading-relaxed"
                />
              )}

              <p className="font-sans text-xs text-bark-400 mt-3">Feel free to edit the letter above. We&apos;ll hand-write exactly what you see here.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button variant="outline" size="md" onClick={() => router.back()}>← Back to Box</Button>
            <Button
              variant="gold"
              size="lg"
              onClick={handleContinue}
              disabled={!letterContent.trim()}
            >
              Continue to Checkout <ArrowRight size={16} />
            </Button>
          </div>

          {!letterContent && (
            <div className="mt-6 text-center">
              <button
                onClick={handleContinue}
                className="font-sans text-xs text-bark-400 hover:text-bark-600 transition-colors underline underline-offset-2"
              >
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
