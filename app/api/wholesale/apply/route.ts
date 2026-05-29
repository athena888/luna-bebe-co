import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      businessName, businessType, ein,
      contactName, contactEmail, contactPhone, website,
      expectedVolume, storefrontStreet, storefrontCity, storefrontState, storefrontZip,
      resaleCertUrl, notes,
    } = body

    if (!businessName || !contactName || !contactEmail) {
      return NextResponse.json({ error: 'Business name, contact name, and email are required' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('wholesale_accounts')
      .select('id')
      .ilike('contact_email', contactEmail)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'An application with this email already exists.' }, { status: 409 })

    const { error } = await supabaseAdmin.from('wholesale_accounts').insert({
      business_name: businessName,
      business_type: businessType || null,
      ein: ein || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      website: website || null,
      expected_monthly_volume: expectedVolume ? Math.round(Number(expectedVolume) * 100) : null,
      storefront_address: (storefrontStreet || storefrontCity) ? {
        line1: storefrontStreet || '', city: storefrontCity || '', state: storefrontState || '', zip: storefrontZip || '',
      } : null,
      resale_cert_url: resaleCertUrl || null,
      notes: notes || null,
      status: 'pending',
    })

    if (error) {
      console.error('Wholesale apply error:', error)
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Wholesale apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
