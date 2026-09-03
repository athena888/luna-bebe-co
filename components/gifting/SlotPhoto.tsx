import Image from 'next/image'
import type { SiteImage } from '@/lib/site-images'

// A portal-managed photograph, rendered ON THE SERVER.
//
// The existing SlotImage/SlotBackground are client islands: they mount, fetch
// /api/site-images, then swap the photo in. That costs a round trip and a
// layout shift on exactly the traffic that can least afford either — cold
// mobile visitors arriving from an ad. Here the caller loads the slots once
// with getSiteImages() and passes them down, so the <img> is in the first HTML
// response with its dimensions already reserved.
//
// `priority` marks the LCP image: eager, high fetch priority, never lazy.
// Everything else lazy-loads.

export interface SlotPhotoProps {
  image: SiteImage | null | undefined
  mobileImage?: SiteImage | null
  /** Fallback alt when the portal row has none. Decorative photos pass ''. */
  alt: string
  /** Tailwind aspect utility, e.g. 'pl-ratio-45'. Reserves space before load. */
  className?: string
  imgClassName?: string
  priority?: boolean
  sizes?: string
  /** Breakpoint at which the mobile crop stops applying. Defaults to Tailwind's
   *  `sm`; the hero switches layout at `lg`, so it passes its own. */
  mobileMedia?: string
  /** Rendered when no photo has been uploaded yet. */
  fallback?: React.ReactNode
}

export function SlotPhoto({
  image,
  mobileImage,
  alt,
  className = '',
  imgClassName = 'object-cover',
  priority = false,
  sizes = '100vw',
  mobileMedia = '(max-width: 639px)',
  fallback = null,
}: SlotPhotoProps) {
  const desktop = image ?? mobileImage ?? null
  if (!desktop) {
    return fallback ? <div className={className}>{fallback}</div> : null
  }

  const altText = desktop.alt_text?.trim() || alt

  // Both crops present: one <picture>, not two CSS-hidden <img>s — `display:
  // none` does not stop a browser downloading an image, so a hidden pair costs
  // every visitor both files.
  if (image && mobileImage) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <picture>
          <source media={mobileMedia} srcSet={mobileImage.public_url} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.public_url}
            alt={altText}
            className={`absolute inset-0 w-full h-full ${imgClassName}`}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
          />
        </picture>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={desktop.public_url}
        alt={altText}
        fill
        sizes={sizes}
        quality={88}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        className={imgClassName}
      />
    </div>
  )
}

/** The stand-in shown while a slot is still empty. Never a fake product shot,
 *  never a broken image, never a grey box with a camera icon — just the
 *  parchment surface, so a section with no photo yet still looks deliberate.
 *
 *  The slot key is printed only outside production: it is the one piece of
 *  information whoever is uploading the photograph needs, and the last thing a
 *  customer should ever read on a live page. */
export function PhotoPending({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 pl-paper flex items-center justify-center p-6">
      {process.env.NODE_ENV !== 'production' && (
        <p className="pl-eyebrow text-[color:var(--color-ink-soft)]/50 text-center leading-relaxed">{label}</p>
      )}
    </div>
  )
}
