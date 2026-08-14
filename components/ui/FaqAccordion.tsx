'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Accessible accordion: buttons carry aria-expanded/aria-controls, panels are
// real regions, focus ring visible.
export function FaqAccordion({ items }: { items: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-y divide-cream-300 border-y border-cream-300">
      {items.map((f, i) => (
        <div key={i}>
          <button
            type="button"
            onClick={() => setOpen(o => (o === i ? null : i))}
            aria-expanded={open === i}
            aria-controls={`faq-panel-${i}`}
            id={`faq-button-${i}`}
            className="w-full flex items-center justify-between gap-4 py-4 text-left font-sans text-sm font-medium text-bark-600 hover:text-espresso focus:outline-none focus-visible:ring-2 focus-visible:ring-espresso-light"
          >
            {f.q}
            <ChevronDown size={15} className={`shrink-0 text-bark-400 transition-transform ${open === i ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <div
            id={`faq-panel-${i}`}
            role="region"
            aria-labelledby={`faq-button-${i}`}
            hidden={open !== i}
            className="pb-4"
          >
            <p className="font-sans text-sm text-bark-500 leading-relaxed">{f.a}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
