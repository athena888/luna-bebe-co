import { supabaseAdmin } from '../supabase'
import { getTiers, getCorporateFields, type LookbookCopy } from './copy'
import { checkBannedPhrases, type Violation } from './banned-phrases'
import { renderLookbookPdf, type RenderInput } from './render'
import { BRAND_BUCKET, signedUrlFor } from './images'

// Versioned publishing. Publish = render → upload brand-assets/lookbook/vN.pdf
// → insert lookbook_versions + flip previous is_current=false. Old versions
// stay downloadable in the portal forever; /corporate/lookbook.pdf always 302s
// to the current one. The banned-phrase gate runs HERE — a violation blocks
// publish regardless of what the copy-assist prompt promised.

export interface ImageMap { cover?: string | null; detail?: string | null; tiers?: Record<string, string | null> }

/** The website's corporate hero photo (public site_images slot) — used as the
 *  cover fallback so the PDF shares the site's imagery before Emily assigns one. */
async function siteCorporateHeroUrl(): Promise<string | undefined> {
  const { data } = await supabaseAdmin.from('site_images')
    .select('public_url').eq('slot_key', 'corporate.hero_bg')
    .order('sort_order').limit(1).maybeSingle()
  return (data?.public_url as string) || undefined
}

/** Resolve brand_images ids in the slot map to signed URLs the renderer can fetch. */
export async function buildRenderInput(copy: LookbookCopy, imageMap: ImageMap): Promise<RenderInput> {
  const [tiers, corporate] = await Promise.all([getTiers(), getCorporateFields()])
  const ids = [imageMap.cover, imageMap.detail, ...Object.values(imageMap.tiers ?? {})].filter((v): v is string => Boolean(v))
  const urlById = new Map<string, string>()
  if (ids.length) {
    const { data } = await supabaseAdmin.from('brand_images').select('id, storage_path').in('id', ids)
    for (const r of (data ?? []) as { id: string; storage_path: string }[]) {
      const url = await signedUrlFor(r.storage_path, 900)
      if (url) urlById.set(r.id, url)
    }
  }
  const tierImages: Record<string, string> = {}
  for (const [name, id] of Object.entries(imageMap.tiers ?? {})) {
    const url = id ? urlById.get(id) : undefined
    if (url) tierImages[name] = url
  }
  // Cover falls back to the site's own corporate hero photo when no brand
  // image is assigned; with neither, the renderer uses the botanical art.
  const cover = (imageMap.cover ? urlById.get(imageMap.cover) : undefined) ?? (await siteCorporateHeroUrl())
  return {
    copy, tiers, corporate,
    images: {
      cover,
      detail: imageMap.detail ? urlById.get(imageMap.detail) : undefined,
      tierImages,
    },
  }
}

export type PublishResult =
  | { ok: true; version: number }
  | { ok: false; violations: Violation[] }

export async function publishLookbook(copy: LookbookCopy, imageMap: ImageMap): Promise<PublishResult> {
  const violations = checkBannedPhrases(copy)
  if (violations.length) return { ok: false, violations }

  const pdf = await renderLookbookPdf(await buildRenderInput(copy, imageMap))

  const { data: maxRow } = await supabaseAdmin.from('lookbook_versions')
    .select('version').order('version', { ascending: false }).limit(1).maybeSingle()
  const version = ((maxRow?.version as number) ?? 0) + 1
  const storagePath = `lookbook/v${version}.pdf`

  const up = await supabaseAdmin.storage.from(BRAND_BUCKET)
    .upload(storagePath, pdf, { contentType: 'application/pdf', cacheControl: '3600', upsert: true })
  if (up.error) throw new Error(`PDF upload failed: ${up.error.message}`)

  // Publishing the new version makes every previous one non-current.
  await supabaseAdmin.from('lookbook_versions').update({ is_current: false }).eq('is_current', true)
  const { error } = await supabaseAdmin.from('lookbook_versions').insert({
    version, storage_path: storagePath, copy, image_map: imageMap, is_current: true,
  })
  if (error) throw new Error(`Version insert failed: ${error.message}`)
  return { ok: true, version }
}

export interface VersionRow {
  id: string; version: number; storage_path: string; is_current: boolean; published_at: string
  copy: LookbookCopy; image_map: ImageMap; downloadUrl?: string
}

export async function listVersions(): Promise<VersionRow[]> {
  const { data } = await supabaseAdmin.from('lookbook_versions')
    .select('*').order('version', { ascending: false })
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
