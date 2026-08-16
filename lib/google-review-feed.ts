import { supabaseAdmin } from './supabase'
import { FEED_BRAND, productFeedUrl } from './google-feed'

// Google product review feed (separate from the product feed by design).
// Policy enforced in code, not convention:
//  - EVERY approved review is emitted regardless of rating — there is no
//    rating filter and none may be added (filtering low stars gets the whole
//    feed blocked). The site-wide `approved` flag is uniform pre-publication
//    moderation (spam/abuse), which Google permits; it must never be used to
//    hide low ratings.
//  - Ratings are 1–5 in the DB and emitted 1–5 — no rescaling.
//  - Deletion decision, documented: reviews are only ever hard-deleted from
//    the DB for content-policy violations (spam/abuse), which Google allows
//    removing from the feed. Legitimate reviews are never deleted.
//  - collection_method (§53): 'post_fulfillment' only when the review arrived
//    through the signed review-ask token — evidence, not assumption. Manual
//    portal entries and tokenless form submissions export as 'unsolicited'.
//  - transaction_id / is_verified_purchase are emitted only when the DB holds
//    token-derived evidence (order_id / verified_buyer). Never fabricated.
//  - brand/mpn/product URLs come from lib/google-feed exports so the two
//    feeds cannot drift. Box-pooled reviews (§47, product_id 'box-<slug>')
//    point at the real /boxes/<slug> page, not a phantom /products URL.

export interface ReviewFeedRow {
  id: string
  productId: string
  /** The PRODUCT FEED's actual offer ids for this product — one per variant
   *  (e.g. box-<slug>--<key>, item--1). Google matches review→listing by SKU
   *  against offer ids; the bare group id matches nothing (the silent
   *  zero-stars failure the validator flagged 2026-08-16). */
  skus: string[]
  productUrl: string
  name: string
  rating: number
  body: string
  createdAt: string
  verified: boolean
  collectionMethod: 'post_fulfillment' | 'unsolicited'
  orderId: string | null
}

export interface ReviewFeedIssue { id: string; problems: string[] }

const boxSlug = (productId: string) => productId.startsWith('box-') ? productId.slice(4) : null

function reviewProductUrl(productId: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
  const slug = boxSlug(productId)
  return slug ? `${base}/boxes/${slug}` : productFeedUrl(productId)
}

interface ReviewRecord {
  id: string; product_id: string; customer_name: string | null; rating: number
  body: string | null; created_at: string | null
  incentivized?: boolean; verified_buyer?: boolean
  order_id?: string | null; collection_method?: string | null
}

export async function buildReviewFeed(): Promise<{ rows: ReviewFeedRow[]; issues: ReviewFeedIssue[]; total: number }> {
  // Incentivized reviews (review thank-you code, §45) are excluded from the
  // FEED ONLY — Google bars incentivized reviews from Product Ratings. This is
  // not rating-gating: the exclusion is reward-based, never star-based, and
  // the reviews still show on site with their disclosure. select('*') tolerates
  // every migration state (§45/§53 columns may not exist yet).
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: true })
  const all = ((data ?? []) as ReviewRecord[]).filter(r => !r.incentivized)
  const rows: ReviewFeedRow[] = []
  const issues: ReviewFeedIssue[] = []
  const seen = new Set<string>()

  for (const r of all) {
    const problems: string[] = []
    if (!r.id) problems.push('missing review_id')
    else if (seen.has(r.id)) problems.push('duplicate review_id')
    if (!r.body?.trim()) problems.push('missing content')
    if (!r.created_at) problems.push('missing timestamp')
    if (typeof r.rating !== 'number' || r.rating < 1 || r.rating > 5) problems.push(`invalid rating: ${r.rating}`)
    if (!r.product_id) problems.push('missing product link')
    if (problems.length) {
      issues.push({ id: r.id ?? '(no id)', problems })
      continue
    }
    seen.add(r.id)
    rows.push({
      id: r.id,
      productId: r.product_id,
      skus: [r.product_id],   // refined below to the real offer ids
      productUrl: reviewProductUrl(r.product_id),
      name: r.customer_name?.trim() || '',
      rating: r.rating,
      body: (r.body as string).trim(),
      createdAt: new Date(r.created_at as string).toISOString(),
      verified: !!r.verified_buyer,
      // Only token-evidenced reviews claim post_fulfillment; 'manual' portal
      // entries and pre-§53 rows (NULL) export as unsolicited.
      collectionMethod: r.collection_method === 'post_fulfillment' ? 'post_fulfillment' : 'unsolicited',
      orderId: r.order_id?.trim() || null,
    })
  }
  // Resolve each review's skus to the product feed's REAL offer ids, using
  // the same id-shaping rules as the TSV: boxes → box-<slug>--<variantKey>
  // per active variant; items with >1 variants → <id>--N; else the plain id.
  // Fail-soft: on any lookup error the bare id stays (matches nothing new,
  // breaks nothing old).
  const slugs = [...new Set(rows.map(r => boxSlug(r.productId)).filter((s): s is string => Boolean(s)))]
  const itemIds = [...new Set(rows.filter(r => !boxSlug(r.productId)).map(r => r.productId))]
  const skusByProduct = new Map<string, string[]>()
  if (slugs.length) {
    try {
      const { getBoxProducts } = await import('./catalog-db')
      for (const b of await getBoxProducts()) {
        if (slugs.includes(b.slug)) skusByProduct.set(`box-${b.slug}`, b.variants.map(v => `box-${b.slug}--${v.key}`))
      }
    } catch { /* bare id fallback */ }
  }
  if (itemIds.length) {
    try {
      const { data: vr } = await supabaseAdmin.from('product_variants').select('product_id').in('product_id', itemIds)
      const counts = new Map<string, number>()
      for (const v of (vr ?? []) as Array<{ product_id: string }>) counts.set(v.product_id, (counts.get(v.product_id) ?? 0) + 1)
      for (const id of itemIds) {
        const n = counts.get(id) ?? 0
        skusByProduct.set(id, n > 1 ? Array.from({ length: n }, (_, i) => `${id}--${i + 1}`) : [id])
      }
    } catch { /* bare id fallback */ }
  }
  for (const row of rows) {
    const skus = skusByProduct.get(row.productId)
    if (skus?.length) row.skus = skus
  }

  return { rows, issues, total: all.length }
}

const cdata = (s: string) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function reviewFeedXml(rows: ReviewFeedRow[]): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
  // Schema 2.4. Element order follows the 2.4 XSD sequence. review_url is
  // type="group": the #reviews anchor shows ALL of a product's reviews
  // together (Google requires 'group' for shared review pages, 'singleton'
  // only for one-review-per-page URLs). is_incentivized_review is always
  // false BY CONSTRUCTION — incentivized rows are filtered out upstream.
  const items = rows.map(r => `
    <review>
      <review_id>${esc(r.id)}</review_id>
      <reviewer>
        <name${r.name ? '' : ' is_anonymous="true"'}>${r.name ? cdata(r.name) : 'Anonymous'}</name>
      </reviewer>
      <review_timestamp>${r.createdAt}</review_timestamp>
      <content>${cdata(r.body)}</content>
      <review_url type="group">${r.productUrl}#reviews</review_url>
      <ratings>
        <overall min="1" max="5">${r.rating}</overall>
      </ratings>
      <products>
        <product>
          <product_ids>
            <mpns><mpn>${esc(r.productId)}</mpn></mpns>
            <skus>${r.skus.map(s => `<sku>${esc(s)}</sku>`).join('')}</skus>
            <brands><brand>${cdata(FEED_BRAND)}</brand></brands>
          </product_ids>
          <product_url>${r.productUrl}</product_url>
        </product>
      </products>${r.verified ? `
      <is_verified_purchase>true</is_verified_purchase>` : ''}
      <is_incentivized_review>false</is_incentivized_review>
      <collection_method>${r.collectionMethod}</collection_method>${r.orderId ? `
      <transaction_id>${esc(r.orderId)}</transaction_id>` : ''}
    </review>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.4/product_reviews.xsd">
  <version>2.4</version>
  <publisher>
    <name>Petite Lavande</name>
    <favicon>${base}/favicon-32.png</favicon>
  </publisher>
  <reviews>${items}
  </reviews>
</feed>`
}
