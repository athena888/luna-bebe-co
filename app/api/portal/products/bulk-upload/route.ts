import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Accepts multiple image files. Each file's name (without extension) is used
// as the product ID. Uploads to product-images/{productId}.{ext} and updates
// products.image so the storefront picks it up immediately.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) return NextResponse.json({ error: 'No files provided' }, { status: 400 })

    const results: Array<{ productId: string; url?: string; error?: string }> = []

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        results.push({ productId: file.name, error: 'Not a supported image (JPG/PNG/WebP)' })
        continue
      }

      // Strip extension → product id
      const productId = file.name.slice(0, -(ext.length + 1))
      if (!productId) { results.push({ productId: file.name, error: 'Could not parse product ID from filename' }); continue }

      const buffer = await file.arrayBuffer()
      const fileName = `${productId}.${ext}`

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, buffer, { contentType: file.type, upsert: true })

      if (uploadErr) {
        results.push({ productId, error: uploadErr.message })
        continue
      }

      const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName)

      // Update products table so storefront reflects immediately
      await supabaseAdmin.from('products').update({ image: data.publicUrl }).eq('id', productId)

      results.push({ productId, url: data.publicUrl })
    }

    const succeeded = results.filter(r => r.url)
    const failed = results.filter(r => r.error)
    return NextResponse.json({ succeeded, failed })
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({ error: 'Bulk upload failed' }, { status: 500 })
  }
}
