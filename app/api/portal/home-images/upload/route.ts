import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slot = formData.get('slot') as string | null

    if (!file || !slot) {
      return NextResponse.json({ error: 'file and slot are required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const allowed = ['jpg', 'jpeg', 'png', 'webp']
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WebP files are allowed' }, { status: 400 })
    }

    // Always store as {slot}.jpg so the homepage URL is predictable
    const fileName = `${slot}.jpg`
    const arrayBuffer = await file.arrayBuffer()

    // Remove first so replace always works (upsert alone can fail on existing files)
    await supabaseAdmin.storage.from('home-images').remove([fileName])

    const { error } = await supabaseAdmin.storage
      .from('home-images')
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        cacheControl: '0',
        upsert: true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: error.message ?? 'Upload failed' }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from('home-images').getPublicUrl(fileName)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
