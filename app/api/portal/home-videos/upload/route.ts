import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ALLOWED_SLOTS = ['kraft']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const slot = formData.get('slot') as string | null

    if (!file || !slot) {
      return NextResponse.json({ error: 'file and slot are required' }, { status: 400 })
    }

    if (!ALLOWED_SLOTS.includes(slot)) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const allowedVideo = ['mp4', 'mov', 'webm']
    if (!allowedVideo.includes(ext)) {
      return NextResponse.json({ error: 'Only MP4, MOV, or WebM files are allowed' }, { status: 400 })
    }

    const fileName = `${slot}.mp4`
    const arrayBuffer = await file.arrayBuffer()

    await supabaseAdmin.storage.from('home-videos').remove([fileName])

    const { error } = await supabaseAdmin.storage
      .from('home-videos')
      .upload(fileName, arrayBuffer, {
        contentType: 'video/mp4',
        cacheControl: '0',
        upsert: true,
      })

    if (error) {
      console.error('Supabase video upload error:', error)
      return NextResponse.json({ error: error.message ?? 'Upload failed' }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from('home-videos').getPublicUrl(fileName)
    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('Video upload route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
