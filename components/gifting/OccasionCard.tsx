import Link from 'next/link'
import { SlotPhoto, PhotoPending } from './SlotPhoto'
import type { GiftOccasion } from '@/lib/gifting'
import type { SiteImage } from '@/lib/site-images'

// One high-emotion editorial card in "Shop by Moment". Photography, not icons;
// a photograph with the copy set into it, not a rounded dashboard tile.
//
// The whole card is the link — a gift buyer scanning four moments should not
// have to find a small text link inside the right one.

export function OccasionCard({ occasion, image, priority = false }: {
  occasion: GiftOccasion
  image: SiteImage | null
  priority?: boolean
}) {
  return (
    <Link
      href={occasion.path}
      className="group relative block overflow-hidden bg-[color:var(--color-parchment)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ink)] focus-visible:ring-offset-2"
    >
      <SlotPhoto
        image={image}
        alt={occasion.imageAlt}
        className="pl-ratio-45 w-full"
        imgClassName="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        sizes="(max-width: 1023px) 48vw, 24vw"
        priority={priority}
        fallback={<PhotoPending label={`Photo pending · ${occasion.imageSlot}`} />}
      />

      {/* The gradient exists to make the copy legible, so it is drawn even when
          no photo is set — otherwise the card would restyle itself the day a
          photo lands, and the layout would be tuned against the wrong contrast. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[62%]"
        style={{ backgroundImage: 'linear-gradient(to top, rgba(46,38,33,0.86), rgba(46,38,33,0.45) 45%, rgba(46,38,33,0))' }}
      />

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 lg:p-6">
        <h3 className="font-playfair text-[1.05rem] sm:text-[1.4rem] lg:text-[1.5rem] leading-tight text-[color:var(--color-parchment)]">
          {occasion.cardTitle}
        </h3>
        {/* The supporting line is the first thing to go on a half-width phone
            card: the title and the call to action are what make the tap. */}
        <p className="hidden sm:block font-sans text-[13px] leading-snug text-[color:var(--color-parchment)]/85 mt-1.5 max-w-[26ch]">
          {occasion.cardLine}
        </p>
        <span className="mt-2 sm:mt-3 inline-block font-sans text-[10px] sm:text-[11px] tracking-[0.14em] sm:tracking-[0.16em] uppercase font-semibold text-[color:var(--color-parchment)] border-b border-[color:var(--color-parchment)]/50 pb-1 group-hover:border-[color:var(--color-parchment)] transition-colors">
          {occasion.cardCta}
        </span>
      </div>
    </Link>
  )
}
