import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { BOX_BASE_PRICE, SHIPPING, freeShippingApplies, sameDayEligible } from '@/lib/products'
import { resolveLocale, marketFor, LOCALE_COOKIE } from '@/lib/markets'
import { getProductPrices, BOX_BASE_BY_CURRENCY, SHIPPING_BY_CURRENCY } from '@/lib/pricing'
import type { Product, ShippingType } from '@/types'
import { storeCheckoutEnabled, STORE_CLOSED_MESSAGE } from '@/lib/store-flags'

export async function POST(req: NextRequest) {
  // Main store paused while inventory isn't ready (The First Year has its own checkout).
  if (!storeCheckoutEnabled()) {
    return NextResponse.json({ error: STORE_CLOSED_MESSAGE }, { status: 403 })
  }
  try {
    const {
      selectedItems,
      letterContent,
      letterVersion,
      cardStyle,
      letterZone,
      shippingType,
      shippingAddress,
      recipientName,
      specialNote,
      shipToRecipient,
      recipientEmail,
      occasionLabel,
      locale: uiLocale,
      totalAmount,
      promoId,
      preferredAssemblyImage,
      preferredAssemblyStyle,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
    }: {
      selectedItems: Product[]
      letterContent: string
      letterVersion?: 1 | 2
      cardStyle?: string
      letterZone?: { x: number; y: number; w: number; align: string }
      shippingType: ShippingType
      shippingAddress: {
        name: string
        email: string
        phone?: string
        line1: string
        line2?: string
        city: string
        state: string
        zip: string
      }
      recipientName: string
      specialNote?: string
      shipToRecipient?: boolean
      recipientEmail?: string
      occasionLabel?: string
      locale?: string
      totalAmount: number
      promoId?: string
      preferredAssemblyImage?: string
      preferredAssemblyStyle?: string
      utmSource?: string | null
      utmMedium?: string | null
      utmCampaign?: string | null
      utmContent?: string | null
    } = await req.json()

    if (!selectedItems || !shippingType || !shippingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Resolve the active market (domain → cookie → Accept-Language). Block
    // checkout for markets that aren't live yet.
    const locale = resolveLocale({
      host: req.headers.get('host'),
      cookie: req.cookies.get(LOCALE_COOKIE)?.value ?? null,
      acceptLanguage: req.headers.get('accept-language'),
    })
    const market = marketFor(locale)
    if (!market.enabled) {
      return NextResponse.json({ error: `Checkout isn't available in ${market.country} yet.` }, { status: 403 })
    }
    const currency = market.currency
    const stripeCurrency = currency.toLowerCase()

    if (shippingType === 'sameday' && !sameDayEligible(shippingAddress?.zip)) {
      return NextResponse.json({ error: 'Same-day courier is only available in the Seattle area.' }, { status: 400 })
    }
    const shippingOption = SHIPPING[shippingType]

    // Per-currency amounts. USD uses the existing static prices (identical to
    // before); other currencies require explicit product_prices rows.
    const boxBase = currency === 'USD' ? BOX_BASE_PRICE : BOX_BASE_BY_CURRENCY[currency]
    let shipAmount = currency === 'USD' ? shippingOption.price : SHIPPING_BY_CURRENCY[currency][shippingType]
    const priceMap = currency === 'USD' ? {} : await getProductPrices(selectedItems.map(i => i.id), currency)

    const itemLineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }> = []
    for (const item of selectedItems) {
      const v = item as Product & { selectedColor?: string; selectedSize?: string; selectedStyle?: string; qty?: number }
      const unit = currency === 'USD' ? item.price : priceMap[item.id]
      if (unit == null) {
        return NextResponse.json({ error: `"${item.name}" isn't available in ${market.country} yet.` }, { status: 409 })
      }
      const stylePart = v.selectedStyle ? ` · ${v.selectedStyle}` : ''
      const variantSuffix = v.selectedColor && v.selectedSize ? ` — ${v.selectedColor} · ${v.selectedSize}${stylePart}` : ''
      itemLineItems.push({
        price_data: { currency: stripeCurrency, product_data: { name: `${item.name}${variantSuffix}`, description: item.description }, unit_amount: unit },
        quantity: Math.max(1, Math.round(v.qty ?? 1)),
      })
    }

    // Honor the free-shipping bar the cart drawer shows: standard shipping is
    // free once box base + items reach FREE_SHIPPING_THRESHOLD (USD only).
    const merchandiseTotal = boxBase + itemLineItems.reduce((s, li) => s + li.price_data.unit_amount * li.quantity, 0)
    const shipFree = freeShippingApplies(merchandiseTotal, shippingType, currency)
    if (shipFree) shipAmount = 0

    // Build line items for Stripe
    const lineItems = [
      {
        price_data: {
          currency: stripeCurrency,
          product_data: { name: 'Keepsake Box, Ribbon & Printed Card', description: 'Premium magnetic box, satin ribbon, dried lavender, and your hand-penned card' },
          unit_amount: boxBase,
        },
        quantity: 1,
      },
      ...itemLineItems,
      {
        price_data: {
          currency: stripeCurrency,
          product_data: { name: shippingOption.label, description: shippingOption.days },
          unit_amount: shipAmount,
        },
        quantity: 1,
      },
    ]

    // Generate tracking number (UUID)
    const crypto = await import('crypto')
    const trackingNumber = crypto.randomUUID()

    // Save order to database first (pending)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: shippingAddress.name,
        customer_email: shippingAddress.email,
        customer_phone: shippingAddress.phone || null,
        recipient_name: recipientName || null,
        special_note: specialNote || null,
        ship_to_recipient: !!shipToRecipient,
        recipient_email: recipientEmail?.trim() || null,
        locale: uiLocale === 'es' ? 'es' : 'en',
        selected_items: selectedItems,
        letter_content: letterContent || null,
        letter_version: letterVersion || null,
        card_style: cardStyle || null,
        letter_zone: (letterContent && letterZone
          && ['left', 'center', 'right'].includes(letterZone.align)
          && [letterZone.x, letterZone.y, letterZone.w].every(n => typeof n === 'number' && n >= 0 && n <= 100))
          ? { x: letterZone.x, y: letterZone.y, w: letterZone.w, align: letterZone.align }
          : null,
        shipping_type: shippingType,
        shipping_address: shippingAddress,
        tracking_number: trackingNumber,
        total_amount: totalAmount,
        status: 'pending',
        preferred_assembly_image: preferredAssemblyImage || null,
        preferred_assembly_style: preferredAssemblyStyle || null,
        utm_source:   utmSource   || null,
        utm_medium:   utmMedium   || null,
        utm_campaign: utmCampaign || null,
        utm_content:  utmContent  || null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Build 10 capture — the gifter's stated occasion, tied to this order.
    // Best-effort; pending orders are filtered out downstream via the join.
    if (occasionLabel?.trim()) {
      try {
        await supabaseAdmin.from('gift_occasions').insert({
          email: shippingAddress.email.trim().toLowerCase(),
          recipient_label: occasionLabel.trim().slice(0, 120),
          source_order: order.id,
        })
      } catch (e) {
        console.warn('gift occasion capture skipped:', e)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // GA attribution: carry the visitor's GA client/session ids through Stripe
    // metadata so the server-side purchase event ties to the real session
    // instead of showing "(not set)" in GA. Cookie formats:
    //   _ga            = GA1.1.<client>.<client>      → client id = last two segments
    //   _ga_<STREAM>   = GS1.1.<session_id>.<n>. ...  → session id = third segment
    const gaCid = (req.cookies.get('_ga')?.value ?? '').split('.').slice(-2).join('.') || null
    const gaStream = (process.env.NEXT_PUBLIC_GA_ID || '').replace(/^G-/, '')
    const gaSid = (gaStream && req.cookies.get(`_ga_${gaStream}`)?.value || '').split('.')[2] || null

    // Create Stripe checkout session. Payment methods are automatic (Stripe
    // shows whatever's enabled in the dashboard for this currency/region —
    // card, plus Klarna/iDEAL/Bancontact etc. where applicable). Stripe Tax is
    // behind an env flag (enable only once VAT registrations exist).
    const taxEnabled = process.env.STRIPE_TAX_ENABLED === 'true'
    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      locale: market.stripeLocale,
      customer_email: shippingAddress.email,
      // Gift orders ship to the recipient's address collected on our checkout
      // page — asking Stripe for a shipping address again would prompt the
      // buyer for THEIR address and confuse the label.
      ...(shipToRecipient ? {} : { shipping_address_collection: { allowed_countries: market.shipCountries } }),
      allow_promotion_codes: !promoId,
      ...(promoId ? { discounts: [{ promotion_code: promoId }] } : {}),
      // Stripe Tax needs a customer address. Gift orders skip shipping-address
      // collection (recipient address is on our page), so when tax is on we
      // require the billing address to give the tax engine something to work
      // with — otherwise gift-order tax can't calculate.
      ...(taxEnabled
        ? { automatic_tax: { enabled: true }, billing_address_collection: 'required' as const }
        : {}),
      success_url: `${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        order_id: order.id,
        tracking_number: trackingNumber,
        recipient_name: recipientName || '',
        locale,
        currency,
        ...(gaCid ? { ga_cid: gaCid } : {}),
        ...(gaSid ? { ga_sid: gaSid } : {}),
      },
    })

    // Update order with Stripe session ID
    await supabaseAdmin
      .from('orders')
      .update({ stripe_payment_intent: session.id })
      .eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout session error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
