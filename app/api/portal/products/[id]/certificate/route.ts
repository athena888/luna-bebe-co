import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Uploads a certificate image/PDF for a product cert; returns its public URL.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const certKey = (formData.get('certKey') as string) || 'cert'

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP, or PDF allowed' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const fileName = `certs/${id}-${certKey}-${Date.now()}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: true })

  if (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(fileName)
  return NextResponse.json({ url: data.publicUrl })
}
