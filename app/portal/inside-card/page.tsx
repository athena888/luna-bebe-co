'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Printer, Sparkles, Edit2, Check, X, Loader, Plus, Trash2 } from 'lucide-react'
import type { CardLine, CardItemContent, CardItemMap } from '@/lib/card-content'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
function productImg(p: { id: string; image?: string | null }): string | null {
  return p.image || (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/product-images/${p.id}.jpg` : null)
}

interface CardStyleData { id: string; name: string; image_url: string; size_label: string }
interface ProductBasic { id: string; name: string; description: string; ingredients?: string; category: string; image?: string | null }
interface OrderData {
  id: string
  customer_name: string
  recipient_name?: string
  letter_content?: string
  letter_zone?: { x: number; y: number; w: number; align: 'left' | 'center' | 'right' } | null
  selected_items: ProductBasic[]
  card_style?: string | null
  card_style_data?: CardStyleData | null
}

// ── Item editor (inline, on the card back) ───────────────────────────────────
function ItemEditor({
  content, onChange, onSave, onCancel,
}: {
  content: CardItemContent
  onChange: (c: CardItemContent) => void
  onSave: () => void
  onCancel: () => void
}) {
  const set = (patch: Partial<CardItemContent>) => onChange({ ...content, ...patch })
  const setLine = (i: number, patch: Partial<CardLine>) =>
    set({ lines: content.lines.map((l, j) => j === i ? { ...l, ...patch } : l) })

  return (
    <div className="bg-white/90 border border-cream-300 rounded-lg p-3 space-y-2 text-[12px]">
      <input
        value={content.title}
        onChange={e => set({ title: e.target.value })}
        placeholder="Item title"
        className="w-full px-2 py-1 border border-cream-300 rounded font-serif text-sm text-bark-600 focus:outline-none focus:border-bark-400"
      />
      <div className="space-y-1.5">
        {content.lines.map((l, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <input
              value={l.k}
              onChange={e => setLine(i, { k: e.target.value })}
              placeholder="Label:"
              className="w-24 shrink-0 px-2 py-1 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400"
            />
            <input
              value={l.v}
              onChange={e => setLine(i, { v: e.target.value })}
              placeholder="Value"
              className="flex-1 min-w-0 px-2 py-1 border border-cream-300 rounded text-xs text-bark-600 focus:outline-none focus:border-bark-400"
            />
            <button type="button" onClick={() => set({ lines: content.lines.filter((_, j) => j !== i) })} className="text-bark-300 hover:text-red-400 shrink-0">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => set({ lines: [...content.lines, { k: '', v: '' }] })}
        className="inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600"
      >
        <Plus size={11} /> Add line
      </button>
      <input
        value={content.note ?? ''}
        onChange={e => set({ note: e.target.value || undefined })}
        placeholder="Short note (optional)"
        className="w-full px-2 py-1 border border-cream-300 rounded text-xs text-bark-500 italic focus:outline-none focus:border-bark-400"
      />
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1 px-3 py-1 bg-bark-600 text-white text-[10px] tracking-[0.15em] uppercase rounded hover:bg-bark-700">
          <Check size={11} /> Save
        </button>
        <button onClick={onCancel} className="px-3 py-1 border border-cream-300 text-bark-500 text-[10px] tracking-[0.15em] uppercase rounded hover:bg-cream-50">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Card item display (back of card) — words only, on-theme typography ────────
function CardItem({
  content, onEdit, onGenerate, generating,
}: {
  content: CardItemContent
  onEdit: () => void
  onGenerate: () => void
  generating: boolean
}) {
  return (
    <div>
      <h3 className="font-serif text-[1.05rem] text-espresso mb-1 leading-snug">{content.title}</h3>
      {content.lines.map((l, i) => (
        <p key={i} className="text-bark-700 leading-snug"><span className="font-semibold text-espresso">{l.k}</span> {l.v}</p>
      ))}
      {content.note && <p className="font-serif italic text-bark-500 mt-1">{content.note}</p>}
      <div className="print:hidden flex gap-1 mt-1.5">
        <button onClick={onEdit} className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600 border border-cream-300 hover:border-bark-400 rounded px-2 py-0.5 transition-colors">
          <Edit2 size={9} /> Edit
        </button>
        <button onClick={onGenerate} disabled={generating} title="Refine the existing wording (doesn't start from scratch)" className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-gold-500 hover:text-gold-600 border border-gold-200 hover:border-gold-400 rounded px-2 py-0.5 transition-colors disabled:opacity-40">
          {generating ? <Loader size={9} className="animate-spin" /> : <Sparkles size={9} />} Refine
        </button>
      </div>
    </div>
  )
}

// ── Default front-of-card letter ─────────────────────────────────────────────
function DefaultLetter() {
  return (
    <>
      <p className="font-serif italic text-3xl text-bark-600 text-center mb-8">We see you.</p>
      <div className="space-y-4 font-sans text-[15px] text-bark-700 leading-relaxed max-w-xl mx-auto">
        <p>You are doing one of the hardest, most loving things a person can do. You are running on broken sleep and feeding schedules and a love so big it doesn&rsquo;t fit in your chest.</p>
        <p>You deserve warm tea. You deserve ten minutes in a bath. You deserve a few hours of dark, quiet sleep with silk against your eyes. You deserve scent and softness and the small luxury of being thought of.</p>
        <p>This box is here to remind you: <span className="font-semibold">you are not invisible in your own story.</span></p>
        <p>Welcome to this new chapter. We hope it starts well.</p>
      </div>
      <p className="font-serif italic text-bark-500 text-center mt-8">— Petite Lavande</p>
      <p className="font-serif italic text-gold-500 text-center mt-2 text-sm">Fait avec amour, pour vous.</p>
    </>
  )
}

// ── Main component (needs Suspense for useSearchParams) ───────────────────────
function InsideCardContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')

  const [items, setItems] = useState<CardItemMap>({})
  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<CardItemContent | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  // Library view uses the LIVE, currently-listed products (same source as
  // /build) — not the static catalog — so obsolete items don't appear and the
  // description/ingredients passed to AI are the real, current product details.
  const [allProducts, setAllProducts] = useState<ProductBasic[]>([])

  useEffect(() => {
    const url = orderId
      ? `/api/portal/card-content?orderId=${encodeURIComponent(orderId)}`
      : '/api/portal/card-content'
    fetch(url)
      .then(r => r.json())
      .then(d => { setItems(d.items ?? {}); setOrder(d.order ?? null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  // Live product catalog for the library (active products only).
  useEffect(() => {
    if (orderId) return
    fetch('/api/products/all')
      .then(r => r.json())
      .then(d => {
        const byCat = (d.byCategory ?? {}) as Record<string, ProductBasic[]>
        setAllProducts(Object.values(byCat).flat())
      })
      .catch(() => {})
  }, [orderId])

  const cardStyle = order?.card_style_data
  const sizeLabel = cardStyle?.size_label || '5 × 7 in (folded)'

  // Parse the physical card dimensions so the template + print page match it.
  const sizeMatch = sizeLabel.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*in/i)
  const cardW = sizeMatch ? parseFloat(sizeMatch[1]) : 5
  const cardH = sizeMatch ? parseFloat(sizeMatch[2]) : 7
  const folded = /folded/i.test(sizeLabel)

  // Card face background — when a style is chosen, the actual card design IS the
  // background (no kraft wash), so the print combines artwork + words.
  const faceClass = cardStyle ? 'bg-cover bg-center' : ''
  const faceStyle = cardStyle
    ? { backgroundImage: `url(${cardStyle.image_url})`, aspectRatio: `${cardW} / ${cardH}` }
    : { backgroundColor: '#f3ecdc', aspectRatio: `${cardW} / ${cardH}` }

  // Products to display on back of card
  const displayProducts: ProductBasic[] = order?.selected_items?.length
    ? (order.selected_items as ProductBasic[])
    : []

  function getContent(product: ProductBasic): CardItemContent {
    return items[product.id] ?? items[product.name] ?? { title: product.name, lines: [] }
  }

  async function saveEdit(productId: string) {
    if (!editDraft) return
    await fetch('/api/portal/card-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, content: editDraft }),
    })
    setItems(prev => ({ ...prev, [productId]: editDraft }))
    setEditingId(null)
    setEditDraft(null)
  }

  // From an order, "Refine" passes the EXISTING content so the AI improves what's
  // there rather than regenerating from scratch. In the library (no order, no
  // existing) it generates fresh.
  async function generateContent(product: ProductBasic, existing?: CardItemContent) {
    setGenerating(product.id)
    try {
      const res = await fetch('/api/portal/card-content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          description: product.description,
          ingredients: product.ingredients,
          category: product.category,
          existing: existing && existing.lines.length ? existing : undefined,
        }),
      })
      const data = await res.json()
      if (data.content) setItems(prev => ({ ...prev, [product.id]: data.content }))
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-bark-400 text-sm">
      <Loader size={14} className="animate-spin" /> Loading…
    </div>
  )

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Screen-only header */}
      <div className="print:hidden mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-bark-600">Inside-Box Card</h1>
            {order ? (
              <p className="font-sans text-sm text-bark-400 mt-0.5">
                Personalized for <strong className="text-bark-600">{order.recipient_name || order.customer_name}</strong>
                {cardStyle && <> · Card style: <span className="text-bark-600">{cardStyle.name}</span></>}
                {' '}· Size: <strong>{sizeLabel}</strong>
              </p>
            ) : (
              <p className="font-sans text-sm text-bark-400 mt-0.5">
                Default template — open from an order to generate a personalized card.
              </p>
            )}
          </div>
          <button
            onClick={() => window.print()}
            className="shrink-0 flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
        {order && (
          <p className="font-sans text-xs text-bark-400 mt-2 max-w-2xl">
            Uses the <strong>{order.letter_content ? "customer's personal letter" : "standard note"}</strong>.
            Prints one portrait card at <strong>{cardW} × {cardH} in</strong>{cardStyle ? ', with the chosen card design as the background' : ''}.
          </p>
        )}
        {!order && (
          <p className="font-sans text-xs text-bark-400 mt-2 max-w-2xl">
            Prints one portrait card — recommended <strong>{sizeLabel}</strong>.
          </p>
        )}
      </div>

      <div className="space-y-10">
        {/* ── FRONT ── */}
        <div>
          <p className="print:hidden font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-2">
            Card — {sizeLabel}
          </p>
          <article
            className={`card-face relative rounded-lg border border-[#d8c7a8] p-8 sm:p-12 overflow-hidden flex flex-col justify-center ${faceClass}`}
            style={{ backgroundColor: '#f3ecdc', ...faceStyle }}
          >
            {/* Light wash over the card artwork so the design still reads but
                the words stay legible (the print combines artwork + text). */}
            {cardStyle && (
              <div className="absolute inset-0 bg-[#f5efe1]/45 pointer-events-none" style={{ WebkitPrintColorAdjust: 'exact' } as React.CSSProperties} />
            )}
            {/* When the customer chose a placement, print the note exactly where
                they put it on the card (matches the /letter preview). Otherwise
                fall back to the centered Dear/signature layout. */}
            {order?.letter_content && order.letter_zone ? (
              <div
                className="absolute"
                style={{
                  left: `${order.letter_zone.x}%`, top: `${order.letter_zone.y}%`, width: `${order.letter_zone.w}%`,
                  textAlign: order.letter_zone.align,
                  fontFamily: 'var(--font-cormorant)',
                  color: '#5a5147',
                  lineHeight: 1.5,
                  fontSize: 'clamp(8px, 2.4vw, 14px)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                }}
              >
                {order.letter_content}
              </div>
            ) : (
              <div className="relative">
                {order?.letter_content ? (
                  /* Customer's personal letter — centered fallback (no placement) */
                  <>
                    <p className="font-serif italic text-2xl text-espresso text-center mb-8">
                      {order.recipient_name ? `Dear ${order.recipient_name},` : 'To You,'}
                    </p>
                    <div className="space-y-4 font-cormorant text-[17px] text-bark-700 leading-relaxed max-w-xl mx-auto whitespace-pre-line text-center">
                      {order.letter_content}
                    </div>
                    {order.customer_name && (
                      <p className="font-serif italic text-bark-500 text-center mt-8">— {order.customer_name}</p>
                    )}
                  </>
                ) : (
                  <DefaultLetter />
                )}
              </div>
            )}
          </article>
        </div>

      </div>

      {/* ── Item Content Library (screen only, no order needed) ── */}

      <style jsx global>{`
        @media print {
          /* Print at the actual card size so the template matches the physical card. */
          @page { size: ${cardW}in ${cardH}in; margin: 0.25in; }
          aside, header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .card-face {
            /* Fixed portrait card — exact inches on any paper size. */
            width: ${cardW - 0.5}in !important;
            height: ${cardH - 0.5}in !important;
            aspect-ratio: auto !important;
            margin: 0 auto !important;
            break-inside: avoid;
            border: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}

export default function InsideCardPage() {
  return (
    <Suspense fallback={<div className="p-8 flex items-center gap-2 text-bark-400 text-sm"><Loader size={14} className="animate-spin" /> Loading…</div>}>
      <InsideCardContent />
    </Suspense>
  )
}
