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

// ── Card item display (back of card) ─────────────────────────────────────────
function CardItem({
  product, content, onEdit, onGenerate, generating,
}: {
  product: ProductBasic
  content: CardItemContent
  onEdit: () => void
  onGenerate: () => void
  generating: boolean
}) {
  const img = productImg(product)
  return (
    <div className="flex gap-3">
      {img && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={img} alt={product.name} className="w-12 h-12 rounded object-cover border border-[#d8c7a8] shrink-0" style={{ WebkitPrintColorAdjust: 'exact' } as React.CSSProperties} onError={e => { e.currentTarget.style.display = 'none' }} />
      )}
      <div className="min-w-0 flex-1">
      <h3 className="font-serif text-base text-bark-600 mb-1">{content.title}</h3>
      {content.lines.map((l, i) => (
        <p key={i}><span className="font-semibold">{l.k}</span> {l.v}</p>
      ))}
      {content.note && <p className="text-bark-500 mt-0.5">{content.note}</p>}
      <div className="print:hidden flex gap-1 mt-1.5">
        <button onClick={onEdit} className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600 border border-cream-300 hover:border-bark-400 rounded px-2 py-0.5 transition-colors">
          <Edit2 size={9} /> Edit
        </button>
        <button onClick={onGenerate} disabled={generating} className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-gold-500 hover:text-gold-600 border border-gold-200 hover:border-gold-400 rounded px-2 py-0.5 transition-colors disabled:opacity-40">
          {generating ? <Loader size={9} className="animate-spin" /> : <Sparkles size={9} />} AI
        </button>
      </div>
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

  // Card face background — kraft default or card style image
  const faceClass = cardStyle ? 'bg-cover bg-center' : ''
  const faceStyle = cardStyle ? { backgroundImage: `url(${cardStyle.image_url})` } : {}

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

  async function generateContent(product: ProductBasic) {
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
            Front uses the <strong>{order.letter_content ? "customer's personal letter" : "standard note"}</strong>.
            Back shows only the {displayProducts.length} item{displayProducts.length !== 1 ? 's' : ''} in this order.
            Front and back print on separate pages — recommend <strong>{sizeLabel}</strong> paper each.
          </p>
        )}
        {!order && (
          <p className="font-sans text-xs text-bark-400 mt-2 max-w-2xl">
            Front and back print on separate pages — recommended <strong>{sizeLabel}</strong> each.
            Click ✨ on any item below to generate AI content, or Edit to write your own.
          </p>
        )}
      </div>

      <div className="space-y-10">
        {/* ── FRONT ── */}
        <div>
          <p className="print:hidden font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-2">
            Front — {sizeLabel}
          </p>
          <article
            className={`card-face relative rounded-lg border border-[#d8c7a8] p-10 sm:p-14 overflow-hidden ${faceClass}`}
            style={{ backgroundColor: '#f3ecdc', ...faceStyle }}
          >
            {/* Semi-transparent kraft overlay when a card style is active */}
            {cardStyle && (
              <div className="absolute inset-0 bg-[#f3ecdc]/80 pointer-events-none" style={{ WebkitPrintColorAdjust: 'exact' } as React.CSSProperties} />
            )}
            <div className="relative">
              {order?.letter_content ? (
                /* Customer's personal letter */
                <>
                  <p className="font-serif italic text-2xl text-bark-600 text-center mb-8">
                    {order.recipient_name ? `Dear ${order.recipient_name},` : 'To You,'}
                  </p>
                  <div className="space-y-4 font-sans text-[15px] text-bark-700 leading-relaxed max-w-xl mx-auto whitespace-pre-line">
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
          </article>
        </div>

        {/* ── BACK ── */}
        <div>
          <p className="print:hidden font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 mb-2">
            Back — {sizeLabel}
          </p>
          <article
            className={`card-face relative rounded-lg border border-[#d8c7a8] p-10 sm:p-14 overflow-hidden ${faceClass}`}
            style={{ backgroundColor: '#f3ecdc', ...faceStyle }}
          >
            {cardStyle && (
              <div className="absolute inset-0 bg-[#f3ecdc]/80 pointer-events-none" />
            )}
            <div className="relative">
              <h2 className="font-serif text-2xl text-bark-600 text-center mb-1">What&rsquo;s in Your Box</h2>
              <p className="font-serif italic text-bark-400 text-center text-sm mb-8">Each item chosen with care. Each ingredient traced to its source.</p>

              {order ? (
                /* Order-specific items */
                displayProducts.length === 0 ? (
                  <p className="text-center font-sans text-sm text-bark-400 py-8 print:hidden">No items found in this order.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 max-w-2xl mx-auto font-sans text-[13px] text-bark-700 leading-snug">
                    {displayProducts.map(product => {
                      const content = getContent(product)
                      if (editingId === product.id && editDraft) {
                        return (
                          <ItemEditor
                            key={product.id}
                            content={editDraft}
                            onChange={setEditDraft}
                            onSave={() => saveEdit(product.id)}
                            onCancel={() => { setEditingId(null); setEditDraft(null) }}
                          />
                        )
                      }
                      return (
                        <CardItem
                          key={product.id}
                          product={product}
                          content={content}
                          onEdit={() => { setEditingId(product.id); setEditDraft(content) }}
                          onGenerate={() => generateContent(product)}
                          generating={generating === product.id}
                        />
                      )
                    })}
                  </div>
                )
              ) : (
                /* Default — prompt to use with an order */
                <div className="text-center py-8 print:hidden">
                  <p className="font-sans text-sm text-bark-400 mb-1">Open this page from an order to see personalized item content.</p>
                  <p className="font-sans text-[11px] text-bark-400/60">Manage per-product card content in the library below.</p>
                </div>
              )}

              <p className="font-serif italic text-gold-500 text-center mt-8 text-sm max-w-xl mx-auto">
                Everything in your box is made to be used, loved, and — when its time comes — returned gently to the earth.
              </p>
            </div>
          </article>
        </div>
      </div>

      {/* ── Item Content Library (screen only, no order needed) ── */}
      {!orderId && (
        <div className="print:hidden mt-16">
          <div className="mb-6 pb-3 border-b border-cream-300">
            <h2 className="font-serif text-xl text-bark-600">Item Content Library</h2>
            <p className="font-sans text-xs text-bark-400 mt-1">
              The back of every card uses these descriptions — one per product. Click ✨ to generate with AI, or Edit to write your own.
              Every customer who receives that item will see the same text.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allProducts.map(product => {
              const content = getContent(product)
              if (editingId === product.id && editDraft) {
                return (
                  <div key={product.id} className="bg-white border border-cream-300 rounded-xl p-4">
                    <ItemEditor
                      content={editDraft}
                      onChange={setEditDraft}
                      onSave={() => saveEdit(product.id)}
                      onCancel={() => { setEditingId(null); setEditDraft(null) }}
                    />
                  </div>
                )
              }
              return (
                <div key={product.id} className="bg-white border border-cream-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-2">
                    {productImg(product) && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={productImg(product)!} alt={product.name} className="w-14 h-14 rounded-lg object-cover border border-cream-200 shrink-0 bg-cream-100" onError={e => { e.currentTarget.style.visibility = 'hidden' }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400">{product.category}</p>
                      <h3 className="font-serif text-base text-bark-600 truncate">{product.name}</h3>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => { setEditingId(product.id); setEditDraft(content) }}
                        className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-bark-400 hover:text-bark-600 border border-cream-300 hover:border-bark-400 rounded px-2 py-1"
                      >
                        <Edit2 size={9} /> Edit
                      </button>
                      <button
                        onClick={() => generateContent(product)}
                        disabled={generating === product.id}
                        className="inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase text-gold-500 hover:text-gold-600 border border-gold-200 hover:border-gold-400 rounded px-2 py-1 disabled:opacity-40"
                      >
                        {generating === product.id ? <Loader size={9} className="animate-spin" /> : <Sparkles size={9} />} AI
                      </button>
                    </div>
                  </div>
                  {content.lines.length > 0 ? (
                    <div className="font-sans text-xs text-bark-700 space-y-0.5">
                      {content.lines.map((l, i) => (
                        <p key={i}><span className="font-semibold">{l.k}</span> {l.v}</p>
                      ))}
                      {content.note && <p className="text-bark-500 mt-1">{content.note}</p>}
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-bark-400/60 italic">No content yet — click ✨ to generate.</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          aside, header, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          .card-face {
            break-inside: avoid;
            page-break-after: always;
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
