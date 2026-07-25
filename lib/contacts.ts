import { supabaseAdmin } from './supabase'

// Marketing contacts — OUR source of truth (§37). Captured only via checkout,
// newsletter signup, or landing pages. Lives in marketing_contacts — the plain
// `contacts` table belongs to the B2B outreach pipeline and predates this.
// Non-destructive upsert rules:
//   - opt-in is one-way here: we never flip marketing_opt_in true → false
//     (only the unsubscribe flow, via email_optouts, ends marketing sends)
//   - name fills in when missing, never overwrites
//   - source records the FIRST touch, segment upgrades from 'unknown' only
// Fail-soft: every caller treats a missing table (§37 not run) as a no-op.

export type ContactSegment = 'parent_to_be' | 'grandparent' | 'friend_coworker' | 'corporate' | 'unknown'

/** Segment lookup for send-time copy variants (Build 7). Fail-soft: any
 *  error or missing row reads as 'unknown', which sends the default copy. */
export async function segmentOf(email: string): Promise<ContactSegment> {
  try {
    const { data } = await supabaseAdmin
      .from('marketing_contacts').select('segment').eq('email', email.trim().toLowerCase()).maybeSingle()
    return (data?.segment as ContactSegment) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export async function upsertContact(input: {
  email: string
  name?: string | null
  source?: string
  segment?: ContactSegment
  zip?: string | null
  marketingOptIn?: boolean
}): Promise<void> {
  const email = input.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return

  try {
    const { data: existing } = await supabaseAdmin
      .from('marketing_contacts').select('id, name, segment, marketing_opt_in, zip').eq('email', email).maybeSingle()

    if (!existing) {
      await supabaseAdmin.from('marketing_contacts').insert({
        email,
        name: input.name?.trim() || null,
        segment: input.segment ?? 'unknown',
        zip: input.zip?.trim() || null,
        source: input.source ?? 'unknown',
        marketing_opt_in: !!input.marketingOptIn,
        opt_in_at: input.marketingOptIn ? new Date().toISOString() : null,
      })
      return
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (!existing.name && input.name?.trim()) patch.name = input.name.trim()
    if (!existing.zip && input.zip?.trim()) patch.zip = input.zip.trim()
    if (existing.segment === 'unknown' && input.segment && input.segment !== 'unknown') patch.segment = input.segment
    if (!existing.marketing_opt_in && input.marketingOptIn) {
      patch.marketing_opt_in = true
      patch.opt_in_at = new Date().toISOString()
    }
    if (Object.keys(patch).length > 1) {
      await supabaseAdmin.from('marketing_contacts').update(patch).eq('id', existing.id)
    }
  } catch (e) {
    console.warn('contacts upsert skipped (run §37?):', e instanceof Error ? e.message : e)
  }
}
