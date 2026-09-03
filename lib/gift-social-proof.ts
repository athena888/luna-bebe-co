import { supabaseAdmin } from './supabase.ts'
import { UGC_BUCKET } from './ugc.ts'

// Real proof, or none. Every function here reads the same tables and the same
// approval gates the rest of the site uses, and returns an empty array when
// there is nothing approved. No review text, name, rating, count or customer
// photo is ever synthesised — a fabricated review is both a lie and, on a page
// carrying Product JSON-LD, a manual action waiting to happen.

export interface ProofQuote {
  id: string
  quote: string
  name: string
  rating: number
  /** Which box it was left on, e.g. 'signature-baby-gift-box'. */
  boxSlug: string | null
  imageUrl: string | null
}

interface ReviewRow {
  id: string
  product_id: string
  customer_name: string | null
  rating: number
  body: string | null
  created_at: string
  image_url?: string | null
  incentivized?: boolean
}

/**
 * Approved reviews across every box, newest first, for the compact proof strip
 * that sits beside the product decision. Incentivized reviews are excluded for
 * the same reason they're excluded from the Google review feed: the exclusion
 * is reward-based, never star-based.
 *
 * `maxLength` trims to a quotable length without ellipsing mid-word; a review
 * longer than that is skipped rather than truncated, so nobody is ever quoted
 * saying something they didn't finish saying.
 */
export async function getGiftProofQuotes(limit = 4, maxLength = 220): Promise<ProofQuote[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('id, product_id, customer_name, rating, body, created_at, image_url, incentivized')
      .eq('approved', true)
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error || !data) return []
    const rows = data as ReviewRow[]
    return rows
      .filter(r => !r.incentivized)
      .filter(r => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5)
      .filter(r => !!r.body && r.body.trim().length >= 20 && r.body.trim().length <= maxLength)
      .slice(0, limit)
      .map(r => ({
        id: r.id,
        quote: r.body!.trim(),
        name: (r.customer_name || '').trim() || 'Verified customer',
        rating: r.rating,
        boxSlug: r.product_id?.startsWith('box-') ? r.product_id.slice(4) : null,
        imageUrl: r.image_url ?? null,
      }))
  } catch {
    return []
  }
}

export interface ProofSummary {
  /** Mean of every approved, non-incentivized rating. */
  average: number
  count: number
}

/**
 * The aggregate the strip prints beside the stars. Returns null below a floor
 * of three reviews: an "average" over one or two ratings is arithmetic, not
 * evidence, and printing it invites a shopper to trust a number that can move
 * a whole star on the next submission.
 */
export async function getGiftProofSummary(minReviews = 3): Promise<ProofSummary | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('rating, incentivized')
      .eq('approved', true)
    if (error || !data) return null
    const ratings = (data as Array<{ rating: number; incentivized?: boolean }>)
      .filter(r => !r.incentivized && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5)
      .map(r => r.rating)
    if (ratings.length < minReviews) return null
    const average = ratings.reduce((s, r) => s + r, 0) / ratings.length
    return { average: Math.round(average * 10) / 10, count: ratings.length }
  } catch {
    return null
  }
}

export interface UgcItem {
  id: string
  url: string
  mediaType: 'image' | 'video'
}

/**
 * Customer photos, and only the ones a human marked `featured` in the portal
 * after the customer granted marketing rights (the consent text is stored
 * verbatim per asset). The bucket is private, so each one is served through a
 * short-lived signed URL.
 *
 * Returns [] when nothing is featured. The UGC row is conditional on that —
 * it is never filled with studio photography dressed up as a customer photo.
 */
export async function getFeaturedUgc(limit = 6): Promise<UgcItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ugc_assets')
      .select('id, storage_path, media_type, status, consent_marketing')
      .eq('status', 'featured')
      .eq('consent_marketing', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error || !data?.length) return []
    const out: UgcItem[] = []
    for (const row of data as Array<{ id: string; storage_path: string; media_type: string }>) {
      // One hour is plenty: pages using this are dynamic, so the URL is minted
      // per request rather than baked into a cached HTML payload.
      const { data: signed } = await supabaseAdmin.storage.from(UGC_BUCKET).createSignedUrl(row.storage_path, 3600)
      if (!signed?.signedUrl) continue
      out.push({
        id: row.id,
        url: signed.signedUrl,
        mediaType: row.media_type === 'video' ? 'video' : 'image',
      })
    }
    return out
  } catch {
    return []
  }
}

/**
 * Per-box rating summaries, keyed by box slug, for the product cards. Same
 * approval and incentivized gates as everything else here; a box with fewer
 * than `minReviews` approved reviews is simply absent from the map, so its
 * card shows no rating rather than a rating built on one opinion.
 */
export async function getBoxRatings(minReviews = 3): Promise<Record<string, ProofSummary>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('product_id, rating, incentivized')
      .eq('approved', true)
      .like('product_id', 'box-%')
    if (error || !data) return {}
    const buckets: Record<string, number[]> = {}
    for (const r of data as Array<{ product_id: string; rating: number; incentivized?: boolean }>) {
      if (r.incentivized) continue
      if (typeof r.rating !== 'number' || r.rating < 1 || r.rating > 5) continue
      const slug = r.product_id.slice(4)
      ;(buckets[slug] ??= []).push(r.rating)
    }
    const out: Record<string, ProofSummary> = {}
    for (const [slug, ratings] of Object.entries(buckets)) {
      if (ratings.length < minReviews) continue
      const average = ratings.reduce((s, n) => s + n, 0) / ratings.length
      out[slug] = { average: Math.round(average * 10) / 10, count: ratings.length }
    }
    return out
  } catch {
    return {}
  }
}
