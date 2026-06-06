'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/Badge'
import { ChevronRight, RefreshCw, ArrowRight, X } from 'lucide-react'
import type { GiftGuideAnswers, Product } from '@/types'
import { CATEGORY_LABELS } from '@/lib/products'
import { SlotBackground } from '@/components/ui/SlotBackground'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImage(p: Product): string | null {
  return p.image ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

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
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
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
    if (recommendation?.products) sessionStorage.setItem('pl_recommended', JSON.stringify(recommendation.products))
    router.push('/build')
  }

  function restart() { setStep(0); setAnswers({}); setRecommendation(null) }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-100">
        <SlotBackground slotKey="guide.header_bg" className="px-4 sm:px-6 pt-14 pb-10 text-center">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.35em] text-gold-400 mb-3">Gift Guide</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-bark-600 mb-3">Find the Perfect Box</h1>
          <p className="font-sans text-sm text-bark-500 max-w-md mx-auto leading-relaxed">Answer 4 quick questions and we&rsquo;ll curate the perfect combination just for her.</p>
        </SlotBackground>
        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
          {!isComplete && (
            <div className="flex gap-1 mb-10">
              {QUESTIONS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-gold-400' : i === step ? 'bg-gold-200' : 'bg-cream-300'}`} />)}
            </div>
          )}
          {!isComplete && (
            <div className="bg-cream-50 rounded-2xl border border-cream-200 p-8 sm:p-10">
              <div className="mb-2 text-xs font-sans text-bark-400 uppercase tracking-widest">Question {step + 1} of {QUESTIONS.length}</div>
              <h2 className="font-serif text-2xl sm:text-3xl text-bark-600 mb-8">{currentQ.question}</h2>
              <div className="grid grid-cols-1 gap-2.5">
                {currentQ.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className="group relative w-full text-left pl-6 pr-5 py-4 rounded-lg border border-cream-300 bg-white/70 text-bark-600 font-sans text-sm flex items-center justify-between transition-all duration-200 hover:border-gold-300 hover:bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-[2px] bg-gold-400 rounded-full transition-all duration-200 group-hover:h-8" aria-hidden="true" />
                    <span className="tracking-wide">{option}</span>
                    <ChevronRight size={16} className="text-bark-300 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
              {step > 0 && <button onClick={() => setStep(s => s - 1)} className="mt-4 text-xs font-sans text-bark-400 hover:text-bark-600 transition-colors">← Back</button>}
            </div>
          )}
          {isComplete && isLoading && (
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-3 text-bark-600"><RefreshCw size={20} className="animate-spin text-gold-400" /><span className="font-serif text-xl">Curating your box…</span></div>
              <p className="font-sans text-sm text-bark-400 mt-2">This takes just a moment.</p>
            </div>
          )}
          {isComplete && !isLoading && recommendation && (
            <div>
              <div className="text-center mb-8">
                <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-3">Curated For Her</p>
                <h2 className="font-serif text-3xl sm:text-4xl text-bark-600 mb-3">Your Curated Box</h2>
                <div className="w-12 h-px bg-gold-400 mx-auto mb-3" />
                <p className="font-sans text-sm text-bark-400">Based on your answers, here&rsquo;s what we suggest:</p>
              </div>
              {recommendation.products.length > 0 && (
                <div className="space-y-3 mb-6">
                  {recommendation.products.map((product) => {
                    const src = productImage(product)
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setModalProduct(product)}
                        className="group w-full text-left flex items-center gap-4 p-3 bg-cream-50 rounded-xl border border-cream-200 hover:border-bark-300 hover:shadow-sm transition-all"
                      >
                        <div className="relative w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-cream-100 border border-cream-200">
                          <span className="absolute inset-0 flex items-center justify-center text-2xl">{product.imageEmoji}</span>
                          {src && <img src={src} alt={product.name} className="relative w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-sans font-medium text-sm text-bark-600 truncate">{product.name}</p>
                            {product.tag && <Badge variant="gold">{product.tag}</Badge>}
                          </div>
                          <p className="font-sans text-xs text-bark-400">{CATEGORY_LABELS[product.category]} · ${(product.price / 100).toFixed(0)}</p>
                        </div>
                        <ChevronRight size={16} className="text-bark-300 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
              {recommendation.reasoning && (
                <div className="bg-cream-50 border border-cream-300 rounded-xl p-5 mb-6">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500 mb-2">A Note</p>
                  <p className="font-cormorant text-base text-bark-600 leading-relaxed italic">{recommendation.reasoning}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleBuildWithRecs}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-4 rounded-lg hover:bg-bark-700 transition-colors"
                >
                  Build This Box <ArrowRight size={15} />
                </button>
                <button
                  onClick={restart}
                  className="inline-flex items-center justify-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-8 py-4 rounded-lg hover:bg-bark-600 hover:text-cream-50 transition-colors"
                >
                  <RefreshCw size={14} /> Retake
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Product detail modal */}
      {modalProduct && (() => {
        const src = productImage(modalProduct)
        return (
          <div
            className="fixed inset-0 z-[60] bg-bark-800/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setModalProduct(null)}
          >
            <div
              className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setModalProduct(null)}
                className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full text-bark-400 hover:text-bark-600 shadow-sm"
                aria-label="Close"
              >
                <X size={16} />
              </button>
              <div className="relative w-full aspect-[4/3] bg-cream-100">
                <span className="absolute inset-0 flex items-center justify-center text-5xl">{modalProduct.imageEmoji}</span>
                {src && <img src={src} alt={modalProduct.name} className="relative w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-gold-400">{CATEGORY_LABELS[modalProduct.category]}</p>
                  {modalProduct.tag && <Badge variant="gold">{modalProduct.tag}</Badge>}
                </div>
                <h3 className="font-serif text-2xl text-bark-600 mb-1">{modalProduct.name}</h3>
                <p className="font-sans text-lg text-bark-500 mb-4">${(modalProduct.price / 100).toFixed(0)}</p>
                {modalProduct.description && <p className="font-sans text-sm text-bark-600 leading-relaxed mb-4">{modalProduct.description}</p>}
                {modalProduct.ingredients && (
                  <p className="font-sans text-xs text-bark-400 mb-5"><span className="font-medium">Materials:</span> {modalProduct.ingredients}</p>
                )}
                <a
                  href={`/products/${modalProduct.id}`}
                  className="inline-flex items-center gap-2 border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-6 py-3 rounded-lg hover:bg-bark-600 hover:text-cream-50 transition-colors"
                >
                  View full details <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        )
      })()}

      <Footer />
    </>
  )
}
