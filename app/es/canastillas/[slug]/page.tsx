import type { Metadata } from 'next'
import { BoxProductView } from '@/app/boxes/[slug]/page'

export const dynamic = 'force-dynamic'
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  return {
    alternates: {
      canonical: `${BASE}/es/canastillas/${slug}`,
      languages: { en: `${BASE}/boxes/${slug}`, 'es-US': `${BASE}/es/canastillas/${slug}`, 'x-default': `${BASE}/boxes/${slug}` },
    },
  }
}

export default async function EsBoxPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return BoxProductView({ params, searchParams, locale: 'es' })
}
