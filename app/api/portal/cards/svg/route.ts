import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CFG, renderCard } from '@/scripts/generate-cards'

// Single-card SVG preview for the portal Cards page — same renderer and
// geometry as the mat files, cropped to one card and slightly thicker strokes
// so it reads on screen.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('order')
  if (!id) return NextResponse.json({ error: 'order required' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('orders').select('id, recipient_name, letter_content').eq('id', id).maybeSingle()
  if (!data?.letter_content) return NextResponse.json({ error: 'No message on this order' }, { status: 404 })

  const { paths } = renderCard(
    { id: data.id, recipient: data.recipient_name ?? '', message: data.letter_content },
    0, 0,
  )
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CFG.cardW} ${CFG.cardH}">
  <rect x="0.5" y="0.5" width="${CFG.cardW - 1}" height="${CFG.cardH - 1}" rx="3" fill="#FBF7F0" stroke="#e2d8c8" stroke-width="0.4"/>
  <g fill="none" stroke="#41342A" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round">${paths.join('')}</g>
</svg>`
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, max-age=60' },
  })
}
