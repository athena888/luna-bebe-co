import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Manual review entry (Portal → Reviews). For genuine customer feedback Emily
// received off-site (email, DMs, thank-you notes) — entered under the real
// customer's words. Provenance is stored as 'manual' so the Google feed can
// report it honestly ('unsolicited' in Google's vocabulary — a merchant-
// collected review that didn't come through the post-purchase ask).
// verified_buyer is never set here: verification requires the signed token +
// paid-order re-check and is not hand-assertable.
// Edit a review's date (Emily 2026-08-16) — for correcting when off-site
// feedback was actually received (manual entries default to "today"). Never a
// future date. The date orders the on-page list and is reported in JSON-LD +
// the Google review feed, so it must reflect when the review was really given.
// Also attaches (or clears) a review photo — image_url '' removes it.
export async function PATCH(req: NextRequest) {
  try {
    const { id, date, image_url } = await req.json()
    if (!id || (!date && image_url === undefined)) {
      return NextResponse.json({ error: 'id and date or image_url are required' }, { status: 400 })
    }
    const patch: Record<string, unknown> = {}
    if (date) {
      const d = new Date(date)
      if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Date must be valid and not in the future' }, { status: 400 })
      }
      patch.created_at = d.toISOString()
    }
    if (image_url !== undefined) patch.image_url = image_url || null
    const { error } = await supabaseAdmin.from('reviews').update(patch).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Portal review PATCH error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, rating, body, date, image_url } = await req.json()

    if (!product_id || !customer_name?.trim() || !rating || !body?.trim()) {
      return NextResponse.json({ error: 'Product, name, rating and text are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }
    if (body.trim().length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }
    // Optional received-on date (when the feedback actually arrived) — never
    // in the future.
    let createdAt: string | null = null
    if (date) {
      const d = new Date(date)
      if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Date must be valid and not in the future' }, { status: 400 })
      }
      createdAt = d.toISOString()
    }

    const base = {
      product_id,
      customer_name: customer_name.trim(),
      rating,
      body: body.trim(),
      approved: true,   // entering it in the portal IS the moderation step
      ...(createdAt ? { created_at: createdAt } : {}),
    }
    // Rich insert needs §45+§53+§54; fall back so entry works on an unmigrated
    // DB (the photo is dropped in that case — the review itself still lands).
    let insert = await supabaseAdmin.from('reviews')
      .insert({
        ...base, verified_buyer: false, incentivized: false, collection_method: 'manual',
        ...(image_url ? { image_url } : {}),
      })
      .select('id').maybeSingle()
    if (insert.error) {
      insert = await supabaseAdmin.from('reviews').insert(base).select('id').maybeSingle()
    }
    if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 })

    return NextResponse.json({ success: true, id: (insert.data as { id: string } | null)?.id ?? null })
  } catch (err) {
    console.error('Portal review POST error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
