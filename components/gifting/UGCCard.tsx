import Image from 'next/image'
import type { UgcItem } from '@/lib/gift-social-proof'
import { Eyebrow, SectionTitle } from './primitives'

// Customer photography. Every asset here was uploaded by a customer, granted
// marketing rights with the consent text stored verbatim, and then marked
// `featured` by a person in the portal. Nothing else can reach this component,
// and it renders nothing at all when the queue is empty.

export function UGCCard({ item }: { item: UgcItem }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-[color:var(--color-parchment)]">
      {item.mediaType === 'video' ? (
        <video
          src={item.url}
          className="absolute inset-0 w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        <Image src={item.url} alt="" fill sizes="(max-width: 639px) 45vw, 20vw" className="object-cover" />
      )}
    </div>
  )
}

export function UGCSection({ items, eyebrow, title }: {
  items: UgcItem[]
  eyebrow: string
  title: React.ReactNode
}) {
  if (items.length === 0) return null
  return (
    <section className="bg-[color:var(--color-cream-white)] border-t border-[color:var(--color-oat)]">
      <div className="max-w-6xl mx-auto px-6 py-14 sm:py-18">
        <div className="text-center mb-9">
          <Eyebrow>{eyebrow}</Eyebrow>
          <SectionTitle className="mt-3">{title}</SectionTitle>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {items.slice(0, 5).map(item => <UGCCard key={item.id} item={item} />)}
        </div>
      </div>
    </section>
  )
}
