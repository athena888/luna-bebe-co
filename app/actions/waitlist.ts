'use server'

import { supabaseAdmin } from '@/lib/supabase'

// Capture a market-waitlist signup (disabled-market visitors). Dedupes on
// (email, region) via upsert. Doubles as a per-region demand counter.
export async function joinWaitlist(email: string, region: string): Promise<{ ok: true } | { error: string }> {
  const e = (email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { error: 'Please enter a valid email.' }
  try {
    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert({ email: e, region: region || null }, { onConflict: 'email,region' })
    if (error) { console.error('waitlist error:', error); return { error: 'Something went wrong. Please try again.' } }
    return { ok: true }
  } catch (err) {
    console.error('waitlist error:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}
