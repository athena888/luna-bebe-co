import { supabaseAdmin } from '../supabase'
import { BRAND_BUCKET, signedUrlFor } from './images'

// Versioned lookbook PDFs — UPLOADED by Emily, not generated (the AI builder/
// renderer was removed 2026-08-14; she makes the PDF herself). Upload = signed
// direct-to-Supabase PUT of brand-assets/lookbook/vN.pdf (skips Vercel's
// ~4.5MB body limit), then a finalize call inserts the lookbook_versions row
// and flips previous is_current=false. Old versions stay downloadable in the
// portal forever; /corporate/lookbook.pdf always 302s to the current one.

export const MAX_LOOKBOOK_BYTES = 40 * 1024 * 1024

/** Next version number + a signed upload target for it. */
export async function createLookbookUploadTarget(): Promise<{ path: string; token: string; version: number }> {
  const { data: maxRow } = await supabaseAdmin.from('lookbook_versions')
    .select('version').order('version', { ascending: false }).limit(1).maybeSingle()
  const version = ((maxRow?.version as number) ?? 0) + 1
  const path = `lookbook/v${version}.pdf`
  const { data, error } = await supabaseAdmin.storage.from(BRAND_BUCKET).createSignedUploadUrl(path, { upsert: true })
  if (error || !data) throw new Error(`Signed upload failed: ${error?.message}`)
  return { path: data.path, token: data.token, version }
}

/** After the browser uploaded the PDF, record it as the new current version. */
export async function finalizeLookbookUpload(path: string, version: number): Promise<void> {
  if (!/^lookbook\/v\d+\.pdf$/.test(path) || path !== `lookbook/v${version}.pdf`) {
    throw new Error('Unexpected upload path')
  }
  // Confirm the object actually landed before flipping versions.
  const { data: obj, error: dlErr } = await supabaseAdmin.storage.from(BRAND_BUCKET).download(path)
  if (dlErr || !obj || obj.size === 0) throw new Error('Upload not found in storage — try again')
  if (obj.size > MAX_LOOKBOOK_BYTES) throw new Error('PDF is over the 40MB limit')

  await supabaseAdmin.from('lookbook_versions').update({ is_current: false }).eq('is_current', true)
  const { error } = await supabaseAdmin.from('lookbook_versions').insert({
    version, storage_path: path, copy: {}, image_map: {}, is_current: true,
  })
  if (error) throw new Error(`Version insert failed: ${error.message}`)
}

export interface VersionRow {
  id: string; version: number; storage_path: string; is_current: boolean; published_at: string
  downloadUrl?: string
}

export async function listVersions(): Promise<VersionRow[]> {
  const { data } = await supabaseAdmin.from('lookbook_versions')
    .select('id, version, storage_path, is_current, published_at').order('version', { ascending: false })
  const rows = (data ?? []) as VersionRow[]
  for (const r of rows) r.downloadUrl = (await signedUrlFor(r.storage_path, 3600)) ?? undefined
  return rows
}

/** Signed URL of the current version (for the public stable route). */
export async function currentVersionSignedUrl(): Promise<string | null> {
  const { data } = await supabaseAdmin.from('lookbook_versions')
    .select('storage_path').eq('is_current', true).maybeSingle()
  if (!data) return null
  return signedUrlFor((data as { storage_path: string }).storage_path, 3600)
}
