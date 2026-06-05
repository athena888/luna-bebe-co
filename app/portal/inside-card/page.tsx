'use client'

import { Printer } from 'lucide-react'

// Print-ready inside-box card (kraft). Front = A Note to the New Mother
// (Section 6). Back = What's in Your Box (Section 6B). Recommended 5x7 folded.
// Use the browser's "Save as PDF" or print to kraft cardstock.
export default function InsideCardPage() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Screen-only header */}
      <div className="print:hidden mb-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-3xl text-bark-600">Inside-Box Card</h1>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-bark-600 text-white font-sans text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 rounded hover:bg-bark-700 transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
        <p className="font-sans text-sm text-bark-400 mt-2 max-w-2xl">
          The kraft card tucked into every box. <strong>Front</strong> is the note to the mother; <strong>back</strong> lists what&rsquo;s inside.
          Click Print and choose &ldquo;Save as PDF&rdquo; or print onto kraft cardstock — recommended 5&times;7&Prime; folded.
        </p>
      </div>

      <div className="space-y-8">
        {/* FRONT — A Note to the New Mother */}
        <article className="card-face rounded-lg border border-[#d8c7a8] bg-[#f3ecdc] p-10 sm:p-14">
          <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 text-center mb-1">Front</p>
          <p className="font-serif italic text-3xl text-bark-600 text-center mb-8">We see you.</p>
          <div className="space-y-4 font-sans text-[15px] text-bark-700 leading-relaxed max-w-xl mx-auto">
            <p>You are doing one of the hardest, most loving things a person can do. You are running on broken sleep and feeding schedules and a love so big it doesn&rsquo;t fit in your chest.</p>
            <p>You deserve warm tea. You deserve ten minutes in a bath. You deserve a few hours of dark, quiet sleep with silk against your eyes. You deserve scent and softness and the small luxury of being thought of.</p>
            <p>This box is here to remind you: <span className="font-semibold">you are not invisible in your own story.</span></p>
            <p>Welcome to this new chapter. We hope it starts well.</p>
          </div>
          <p className="font-serif italic text-bark-500 text-center mt-8">— Petite Lavande</p>
          <p className="font-serif italic text-gold-500 text-center mt-2 text-sm">Fait avec amour, pour vous.</p>
        </article>

        {/* BACK — What's in Your Box */}
        <article className="card-face rounded-lg border border-[#d8c7a8] bg-[#f3ecdc] p-10 sm:p-14">
          <p className="font-sans text-[9px] tracking-[0.35em] uppercase text-bark-400 text-center mb-1">Back</p>
          <h2 className="font-serif text-2xl text-bark-600 text-center mb-1">What&rsquo;s in Your Box</h2>
          <p className="font-serif italic text-bark-400 text-center text-sm mb-8">Each item chosen with care. Each ingredient traced to its source.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 max-w-2xl mx-auto font-sans text-[13px] text-bark-700 leading-snug">
            {ITEMS.map(item => (
              <div key={item.title}>
                <h3 className="font-serif text-base text-bark-600 mb-1">{item.title}</h3>
                {item.lines.map((l, i) => (
                  <p key={i}><span className="font-semibold">{l.k}</span> {l.v}</p>
                ))}
                {item.note && <p className="text-bark-500 mt-0.5">{item.note}</p>}
              </div>
            ))}
          </div>

          <p className="font-serif italic text-gold-500 text-center mt-8 text-sm max-w-xl mx-auto">
            Everything in your box is made to be used, loved, and — when its time comes — returned gently to the earth.
          </p>
        </article>
      </div>

      <style jsx global>{`
        @media print {
          aside, header { display: none !important; }
          main { padding: 0 !important; }
          .card-face { break-inside: avoid; page-break-after: always; border: none; }
        }
      `}</style>
    </div>
  )
}

const ITEMS: Array<{ title: string; lines: Array<{ k: string; v: string }>; note?: string }> = [
  {
    title: 'Lavender Sachet',
    lines: [
      { k: 'Contents:', v: 'Organic French lavender buds (Provence)' },
      { k: 'Sachet:', v: 'Unbleached organic cotton' },
      { k: 'Use:', v: 'Tuck into pillows, drawers, or near where you rest. Scent lasts 3–6 months. Squeeze gently to refresh.' },
    ],
  },
  {
    title: "Peace O' Mind Herbal Tea",
    lines: [
      { k: 'Ingredients:', v: 'Organic chamomile (Egypt), organic red rose petals (Pakistan), organic French lavender (Provence)' },
      { k: 'Brewing:', v: '1 tablespoon in hot water, steep 5–10 minutes' },
      { k: 'Storage:', v: 'Cool, dry place, away from sunlight' },
    ],
    note: 'Caffeine-free • Nursing-friendly • 100% pure herbs, zero additives',
  },
  {
    title: 'Postpartum Sitz Bath Salt',
    lines: [
      { k: 'Ingredients:', v: 'Epsom salt, Himalayan pink salt, organic calendula petals, organic chamomile flowers, organic French lavender buds, organic rose petals, lavender essential oil' },
      { k: 'Use:', v: 'Dissolve 1/4 cup in warm bath water. Soak 15–20 minutes. Safe for postpartum perineal care after the first 24 hours (or as advised by your provider).' },
      { k: 'Storage:', v: 'Keep dry. Best used within 12 months.' },
    ],
    note: 'Hand-blended in Seattle • No synthetic fragrance • Small batches',
  },
  {
    title: 'Mulberry Silk Eye Mask',
    lines: [
      { k: 'Material:', v: '100% pure mulberry silk, hypoallergenic' },
      { k: 'Use:', v: 'Wear at night or for daytime naps. Blocks light gently, glides against skin to reduce friction.' },
      { k: 'Care:', v: 'Hand-wash in cold water with mild soap. Lay flat to dry. Do not bleach or tumble dry.' },
    ],
    note: 'Built to last years, not weeks.',
  },
  {
    title: 'Dried Bouquet',
    lines: [
      { k: 'Contains:', v: 'Cream globe amaranth, white ammobium, bunny tails, Pacific Northwest lavender' },
      { k: 'Wrapped in:', v: 'Raw linen, hemp twine' },
      { k: 'Care:', v: 'Display in a vase (no water needed). Keep out of direct sunlight to preserve color. Will stay beautiful for 1–2 years.' },
    ],
  },
  {
    title: 'For Baby',
    lines: [
      { k: 'Includes:', v: 'Two onesie sets, muslin, bib, comfort toy' },
      { k: 'Material:', v: '100% GOTS-certified organic cotton' },
      { k: 'Care:', v: 'Machine wash cold, tumble dry low. Wash before first use.' },
      { k: 'Safety:', v: 'CPSIA-compliant. No harmful dyes or finishes.' },
    ],
  },
  {
    title: 'The Box Itself',
    lines: [
      { k: 'Mailer:', v: 'Recycled kraft cardboard, soy-based ink' },
      { k: 'Tissue:', v: 'Acid-free, recyclable' },
      { k: 'Tags:', v: 'Kraft cardstock with linen string' },
      { k: 'Sealed with:', v: 'Hemp twine and a wax-style emblem' },
    ],
  },
]
