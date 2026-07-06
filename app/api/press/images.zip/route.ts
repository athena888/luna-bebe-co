import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase'
import { BRAND_BUCKET } from '@/lib/lookbook/images'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// "Download all images" for the public /press page: zips every is_press image
// on demand. Built in memory — fine at press-kit scale (a handful of ~2400px
// JPEGs); if the kit ever grows past ~40 images, switch to a pre-built zip
// stored in the bucket. Cached at the edge for an hour.

export async function GET() {
  try {
    const { data } = await supabaseAdmin.from('brand_images')
      .select('storage_path').eq('is_press', true).order('created_at')
    const paths = ((data ?? []) as { storage_path: string }[]).map(r => r.storage_path)
    if (!paths.length) return NextResponse.json({ error: 'No press images yet' }, { status: 404 })

    const zip = new JSZip()
    let n = 0
    for (const path of paths) {
      const { data: blob, error } = await supabaseAdmin.storage.from(BRAND_BUCKET).download(path)
      if (error || !blob) continue
      n++
      zip.file(`petite-lavande-press-${String(n).padStart(2, '0')}.jpg`, await blob.arrayBuffer())
    }
    if (!n) return NextResponse.json({ error: 'No press images available' }, { status: 404 })

    const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' })  // JPEGs don't recompress
    return new NextResponse(new Uint8Array(bytes).buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="petite-lavande-press-kit.zip"',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (e) {
    console.error('press zip error:', e)
    return NextResponse.json({ error: 'Zip failed' }, { status: 500 })
  }
}
