import { NextRequest, NextResponse } from 'next/server'
import { CFG, buildMatSVG } from '@/scripts/generate-cards'
import { getPendingCards } from '@/lib/cards-data'

// Download one mat's SVG (?n=1…) — identical output to the CLI generator.
export async function GET(req: NextRequest) {
  const n = Math.max(1, parseInt(req.nextUrl.searchParams.get('n') ?? '1') || 1)
  const { cards } = await getPendingCards()
  const writable = cards.filter(c => !c.handwrite)
  const perMat = CFG.cols * CFG.rows
  const batch = writable.slice((n - 1) * perMat, n * perMat)
  if (batch.length === 0) return NextResponse.json({ error: `No cards for mat ${n}` }, { status: 404 })

  const { svg } = buildMatSVG(batch.map(c => ({ id: c.id, recipient: c.recipient, message: c.message })), n - 1)
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="cards-mat${n}.svg"`,
    },
  })
}
