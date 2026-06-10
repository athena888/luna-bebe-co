'use server'

import { supabaseAdmin } from '@/lib/supabase'

export interface B2bLeadInput {
  email: string
  name?: string
  company?: string
  team_size?: string
  message?: string
}

// Capture a Corporate & Team Gifting lead. Validates the email and inserts via
// the service role. Duplicate emails are allowed (no unique constraint).
export async function submitB2bLead(input: B2bLeadInput): Promise<{ ok: true } | { error: string }> {
  const email = (input.email || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid work email.' }
  }
  try {
    const { error } = await supabaseAdmin.from('b2b_leads').insert({
      email,
      name: input.name?.trim() || null,
      company: input.company?.trim() || null,
      team_size: input.team_size?.trim() || null,
      message: input.message?.trim() || null,
    })
    if (error) {
      console.error('b2b lead insert error:', error)
      return { error: 'Something went wrong. Please try again.' }
    }
    return { ok: true }
  } catch (e) {
    console.error('b2b lead error:', e)
    return { error: 'Something went wrong. Please try again.' }
  }
}
