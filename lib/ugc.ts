import { createHmac } from 'crypto'
import { supabaseAdmin } from './supabase.ts'

// Build 9 — UGC + rights pipeline. Customers can attach a photo to their
// review; the rights checkbox stores THIS text verbatim per asset so consent
// is auditable later. Assets land in the private `ugc` bucket (§43) with
// status 'new'; nothing is ever used without approval in the portal grid.

export const UGC_BUCKET = 'ugc'
export const UGC_MAX_BYTES = 8 * 1024 * 1024 // 8MB — plenty for a photo

// The consent line rendered next to the checkbox. If this wording ever
// changes, past rows keep the text they agreed to.
export const UGC_CONSENT_TEXT =
  'I give Petite Lavande permission to use this photo in marketing, on the website, in ads, and on marketplace listings. I can withdraw consent anytime by emailing us.'

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov'])

export async function createUgcSignedUpload(filename: string): Promise<{ path: string; token: string }> {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  if (!ALLOWED_EXT.has(ext)) throw new Error('Unsupported file type')
  const stamp = Date.now()
  const rand = createHmac('sha256', 'pl-ugc').update(`${filename}${stamp}${Math.random()}`).digest('hex').slice(0, 10)
  const path = `uploads/${stamp}-${rand}.${ext}`
  const { data, error } = await supabaseAdmin.storage.from(UGC_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw new Error(error?.message || 'Sign failed')
  return { path: data.path, token: data.token }
}

export async function recordUgcAsset(input: {
  email: string
  orderId?: string | null
  storagePath: string
  mediaType: 'image' | 'video'
  consentMarketing: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Invalid email' }
  if (!input.storagePath.startsWith('uploads/')) return { ok: false, error: 'Invalid path' }
  const { error } = await supabaseAdmin.from('ugc_assets').insert({
    contact_email: email,
    order_id: input.orderId ?? null,
    storage_path: input.storagePath,
    media_type: input.mediaType,
    consent_marketing: input.consentMarketing,
    consent_text: UGC_CONSENT_TEXT,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export interface UgcAssetRow {
  id: string
  contact_email: string
  order_id: string | null
  storage_path: string
  media_type: string
  consent_marketing: boolean
  status: 'new' | 'approved' | 'rejected' | 'featured'
  tags: string[]
  created_at: string
  signedUrl?: string
}

/** For the portal grid — newest first, with viewing URLs. */
export async function listUgcAssets(): Promise<UgcAssetRow[]> {
  const { data } = await supabaseAdmin
    .from('ugc_assets').select('*').order('created_at', { ascending: false }).limit(200)
  const rows = (data ?? []) as UgcAssetRow[]
  for (const r of rows) {
    const { data: s } = await supabaseAdmin.storage.from(UGC_BUCKET).createSignedUrl(r.storage_path, 3600)
    r.signedUrl = s?.signedUrl
  }
  return rows
}

export async function setUgcStatus(id: string, status: UgcAssetRow['status'], tags?: string[]): Promise<void> {
  const patch: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() }
  if (tags) patch.tags = tags
  await supabaseAdmin.from('ugc_assets').update(patch).eq('id', id)
}
