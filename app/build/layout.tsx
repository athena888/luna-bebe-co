import type { Metadata } from 'next'
import { getSiteImages } from '@/lib/site-images'
import { getScrims } from '@/lib/scrims'
import { SPANISH_ACTIVE } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Build Your Own Organic Baby Gift Box',
  description: 'Curate your own luxury baby gift box — choose soft organic-cotton clothing, gentle botanical care, keepsakes and a mama gift, then add a personalized printed card. Built item by item, finished by hand.',
  openGraph: { title: 'Build Your Own Organic Baby Gift Box | Petite Lavande', description: 'Choose swaddles, garments, bath & body, keepsakes and mama gifts — then add a personalized printed card.' },
  alternates: {
    canonical: '/build',
    // /es/build already points back here; hreflang only counts when both
    // sides declare the pair.
    ...(SPANISH_ACTIVE
      ? { languages: { en: '/build', 'es-US': '/es/build', 'x-default': '/build' } } : {}),
  },
}

// Fresh hero data on every request so a re-uploaded photo shows immediately.
export const dynamic = 'force-dynamic'

const HERO_KEYS = ['build.header_bg', 'build.header_bg.mobile']

// The build page is a client component, so its hero background used to resolve
// only after page JS → API call → image download (a visibly slow fade-in).
// Preload server-side instead: <link rel="preload"> starts the image download
// with the HTML, and an inline global hands SlotBackground the slot data so it
// skips the API round-trip entirely.
export default async function BuildLayout({ children }: { children: React.ReactNode }) {
  let images: Record<string, { public_url: string; alt_text: string }> = {}
  let scrims: Record<string, { hex: string; opacity: number }> = {}
  try {
    const [imgs, scr] = await Promise.all([getSiteImages(HERO_KEYS), getScrims()])
    images = imgs as typeof images
    scrims = (scr ?? {}) as typeof scrims
  } catch { /* fail-soft: SlotBackground falls back to its own fetch */ }

  const web = images['build.header_bg']
  const mobile = images['build.header_bg.mobile']
  const preload = Object.keys(images).length
    ? { 'build.header_bg': { images, scrims: { 'build.header_bg': scrims['build.header_bg'] } } }
    : null

  return (
    <>
      {web && <link rel="preload" as="image" href={web.public_url} media={mobile ? '(min-width: 640px)' : undefined} fetchPriority="high" />}
      {mobile && <link rel="preload" as="image" href={mobile.public_url} media="(max-width: 639px)" fetchPriority="high" />}
      {preload && (
        <script
          // Inline so it's available before hydration — SlotBackground reads it
          // in its first effect and skips the API call.
          dangerouslySetInnerHTML={{ __html: `window.__plSlotPreload=${JSON.stringify(preload).replace(/</g, '\\u003c')}` }}
        />
      )}
      {children}
    </>
  )
}
