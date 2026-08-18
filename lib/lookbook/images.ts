import sharp from 'sharp'
import convertHeic from 'heic-convert'
import { anthropic } from '../anthropic.ts'
import { supabaseAdmin } from '../supabase.ts'
import { getTiers } from './copy.ts'

// Brand image library for the lookbook (Supabase Storage bucket 'brand-assets',
// PRIVATE — previews and PDFs are served via short-lived signed URLs only).
// Uploads go browser → signed upload URL → Supabase directly (15MB originals
// clear Vercel's ~4.5MB body limit), then the process endpoint normalizes:
// HEIC → JPEG, EXIF orientation applied then ALL metadata stripped (sharp
// re-encode), long edge capped, and one vision call auto-tags the image.

export const BRAND_BUCKET = 'brand-assets'
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_EDGE = 2400

export const IMAGE_KINDS = ['hero', 'tier', 'detail', 'lifestyle', 'logo'] as const
export type ImageKind = (typeof IMAGE_KINDS)[number]

// The lookbook/print palette (matches the cockpit image scorer, not the web
// theme): cream #FBF4EA · lavender #C6B2DC · sage #A7AE95 · espresso #41342A.
export const BRAND_PALETTE = { cream: '#FBF4EA', lavender: '#C6B2DC', sage: '#A7AE95', espresso: '#41342A' }

export interface BrandImage {
  id: string
  storage_path: string
  kind: string | null
  tier: string | null
  tags: string[]
  off_palette: boolean
  is_press: boolean       // shown on the public /press kit page + zip
  width: number | null
  height: number | null
  created_at: string
  url?: string   // signed preview URL, attached on list
}

const ALLOWED_EXT = /\.(jpe?g|png|webp|heic|heif)$/i

export function uploadPathFor(filename: string): string {
  const safe = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80)
  if (!ALLOWED_EXT.test(safe)) throw new Error('Only jpg, png, webp or heic files are accepted')
  return `library/incoming/${Date.now()}-${safe}`
}

export async function createSignedUpload(filename: string): Promise<{ path: string; token: string }> {
  const path = uploadPathFor(filename)
  const { data, error } = await supabaseAdmin.storage.from(BRAND_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw new Error(`Signed upload failed: ${error?.message}`)
  return { path: data.path, token: data.token }
}

/** Normalize an uploaded original and create the tagged brand_images row. */
export async function processUpload(incomingPath: string): Promise<BrandImage> {
  const { data: blob, error } = await supabaseAdmin.storage.from(BRAND_BUCKET).download(incomingPath)
  if (error || !blob) throw new Error(`Download failed: ${error?.message}`)
  if (blob.size > MAX_UPLOAD_BYTES) {
    await supabaseAdmin.storage.from(BRAND_BUCKET).remove([incomingPath])
    throw new Error('File exceeds the 15MB limit')
  }
  let buf: Buffer = Buffer.from(await blob.arrayBuffer())

  // HEIC/HEIF → JPEG first (prebuilt sharp can't decode HEIC).
  if (/\.hei[cf]$/i.test(incomingPath) || isHeic(buf)) {
    buf = Buffer.from(await convertHeic({ buffer: buf, format: 'JPEG', quality: 0.92 }))
  }

  // Apply EXIF orientation, cap the long edge, re-encode → strips ALL metadata
  // (sharp drops EXIF/GPS unless .withMetadata() is called — it isn't).
  const normalized = await sharp(buf)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer({ resolveWithObject: true })

  const finalPath = incomingPath.replace('library/incoming/', 'library/').replace(/\.[^.]+$/, '.jpg')
  const up = await supabaseAdmin.storage.from(BRAND_BUCKET)
    .upload(finalPath, normalized.data, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true })
  if (up.error) throw new Error(`Store failed: ${up.error.message}`)
  await supabaseAdmin.storage.from(BRAND_BUCKET).remove([incomingPath])

  const tagging = await autoTag(normalized.data).catch(e => {
    console.error('auto-tag failed (image kept untagged):', e)
    return { kind: null, tier: null, tags: [] as string[], off_palette: false }
  })

  const { data: row, error: insErr } = await supabaseAdmin.from('brand_images').insert({
    storage_path: finalPath,
    kind: tagging.kind, tier: tagging.tier, tags: tagging.tags, off_palette: tagging.off_palette,
    width: normalized.info.width, height: normalized.info.height,
  }).select('*').single()
  if (insErr) throw new Error(`Insert failed: ${insErr.message}`)
  return row as BrandImage
}

function isHeic(buf: Buffer): boolean {
  return buf.length > 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp'
    && /^(heic|heix|hevc|mif1|msf1)/.test(buf.subarray(8, 12).toString('ascii'))
}

// ── Vision auto-tagging (one call per upload) ────────────────────────────────
interface Tagging { kind: ImageKind | null; tier: string | null; tags: string[]; off_palette: boolean }

async function autoTag(jpeg: Buffer): Promise<Tagging> {
  // Downsize for the vision call — tagging doesn't need print resolution.
  const small = await sharp(jpeg).resize(1200, 1200, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()
  const tierNames = (await getTiers()).map(t => t.name)   // live-catalog SKU names

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You tag product photos for Petite Lavande (organic baby gift boxes). Brand palette: cream ${BRAND_PALETTE.cream}, lavender ${BRAND_PALETTE.lavender}, sage ${BRAND_PALETTE.sage}, espresso ${BRAND_PALETTE.espresso}. Respond with ONLY a JSON object:
{"kind": "hero"|"tier"|"detail"|"lifestyle"|"logo", "tier": one of ${JSON.stringify(tierNames)} or null, "tags": [up to 5 short lowercase tags], "off_palette": boolean}
kind guide — hero: styled flat-lay of a full box; tier: a single box/tier presented on its own; detail: close-up of one item or texture; lifestyle: people/room scene; logo: a logo or wordmark. off_palette: true when the image's dominant colors clash with the brand palette (loud primaries, neon, heavy black). Be lenient — this is a soft warning.`,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') } },
        { type: 'text', text: 'Tag this image.' },
      ],
    }],
  })
  const text = res.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
  const m = text.match(/\{[\s\S]*\}/)
  const raw = m ? (JSON.parse(m[0]) as Record<string, unknown>) : {}
  const kind = IMAGE_KINDS.includes(raw.kind as ImageKind) ? (raw.kind as ImageKind) : null
  const tier = typeof raw.tier === 'string' && tierNames.includes(raw.tier) ? raw.tier : null
  const tags = Array.isArray(raw.tags) ? raw.tags.slice(0, 5).map(t => String(t).toLowerCase()) : []
  return { kind, tier, tags, off_palette: Boolean(raw.off_palette) }
}

// ── Reads / mutations ────────────────────────────────────────────────────────
export async function listImages(): Promise<BrandImage[]> {
  const { data } = await supabaseAdmin.from('brand_images').select('*').order('created_at', { ascending: false })
  const rows = (data ?? []) as BrandImage[]
  if (!rows.length) return rows
  const { data: signed } = await supabaseAdmin.storage.from(BRAND_BUCKET)
    .createSignedUrls(rows.map(r => r.storage_path), 3600)
  const byPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))
  return rows.map(r => ({ ...r, url: byPath.get(r.storage_path) ?? undefined }))
}

export async function retagImage(id: string, patch: { kind?: string | null; tier?: string | null; tags?: string[]; is_press?: boolean }): Promise<void> {
  const row: Record<string, unknown> = {}
  if (patch.kind !== undefined) row.kind = patch.kind && IMAGE_KINDS.includes(patch.kind as ImageKind) ? patch.kind : null
  if (patch.tier !== undefined) row.tier = patch.tier || null
  if (patch.tags !== undefined) row.tags = patch.tags.slice(0, 8).map(t => String(t).toLowerCase())
  if (patch.is_press !== undefined) row.is_press = Boolean(patch.is_press)
  if (Object.keys(row).length) await supabaseAdmin.from('brand_images').update(row).eq('id', id)
}

/** Press-kit images (is_press) with long signed URLs for the public page. */
export async function listPressImages(expiresIn = 3600): Promise<BrandImage[]> {
  const { data } = await supabaseAdmin.from('brand_images')
    .select('*').eq('is_press', true).order('created_at', { ascending: false })
  const rows = (data ?? []) as BrandImage[]
  if (!rows.length) return rows
  const { data: signed } = await supabaseAdmin.storage.from(BRAND_BUCKET)
    .createSignedUrls(rows.map(r => r.storage_path), expiresIn)
  const byPath = new Map((signed ?? []).map(s => [s.path, s.signedUrl]))
  return rows.map(r => ({ ...r, url: byPath.get(r.storage_path) ?? undefined }))
}

export async function deleteImage(id: string): Promise<void> {
  const { data } = await supabaseAdmin.from('brand_images').select('storage_path').eq('id', id).maybeSingle()
  if (data?.storage_path) await supabaseAdmin.storage.from(BRAND_BUCKET).remove([data.storage_path as string])
  await supabaseAdmin.from('brand_images').delete().eq('id', id)
}

/** Signed URL for one stored object (used by the builder preview + renderer). */
export async function signedUrlFor(path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await supabaseAdmin.storage.from(BRAND_BUCKET).createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}
