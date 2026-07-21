'use server'

import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { upsertContact, addTouch, createFlag } from '@/lib/outreach'
import { sendCorporateInquiryEmail, sendCorporateInquiryReceiptEmail } from '@/lib/resend'
import { rateLimit } from '@/lib/rate-limit'

export interface B2bLeadInput {
  email: string
  name?: string
  company?: string
  team_size?: string
  message?: string
  gifts_per_year?: string
  hp?: string            // honeypot — must stay empty
}

// Capture a Corporate & Team Gifting lead and wire it into the outreach tracker:
// upsert a contact (dedupe on email), log an inbound touch, raise a HOT flag, and
// email the team. Keeps the legacy b2b_leads insert for back-compat.
export async function submitB2bLead(input: B2bLeadInput): Promise<{ ok: true } | { error: string }> {
  // Honeypot — bots fill hidden fields. Pretend success, drop silently.
  if (input.hp && input.hp.trim()) return { ok: true }

  const email = (input.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid work email.' }
  }

  // Basic rate limit by IP (fails open if the rate_limits migration isn't applied).
  try {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    const ok = await rateLimit(`b2b_lead:${ip}`, 5, 3600)
    if (!ok) return { error: 'Too many submissions. Please try again later.' }
  } catch { /* ignore — don't block on rate-limit issues */ }

  const name = input.name?.trim() || undefined
  const company = input.company?.trim() || undefined
  const company_size = input.team_size?.trim() || undefined
  const needs = input.message?.trim() || undefined
  const gifts_per_year = input.gifts_per_year?.trim() || undefined

  try {
    // Legacy table (back-compat with existing reporting).
    await supabaseAdmin.from('b2b_leads').insert({
      email, name: name ?? null, company: company ?? null, team_size: company_size ?? null, message: needs ?? null,
    })

    // Outreach tracker — fail-soft so a CRM hiccup never loses the lead.
    try {
      const contactId = await upsertContact({
        email, name, company, source: 'corporate_form', track: 'A', status: 'replied',
        is_corporate: true, company_size, needs, gifts_per_year,
      })
      if (contactId) {
        await addTouch(contactId, { direction: 'inbound', channel: 'form', snippet: needs || 'Corporate inquiry (no message)' })
        await createFlag(contactId, { priority: 'hot', reason: 'Corporate inquiry — respond today' })
      }
    } catch (e) { console.error('b2b tracker wiring error:', e) }

    // Notify the team. Fail-soft.
    try {
      await sendCorporateInquiryEmail({ name, email, company, company_size, needs, gifts_per_year })
    } catch (e) { console.error('b2b notify email error:', e) }

    // Auto-acknowledge the submitter so they know we received it. Fail-soft.
    try {
      await sendCorporateInquiryReceiptEmail({ name, email })
    } catch (e) { console.error('b2b receipt email error:', e) }

    return { ok: true }
  } catch (e) {
    console.error('b2b lead error:', e)
    return { error: 'Something went wrong. Please try again.' }
  }
}
