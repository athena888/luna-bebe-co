import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CERTIFICATIONS } from '@/lib/certifications'

const BUCKET = 'product-images'
const PREFIX = 'cert-icons'

// GET — return current icon URL for every cert key
export async function GET() {
  const icons: Record<string, string | null> = {}
  await Promise.all(
    CERTIFICATIONS.map(async cert => {
      // Try jpg, png, webp, svg in order
      for (const ext of ['png', 'jpg', 'webp', 'svg']) {
        const path = `${PREFIX}/${cert.key}.${ext}`
        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
        // Quick HEAD to see if it actually exists
        try {
          const res = await fetch(data.publicUrl, { method: 'HEAD' })
          if (res.ok) { icons[cert.key] = data.publicUrl; return }
        } catch { /* not found */ }
      }
      icons[cert.key] = null
    })
  )
  return NextResponse.json({ icons })
}

// POST — upload a cert icon (replaces any existing one)
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const certKey = formData.get('certKey') as string | null

  if (!file || !certKey) return NextResponse.json({ error: 'file and certKey required' }, { status: 400 })
  if (!CERTIFICATIONS.some(c => c.key === certKey)) return NextResponse.json({ error: 'Unknown cert key' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return NextResponse.json({ error: 'PNG, JPG, WebP or SVG only' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const path = `${PREFIX}/${certKey}.${ext}`

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type, upsert: true,
  })
  if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
