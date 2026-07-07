import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { AestheticBoxes } from '@/components/ui/AestheticBoxes'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ready-Made Gift Sets — Petite Lavande',
  description: 'Curated baby gift boxes — thoughtfully assembled, every detail chosen.',
  alternates: { canonical: '/boxes' },
}

export default async function BoxesPage() {
  const boxes = await getBoxes()
  // Group by AUDIENCE (For Baby / Wellness / Baby & Wellness Bundle); season is
  // a per-box label. Only non-empty groups, in this order. ("Wellness", not
  // "Mama" — Emily wants box naming that doesn't presume who it's for.)
  const AUDIENCE_GROUPS = [
    { key: 'baby', label: 'For Baby' },
    { key: 'mama', label: 'Wellness' },
    { key: 'bundle', label: 'Baby & Wellness Bundle' },
  ] as const
  const byStyle = AUDIENCE_GROUPS
    .map(g => ({ style: g.label, boxes: boxes.filter(b => b.audience === g.key) }))
    .filter(g => g.boxes.length > 0)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">

        <AestheticBoxes byStyle={byStyle} />

      </main>
      <Footer />
    </>
  )
}
