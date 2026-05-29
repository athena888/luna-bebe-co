import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'La Lumière Collective',
    short_name: 'La Lumière',
    description: 'Luxury curated organic baby gift boxes — built item by item, shipped with love.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FAF9F8',
    theme_color: '#383734',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshot-mobile.jpg', sizes: '390x844', type: 'image/jpeg', form_factor: 'narrow' },
    ],
  }
}
