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
//  - collection_method is 'unsolicited' for all rows: the DB does not record
//    whether a review came from the post-shipment ask, and claiming
//    post_fulfillment without evidence would be fabrication.
//  - brand/mpn/product URLs come from lib/google-feed exports so the two
//    feeds cannot drift.

export interface ReviewFeedRow {
  id: string
  productId: string
  name: string
  rating: number
  body: string
  createdAt: string
}

export interface ReviewFeedIssue { id: string; problems: string[] }

export async function buildReviewFeed(): Promise<{ rows: ReviewFeedRow[]; issues: ReviewFeedIssue[]; total: number }> {
  const { data } = await supabaseAdmin
    .from('reviews')
    .select('id, product_id, customer_name, rating, body, approved, created_at')
    .eq('approved', true)
    .order('created_at', { ascending: true })
  const all = data ?? []
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
      name: r.customer_name?.trim() || '',
      rating: r.rating,
      body: r.body.trim(),
      createdAt: new Date(r.created_at).toISOString(),
    })
  }
  return { rows, issues, total: all.length }
}

const cdata = (s: string) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function reviewFeedXml(rows: ReviewFeedRow[]): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com').replace(/\/$/, '')
  const items = rows.map(r => `
    <review>
      <review_id>${esc(r.id)}</review_id>
      <reviewer>
        <name${r.name ? '' : ' is_anonymous="true"'}>${r.name ? cdata(r.name) : 'Anonymous'}</name>
      </reviewer>
      <review_timestamp>${r.createdAt}</review_timestamp>
      <content>${cdata(r.body)}</content>
      <review_url type="singleton">${productFeedUrl(r.productId)}#reviews</review_url>
      <ratings>
        <overall min="1" max="5">${r.rating}</overall>
      </ratings>
      <products>
        <product>
          <product_ids>
            <brands><brand>${cdata(FEED_BRAND)}</brand></brands>
            <mpns><mpn>${esc(r.productId)}</mpn></mpns>
          </product_ids>
          <product_url>${productFeedUrl(r.productId)}</product_url>
        </product>
      </products>
      <collection_method>unsolicited</collection_method>
    </review>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="http://www.google.com/shopping/reviews/schema/product/2.3/product_reviews.xsd">
  <version>2.3</version>
  <publisher>
    <name>Petite Lavande</name>
    <favicon>${base}/favicon-32.png</favicon>
  </publisher>
  <reviews>${items}
  </reviews>
</feed>`
}
