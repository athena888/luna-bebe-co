import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Manual review entry (Portal → Reviews). For genuine customer feedback Emily
// received off-site (email, DMs, thank-you notes) — entered under the real
// customer's words. Provenance is stored as 'manual' so the Google feed can
// report it honestly ('unsolicited' in Google's vocabulary — a merchant-
// collected review that didn't come through the post-purchase ask).
// verified_buyer is never set here: verification requires the signed token +
// paid-order re-check and is not hand-assertable.
export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, rating, body, date } = await req.json()

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
    // Rich insert needs §45+§53; fall back so entry works on an unmigrated DB.
    let insert = await supabaseAdmin.from('reviews')
      .insert({ ...base, verified_buyer: false, incentivized: false, collection_method: 'manual' })
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
