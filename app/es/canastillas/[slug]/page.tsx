import type { Metadata } from 'next'
import { BoxProductView } from '@/app/boxes/[slug]/page'
import { isShoppingOnly } from '@/lib/catalog-visibility'
import { esOpenGraph } from '@/lib/es-meta'
import { getBoxProduct } from '@/lib/catalog-db'
import { getTranslations } from '@/lib/i18n'

export const dynamic = 'force-dynamic'
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  // Spanish OG built from the box's own record. Without this the ROOT layout's
  // English block cascaded down, so every Spanish box page shared with an
  // English title and og:url pointing at the English homepage.
  const box = await getBoxProduct(slug)
  // Same translations the page body and the Spanish feed use — otherwise the
  // tab title and the share card stayed English on a Spanish URL.
  const es = box ? (await getTranslations('catalog_product', [slug])).get(slug) : undefined
  const esName = es?.name || box?.name
  const esSubtitle = es?.subtitle || box?.subtitle
  const esTitle = box ? `${esName} — Canastilla de Regalo | Petite Lavande` : 'Canastilla de Regalo | Petite Lavande'
  const esDesc = box
    ? `${esSubtitle || esName} — canastilla orgánica armada a mano por Petite Lavande.`
    : 'Canastillas de regalo orgánicas armadas a mano.'
  return {
    openGraph: esOpenGraph({
      path: `/es/canastillas/${slug}`,
      title: esTitle,
      description: esDesc,
      ...(box?.variants[0]?.images[0] ? { images: [{ url: box.variants[0].images[0], alt: esName ?? box.name }] } : {}),
    }),
    alternates: {
      canonical: `${BASE}/es/canastillas/${slug}`,
      languages: { en: `${BASE}/boxes/${slug}`, 'es-US': `${BASE}/es/canastillas/${slug}`, 'x-default': `${BASE}/boxes/${slug}` },
    },
    // Mirror the EN template: a Shopping-only box is an ad landing page, not
    // something to surface in organic search — in either language.
    ...(isShoppingOnly(slug) ? { robots: { index: false, follow: true } } : {}),
  }
}

export default async function EsBoxPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return BoxProductView({ params, searchParams, locale: 'es' })
}
