'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react'
import type { GiftGuideAnswers, Product } from '@/types'
import { CATEGORY_LABELS } from '@/lib/products'

const QUESTIONS = [
  { key: 'relationship' as keyof GiftGuideAnswers, question: "What's your relationship to the mama-to-be?", options: ['Best friend / close friend', 'Sister / family', 'Coworker / acquaintance', 'Partner / spouse'] },
  { key: 'style' as keyof GiftGuideAnswers, question: "How would you describe her style?", options: ['Boho / natural / earthy', 'Minimalist / modern / clean', 'Classic / timeless / elegant', 'Playful / colorful / fun'] },
  { key: 'budget' as keyof GiftGuideAnswers, question: "What's your budget range? (includes box & shipping)", options: ['$150–$180', '$180–$220', '$220+', 'Surprise me with the best'] },
  { key: 'priority' as keyof GiftGuideAnswers, question: "What matters most to her?", options: ['All-natural / organic ingredients', 'Heirloom quality / keepsakes', 'Practical everyday use', 'Pampering & self-care'] },
]

interface Recommendation { products: Product[]; reasoning: string }

export default function GuidePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<GiftGuideAnswers>>({})
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const currentQ = QUESTIONS[step]
  const isComplete = step >= QUESTIONS.length

  function handleAnswer(value: string) {
    const newAnswers = { ...answers, [currentQ.key]: value }
    setAnswers(newAnswers)
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1)
    } else {
      fetchRecommendation(newAnswers as GiftGuideAnswers)
      setStep(QUESTIONS.length)
    }
  }

  async function fetchRecommendation(finalAnswers: GiftGuideAnswers) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/guidance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: finalAnswers }) })
      const data = await res.json()
      setRecommendation(data)
    } catch {
      setRecommendation({ products: [], reasoning: 'We had trouble loading your recommendations. Please try building your box manually.' })
    } finally {
      setIsLoading(false)
    }
  }

  function handleBuildWithRecs() {
    if (recommendation?.products) sessionStorage.setItem('lal_recommended', JSON.stringify(recommendation.products))
    router.push('/build')
  }

  function restart() { setStep(0); setAnswers({}); setRecommendation(null) }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100 py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-sans font-semibold uppercase tracking-widest text-gold-400 mb-2">AI Gift Guide</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-2">Find the Perfect Box</h1>
            <p className="font-sans text-sm text-bark-400">Answer 4 quick questions. Luna will curate the perfect combination just for her.</p>
          </div>
          {!isComplete && (
            <div className="flex gap-1 mb-10">
              {QUESTIONS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-gold-400' : i === step ? 'bg-gold-200' : 'bg-cream-300'}`} />)}
            </div>
          )}
          {!isComplete && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8 sm:p-10">
              <div className="mb-2 text-xs font-sans text-bark-400 uppercase tracking-widest">Question {step + 1} of {QUESTIONS.length}</div>
              <h2 className="font-serif text-2xl sm:text-3xl text-bark-600 mb-8">{currentQ.question}</h2>
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options.map((option) => (
                  <button key={option} onClick={() => handleAnswer(option)} className="w-full text-left px-5 py-4 rounded-xl border-2 border-cream-300 bg-cream-100 text-bark-600 font-sans text-sm hover:border-gold-400 hover:bg-gold-100/30 transition-all group flex items-center justify-between">
                    {option}<ChevronRight size={16} className="text-bark-400/40 group-hover:text-gold-400 transition-colors" />
                  </button>
                ))}
              </div>
              {step > 0 && <button onClick={() => setStep(s => s - 1)} className="mt-4 text-xs font-sans text-bark-400 hover:text-bark-600 transition-colors">← Back</button>}
            </div>
          )}
          {isComplete && isLoading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-bark-600"><RefreshCw size={20} className="animate-spin text-gold-400" /><span className="font-serif text-xl">Luna is curating your box...</span></div>
              <p className="font-sans text-sm text-bark-400 mt-2">This takes just a moment.</p>
            </div>
          )}
          {isComplete && !isLoading && recommendation && (
            <div>
              <div className="text-center mb-8">
                <div className="text-4xl mb-4">✨</div>
                <h2 className="font-serif text-3xl text-bark-600 mb-2">Your Curated Box</h2>
                <p className="font-sans text-sm text-bark-400">Based on your answers, Luna recommends:</p>
              </div>
              {recommendation.products.length > 0 && (
                <div className="space-y-3 mb-6">
                  {recommendation.products.map((product) => (
                    <div key={product.id} className="flex items-start gap-4 p-4 bg-cream-50 rounded-xl border border-cream-200">
                      <span className="text-3xl">{product.imageEmoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-sans font-medium text-sm text-bark-600">{product.name}</p>
                          {product.tag && <Badge variant="gold">{product.tag}</Badge>}
                        </div>
                        <p className="font-sans text-xs text-bark-400">{CATEGORY_LABELS[product.category]} · ${(product.price / 100).toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {recommendation.reasoning && (
                <div className="bg-gold-100/50 border border-gold-200 rounded-xl p-5 mb-6">
                  <div className="flex items-center gap-2 mb-2"><Sparkles size={14} className="text-gold-500" /><span className="font-sans text-xs font-semibold uppercase tracking-wider text-gold-500">Luna&apos;s Note</span></div>
                  <p className="font-sans text-sm text-bark-600 leading-relaxed italic">{recommendation.reasoning}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button variant="gold" size="lg" onClick={handleBuildWithRecs} className="flex-1">Build This Box <ArrowRight size={16} /></Button>
                <Button variant="outline" size="md" onClick={restart}><RefreshCw size={14} /> Retake</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
