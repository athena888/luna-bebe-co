import { BoxesView } from '@/app/boxes/page'
import { esOpenGraph } from '@/lib/es-meta'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sets listos para regalar',
  description: 'Canastillas de regalo curadas — armadas con intención, con cada detalle elegido.',
  openGraph: esOpenGraph({ path: '/es/canastillas', title: 'Sets listos para regalar | Petite Lavande', description: 'Canastillas de regalo curadas — armadas con intención, con cada detalle elegido.' }),
  alternates: {
    canonical: '/es/canastillas',
    languages: { en: '/boxes', 'es-US': '/es/canastillas', 'x-default': '/boxes' },
  },
}

export default function EsBoxesPage() {
  return <BoxesView locale="es" />
}
