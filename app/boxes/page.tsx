import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { getBoxes } from '@/lib/prebuilt-boxes-db'
import { SlotBackground } from '@/components/ui/SlotBackground'
import { AestheticBoxes } from '@/components/ui/AestheticBoxes'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Ready-Made Gift Sets — Petite Lavande',
  description: 'Curated baby gift boxes — thoughtfully assembled, every detail chosen.',
}

export default async function BoxesPage() {
  const boxes = await getBoxes()
  // Group by whichever styles actually exist
  const styles = Array.from(new Set(boxes.map(b => b.style)))
  const byStyle = styles.map(style => ({
    style,
    boxes: boxes.filter(b => b.style === style),
  }))

  return (
    <>
      <Header />
      <main className="min-h-screen bg-cream-white">

        <AestheticBoxes byStyle={byStyle} />

        {/* Build-your-own CTA (optional background image, managed in Site Images) */}
        <SlotBackground slotKey="boxes.custom_cta_bg" className="border-t border-cream-300 py-20 px-6 text-center">
          <p className="font-serif text-xl italic text-bark-500 mb-2">Prefer to choose yourself?</p>
          <p className="font-sans text-xs text-bark-500 mb-6 tracking-wide">Build your own custom box — pick exactly what goes inside.</p>
          <Link
            href="/build"
            className="border border-bark-600 text-bark-600 font-sans text-[10px] tracking-[0.25em] uppercase px-10 py-3.5 hover:bg-bark-600 hover:text-cream-50 transition-colors inline-block bg-cream-50/70"
          >
            Build a Custom Box
          </Link>
        </SlotBackground>

      </main>
      <Footer />
    </>
  )
}
