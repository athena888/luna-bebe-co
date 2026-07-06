import { NextRequest, NextResponse } from 'next/server'
import { buildRenderInput, type ImageMap } from '@/lib/lookbook/versions'
import { renderLookbookPdf } from '@/lib/lookbook/render'
import type { LookbookCopy } from '@/lib/lookbook/copy'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Live preview (portal-authed): renders the PDF from the current builder state
// WITHOUT publishing anything. The builder shows it via a blob URL.

export async function POST(req: NextRequest) {
  try {
    const { copy, imageMap } = (await req.json()) as { copy: LookbookCopy; imageMap: ImageMap }
    if (!copy) return NextResponse.json({ error: 'copy required' }, { status: 400 })
    const pdf = await renderLookbookPdf(await buildRenderInput(copy, imageMap ?? {}))
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="lookbook-preview.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('render error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Render failed' }, { status: 500 })
  }
}
