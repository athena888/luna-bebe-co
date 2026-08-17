import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  // verified_buyer only exists after §45 (image_url after §54) — fall back to
  // the legacy shape so review display never breaks on an unmigrated DB.
  let { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, customer_name, rating, body, created_at, verified_buyer, image_url')
    .eq('product_id', productId)
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    const legacy = await supabaseAdmin
      .from('reviews')
      .select('id, customer_name, rating, body, created_at')
      .eq('product_id', productId)
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(20)
    data = legacy.data as typeof data
    error = legacy.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reviews: data })
}

export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, rating, body, review_token, locale } = await req.json()

    if (!product_id || !customer_name || !rating || !body) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }
    if (body.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }

    // Buyer identity comes ONLY from the signed token in the review-ask
    // email's link (Emily's call, 2026-07-27: no email field on the public
    // form). Verification re-checks a paid order exists — a token outlives a
    // refund, the reward shouldn't.
    const { verifyReviewToken } = await import('@/lib/review-token')
    const tokenData = typeof review_token === 'string' ? verifyReviewToken(review_token) : null
    const email = tokenData?.email ?? null

    const { isVerifiedBuyer, grantReviewReward, REVIEW_REWARD_ACTIVE } = await import('@/lib/review-rewards')
    const verified = email ? await isVerifiedBuyer(email) : false

    // Rich insert needs §45+§53; fall back to the legacy shape so a review is
    // never lost to an unmigrated DB. Provenance (§53) comes ONLY from the
    // signed token — a token means this arrived via the review-ask email.
    let insert = await supabaseAdmin.from('reviews').insert({
      product_id,
      customer_name: customer_name.trim(),
      rating,
      body: body.trim(),
      approved: false,
      reviewer_email: email,
      verified_buyer: verified,
      incentivized: false,
      order_id: tokenData?.orderId ?? null,
      collection_method: tokenData ? 'post_fulfillment' : 'unsolicited',
    }).select('id').maybeSingle()
    if (insert.error) {
      insert = await supabaseAdmin.from('reviews').insert({
        product_id,
        customer_name: customer_name.trim(),
        rating,
        body: body.trim(),
        approved: false,
        reviewer_email: email,
        verified_buyer: verified,
        incentivized: false,
      }).select('id').maybeSingle()
    }
    if (insert.error) {
      insert = await supabaseAdmin.from('reviews').insert({
        product_id,
        customer_name: customer_name.trim(),
        rating,
        body: body.trim(),
        approved: false,
      }).select('id').maybeSingle()
    }
    if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 })
    const reviewId = (insert.data as { id: string } | null)?.id ?? null

    // One-time 20% thank-you for verified buyers — any rating, fail-soft.
    let rewarded = false
    if (verified && email && REVIEW_REWARD_ACTIVE) {
      const code = await grantReviewReward({ email, reviewId, locale: locale === 'es' ? 'es' : 'en' })
      rewarded = !!code
      if (rewarded && reviewId) {
        // FTC/Google bookkeeping: this review is now incentivized → the
        // Google review feed skips it; the site shows it with its badge.
        await supabaseAdmin.from('reviews').update({ incentivized: true }).eq('id', reviewId)
      }
    }

    return NextResponse.json({ success: true, verified, rewarded })
  } catch (err) {
    console.error('Review POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
