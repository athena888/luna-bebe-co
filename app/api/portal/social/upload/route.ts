import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const caption = (formData.get('caption') as string | null) ?? ''

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const imageExts = ['jpg', 'jpeg', 'png', 'webp']
    const videoExts = ['mp4', 'mov', 'webm']
    const type = imageExts.includes(ext) ? 'image' : videoExts.includes(ext) ? 'video' : null

    if (!type) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from('social-media')
      .upload(fileName, arrayBuffer, { contentType: file.type, cacheControl: '3600', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from('social-media').getPublicUrl(fileName)

    const { data: post, error: dbError } = await supabaseAdmin
      .from('social_posts')
      .insert({ type, media_url: urlData.publicUrl, caption, active: true, display_order: 0 })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ post })
  } catch (err) {
    console.error('Social upload error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
