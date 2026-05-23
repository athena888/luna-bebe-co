import Link from 'next/link'
import { featuredBoxes, boxItemTotal } from '@/lib/prebuilt-boxes'
import { BOX_BASE_PRICE } from '@/lib/products'

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(0)}`
}

export function PrebuiltBoxesSection() {
  const boxes = featuredBoxes()

  return (
    <section className="border-t border-cream-300 py-16">
      <div className="pl-6 sm:pl-9 pr-6 mb-10 flex items-end justify-between">
        <div>
          <p className="font-sans text-[9px] tracking-[0.5em] uppercase text-gold-400 mb-2">Curated Styles</p>
          <h2 className="font-serif text-[2.25rem] sm:text-[3rem] text-bark-600">Shop by Aesthetic</h2>
          <p className="font-sans text-xs text-bark-400 mt-2 tracking-wide">Every detail chosen. Just pick the style that feels like them.</p>
        </div>
        <Link
          href="/boxes"
          className="hidden sm:inline-block font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 hover:text-bark-700 transition-colors border-b border-bark-400 pb-0.5"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-cream-300 border-y border-cream-300">
        {boxes.map((box) => {
          const items = Object.values(box.selection).filter(Boolean) as NonNullable<typeof box.selection.swaddle>[]
          const total = BOX_BASE_PRICE + boxItemTotal(box.selection)
          return (
            <Link
              key={box.slug}
              href={`/boxes/${box.slug}`}
              className="bg-cream-50 px-8 sm:px-10 py-10 flex flex-col group hover:bg-cream-100 transition-colors"
            >
              <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-3">{box.style}</p>
              <h3 className="font-serif text-3xl text-bark-600 mb-1">{box.name}</h3>
              <p className="font-cormorant text-base italic text-bark-400 mb-2 leading-snug">{box.tagline}</p>
              <p className="font-sans text-[9px] tracking-[0.15em] text-bark-300 mb-6">{box.aesthetic}</p>
              <ul className="space-y-2 mb-8 flex-1">
                {items.map(item => (
                  <li key={item.id} className="flex items-center gap-2.5">
                    <span className="w-3 h-px bg-gold-300 shrink-0" />
                    <span className="font-sans text-[10px] text-bark-500 tracking-wide">{item.name}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-4 border-t border-cream-200">
                <span className="font-serif text-xl text-bark-600">{fmt(total)}</span>
                <span className="font-sans text-[9px] tracking-[0.2em] uppercase text-bark-400 group-hover:text-bark-600 transition-colors">
                  Shop This Style →
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
