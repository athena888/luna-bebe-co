import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const productId = formData.get('productId') as string | null

    if (!file || !productId) {
      return NextResponse.json({ error: 'file and productId are required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const allowed = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WebP files are allowed' }, { status: 400 })
    }

    const fileName = `${productId}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
