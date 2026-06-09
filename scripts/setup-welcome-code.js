#!/usr/bin/env node
/**
 * Create the WELCOME10 promotion code in Stripe (10% off, first order only).
 *
 * Run: node scripts/setup-welcome-code.js
 *
 * Requirements:
 * - .env.local with STRIPE_SECRET_KEY (a LIVE key creates a live code; a test
 *   key creates a test-mode code — run it once per mode you use)
 *
 * Safe to re-run: if a promotion code named WELCOME10 already exists it does
 * nothing. The matching validate-code API looks codes up live, so once this
 * has run the code works at checkout immediately.
 */

const Stripe = require('stripe')
require('dotenv').config({ path: '.env.local' })

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local')
  process.exit(1)
}

const stripe = new Stripe(key)
const CODE = 'WELCOME10'

async function main() {
  const mode = key.startsWith('sk_live') ? 'LIVE' : 'TEST'
  console.log(`Stripe mode: ${mode}`)

  // Already there? Then we're done.
  const existing = await stripe.promotionCodes.list({ code: CODE, limit: 1 })
  if (existing.data[0]) {
    console.log(`✓ Promotion code "${CODE}" already exists (${existing.data[0].id}). Nothing to do.`)
    return
  }

  // Coupon: 10% off, applied once per customer.
  const coupon = await stripe.coupons.create({
    name: 'Welcome — 10% off first order',
    percent_off: 10,
    duration: 'once',
  })
  console.log(`Created coupon ${coupon.id}`)

  // Promotion code: the human-typed string, limited to a customer's first order.
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: CODE,
    restrictions: { first_time_transaction: true },
  })
  console.log(`✓ Created promotion code "${CODE}" (${promo.id}) — 10% off, first order only.`)
}

main().catch(err => {
  console.error('Setup failed:', err.message || err)
  process.exit(1)
})
