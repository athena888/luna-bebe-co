import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { BOX_BASE_PRICE, SHIPPING } from '@/lib/products'
import type { Product, ShippingType } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const {
      selectedItems,
      letterContent,
      letterVersion,
      shippingType,
      shippingAddress,
      recipientName,
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

    const shippingOption = SHIPPING[shippingType]

    // Build line items for Stripe
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Petite Lavande Box Experience', description: 'Premium magnetic box, satin ribbon, wax seal, dried lavender, handwritten letter' },
          unit_amount: BOX_BASE_PRICE,
        },
        quantity: 1,
      },
      ...selectedItems.map((item) => {
        const v = item as Product & { selectedColor?: string; selectedSize?: string; selectedStyle?: string }
        const stylePart = v.selectedStyle ? ` · ${v.selectedStyle}` : ''
        const variantSuffix = v.selectedColor && v.selectedSize ? ` — ${v.selectedColor} · ${v.selectedSize}${stylePart}` : ''
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${item.name}${variantSuffix}`,
              description: item.description,
            },
            unit_amount: item.price,
          },
          quantity: 1,
        }
      }),
      {
        price_data: {
          currency: 'usd',
          product_data: { name: shippingOption.label, description: shippingOption.days },
          unit_amount: shippingOption.price,
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
        selected_items: selectedItems,
        letter_content: letterContent || null,
        letter_version: letterVersion || null,
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: shippingAddress.email,
      shipping_address_collection: { allowed_countries: ['US'] },
      allow_promotion_codes: !promoId,
      ...(promoId ? { discounts: [{ promotion_code: promoId }] } : {}),
      success_url: `${baseUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      metadata: {
        order_id: order.id,
        tracking_number: trackingNumber,
        recipient_name: recipientName || '',
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
