import { supabaseAdmin } from './supabase'
import { TEMPLATES, type OutreachTemplate } from './outreach-templates'

// Owner-editable cold-email templates. Overrides live in one site_content row
// (key 'outreach.templates' → { [templateKey]: { subject, body } }) and merge
// over the in-code defaults, so the templates always render even before any edit.
// Server-only (imports supabaseAdmin) — kept out of outreach-templates.ts so that
// the pure render helpers stay importable anywhere.

const KEY = 'outreach.templates'
interface Override { subject?: string; body?: string }

export async function getOutreachTemplates(): Promise<OutreachTemplate[]> {
  try {
    const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', KEY).maybeSingle()
    const ov = (data?.value as Record<string, Override> | undefined) ?? {}
    return TEMPLATES.map(t => ({
      ...t,
      subject: ov[t.key]?.subject?.trim() || t.subject,
      body: ov[t.key]?.body?.trim() || t.body,
    }))
  } catch {
    return TEMPLATES
  }
}

export async function saveOutreachTemplate(key: string, patch: Override): Promise<void> {
  if (!TEMPLATES.some(t => t.key === key)) throw new Error('Unknown template')
  const { data } = await supabaseAdmin.from('site_content').select('value').eq('key', KEY).maybeSingle()
  const ov = (data?.value as Record<string, Override> | undefined) ?? {}
  ov[key] = { subject: patch.subject?.trim() || undefined, body: patch.body?.trim() || undefined }
  await supabaseAdmin.from('site_content')
    .upsert({ key: KEY, value: ov, updated_at: new Date().toISOString() }, { onConflict: 'key' })
}
