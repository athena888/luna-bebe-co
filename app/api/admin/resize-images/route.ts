import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Batch resize all product images to 1000×1250px (4:5 aspect ratio)
 * Triggered manually via POST request
 *
 * Requires RESIZE_IMAGES_SECRET in Vercel env vars for security
 */

export async function POST(req: NextRequest) {
  // Security check
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.RESIZE_IMAGES_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get list of all product images in storage
    const { data: files, error: listErr } = await supabaseAdmin.storage
      .from('product-images')
      .list()

    if (listErr) throw new Error(`Failed to list files: ${listErr.message}`)
    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No images found', processed: 0 })
    }

    // For now, return report instead of processing
    // (Actual processing requires 'sharp' library which needs setup)
    const report = {
      status: 'To implement',
      message: 'Image resizing requires setup. Follow the steps below:',
      steps: [
        '1. Install sharp: npm install sharp',
        '2. Add RESIZE_IMAGES_SECRET to Vercel env vars',
        '3. Run resizing via POST /api/admin/resize-images with Authorization header',
      ],
      imagesToProcess: files.length,
      targetDimensions: '1000×1250px (4:5 aspect ratio)',
      expectedCompression: '50-55% storage reduction',
      files: files.slice(0, 10).map(f => ({ name: f.name, size: f.metadata?.size })),
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Resize error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
