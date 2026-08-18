import type { Metadata } from 'next'
import { BoxProductView } from '@/app/boxes/[slug]/page'
import { isShoppingOnly } from '@/lib/catalog-visibility'

export const dynamic = 'force-dynamic'
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return {
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
