import Link from 'next/link'
import Image from 'next/image'
import { formatDollars } from '@/lib/products'

export interface RelatedItem { id: string; name: string; price: number; image: string }

// 2–3 quiet cross-links on product pages — internal linking so product pages
// aren't dead ends, kept minimal and on-brand. Presentational: the product
// page computes the related list server-side and passes it through
// ProductDetailClient so this renders above the page's own footer.
export function RelatedProducts({ items, isEs = false }: { items?: RelatedItem[]; isEs?: boolean }) {
  if (!items?.length) return null
  return (
    <section className="border-t border-cream-300 bg-cream-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <p className="font-sans text-[11px] tracking-[0.3em] uppercase text-gold-400 text-center mb-8">{isEs ? 'También te puede gustar' : 'You may also like'}</p>
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          {items.map(p => (
            <Link key={p.id} href={isEs ? `/es/productos/${p.id}` : `/products/${p.id}`} className="group text-center">
              <div className="relative aspect-[4/5] bg-white overflow-hidden mb-3">
                {p.image && <Image src={p.image} alt={p.name} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" unoptimized sizes="(max-width:640px) 30vw, 280px" />}
              </div>
              <p className="font-serif text-sm sm:text-base text-espresso leading-snug group-hover:text-gold-500 transition-colors">{p.name}</p>
              <p className="font-sans text-xs text-bark-400 mt-1">{formatDollars(p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
