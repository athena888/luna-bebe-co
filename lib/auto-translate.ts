import { supabaseAdmin } from './supabase'

// Phase 7 — auto-translate portal content on save. English is the source of
// truth; machine output lands UNAPPROVED (status "auto"): live /es pages keep
// falling back to English until Emily's reviewer marks it reviewed
// (approved=true) in Portal → Spanish Review. Editing the English source
// re-generates and re-queues automatically.
//
// Change detection without schema changes: rows with locale='en' store the
// source snapshot each field was last translated from — same snapshot, no
// re-translation, approved ES rows stay approved.

const REGISTER = `Eres el traductor de Petite Lavande (canastillas de regalo orgánicas para bebé y mamá). Traduce al español de Estados Unidos: cálido, elegante, natural — nunca traducción literal. Reglas duras:
- Nada de saludos con género ("Bienvenida"); usa formas neutras.
- Sin coma antes de "y"/"o" al cerrar enumeraciones.
- Nunca "gentil" (usa suave/delicado). "con tu bebé", jamás "con él/ella".
- Verbos artesanales solo si son literalmente ciertos (tejida, trenzado).
- "canastilla" para gift box; "baby shower" queda en inglés; posparto (no cuarentena).
- Los nombres de marca, de productos y las frases en francés NO se traducen.
- No traduzcas slugs, SKUs ni referencias de archivos.
- Etiquetas de interfaz en tipo oración (sentence case).`

export async function autoTranslate(
  entityType: string,
  entityId: string,
  fields: Record<string, string | undefined | null>,
): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
  ) as Record<string, string>
  if (!Object.keys(clean).length) return

  try {
    // Skip fields whose EN source is unchanged since last translation.
    const { data: snaps } = await supabaseAdmin
      .from('translations').select('field, value')
      .eq('entity_type', entityType).eq('entity_id', entityId).eq('locale', 'en')
      .in('field', Object.keys(clean))
    const snapshot = new Map((snaps ?? []).map(s => [s.field as string, s.value as string]))
    const changed = Object.fromEntries(Object.entries(clean).filter(([f, v]) => snapshot.get(f) !== v))
    if (!Object.keys(changed).length) return

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2000,
        system: REGISTER,
        messages: [{
          role: 'user',
          content: `Traduce los valores de este JSON (las claves quedan igual). Responde SOLO el JSON traducido, sin comentarios:\n${JSON.stringify(changed)}`,
        }],
      }),
    })
    if (!res.ok) { console.warn('auto-translate API', res.status); return }
    const data = await res.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find(c => c.type === 'text')?.text ?? ''
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return
    const translated = JSON.parse(m[0]) as Record<string, string>

    const now = new Date().toISOString()
    for (const [field, value] of Object.entries(translated)) {
      if (typeof value !== 'string' || !value.trim()) continue
      // ES row lands (or reverts to) unapproved = status "auto"
      await supabaseAdmin.from('translations').upsert({
        entity_type: entityType, entity_id: entityId, locale: 'es', field,
        value: value.trim(), approved: false, updated_at: now,
      }, { onConflict: 'entity_type,entity_id,locale,field' })
      // EN snapshot records what this came from
      await supabaseAdmin.from('translations').upsert({
        entity_type: entityType, entity_id: entityId, locale: 'en', field,
        value: changed[field], approved: true, updated_at: now,
      }, { onConflict: 'entity_type,entity_id,locale,field' })
    }
  } catch (e) {
    console.warn('auto-translate skipped:', e instanceof Error ? e.message : e)
  }
}
